import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectStatus } from '../generated/prisma/enums.js';
import { SubmissionStatus } from '../common/enums/submissionStatus.enum.js';
import { enumRoles } from '../common/enums/enumRoles.js';
import { createReadStream, existsSync } from 'fs';
import { offerStatus } from '../common/enums/offerStatus.js';
import { TransactionType } from '../common/enums/transactionType.js';
import { ReferenceType } from '../common/enums/refrenceType.js';
import { WalletType } from '../common/enums/walletType.js';



@Injectable()
export class SubmissionService {
  constructor(private readonly prisma: PrismaService) { }
  async submitFile(
    projectId: number,
    filePath: string,
    mimeType: string,
    freelancerId: number,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.selectedFreelancerId !== freelancerId) {
      throw new ForbiddenException(
        'You are not the selected freelancer on this project',
      );
    }

    if (project.status !== ProjectStatus.IN_PROGRESS) {
      throw new ConflictException(
        'You can only submit files for projects in progress',
      );
    }

    const pendingSubmission = await this.prisma.submission.findFirst({
      where: {
        projectId,
        status: SubmissionStatus.PENDING,
      },
    });

    if (pendingSubmission) {
      throw new ConflictException(
        'There is already a pending submission awaiting client review',
      );
    }

    return this.prisma.submission.create({
      data: {
        filePath,
        mimeType,
        projectId,
      },
      omit: {
        filePath: true,
        rejectionReason : true ,
        
      },
    });
  }

  async findAllByProject(projectId: number, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (
      role !== enumRoles.ADMIN &&
      project.clientId !== userId &&
      project.selectedFreelancerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view submissions for this project',
      );
    }

    return this.prisma.submission.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      omit: {
        filePath: true,
      },
      include: {
        reviewedBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(id: number, userId: number, role: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      omit: {
        filePath: true,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            clientId: true,
            selectedFreelancerId: true,
          },
        },
        reviewedBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    if (
      role !== enumRoles.ADMIN &&
      submission.project.clientId !== userId &&
      submission.project.selectedFreelancerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this submission',
      );
    }

    return submission;
  }

  async getSubmissionFile(
    id: number,
    userId: number,
    role: string
  ): Promise<StreamableFile> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            clientId: true,
            selectedFreelancerId: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    if (
      role !== enumRoles.ADMIN &&
      submission.project.clientId !== userId &&
      submission.project.selectedFreelancerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this submission',
      );
    }

    if (!existsSync(submission.filePath)) {
      throw new NotFoundException(`SubmissionFile with ID ${id} not found`);
    }

    const file = createReadStream(submission.filePath);

    return new StreamableFile(file, {
      type: submission.mimeType,
      disposition: 'attachment'
    })



  }

  async approve(id: number, reviewerId: number, role: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            offers: {
              where: {
                status: offerStatus.ACCEPTED
              }
            }
          }
        }
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    const project = submission.project;

    if (role !== enumRoles.ADMIN && project.clientId !== reviewerId) {
      throw new ForbiddenException(
        'Only the project client or an admin can approve this submission',
      );
    }

    if (project.status !== ProjectStatus.IN_PROGRESS) {
      throw new ConflictException('Project is not in progress');
    }



    const acceptedOffer = project.offers[0];

    if (!acceptedOffer) {
      throw new BadRequestException(
        'Accepted offer not found for this project',
      );
    }

    const totalAmount = Number(acceptedOffer.amount);
    const freelancerShare = Number((totalAmount * 0.9).toFixed(2));
    const platformFee = Number((totalAmount - freelancerShare).toFixed(2));

    return await this.prisma.$transaction(async (tx) => {

      if (submission.status !== SubmissionStatus.PENDING) {
        throw new ConflictException('This submission has already been reviewed');
      }

      //1 unlock balance in client wallet
      const newWallet = await tx.wallet.update({
        where: { userId: project.clientId },
        data: {
          lockedBalance: { decrement: totalAmount },
          transactions: {
            create: {
              amount: totalAmount,
              type: TransactionType.ESCROW_RELEASE,
              description: `Escrow Released for project : ${project.title}`,
              referenceType: ReferenceType.PROJECT,
              referenceId: project.id
            }
          }
        }
      })

      //2 freelancer wallett
      await tx.wallet.update({
        where: { userId: acceptedOffer.freelancerId },
        data: {
          balance: { increment: freelancerShare },
          transactions: {
            create: {
              amount: freelancerShare,
              type: TransactionType.ESCROW_RELEASE,
              description: `Escrow Released for project: ${project.title}`,
              referenceType: ReferenceType.PROJECT,
              referenceId: project.id
            }
          }
        }
      })

      //3 platform Wallet
      await tx.wallet.update({
        where: { type: WalletType.PLATFORM },
        data: {
          balance: { increment: platformFee },
          transactions: {
            create: {
              amount: platformFee,
              type: TransactionType.PLATFORM_COMMISSION,
              description: `Comission taken for : ${project.title}`,
              referenceType: ReferenceType.PROJECT,
              referenceId: project.id
            }
          }
        }
      })



      await tx.submission.update({
        where: { id },
        data: {
          status: SubmissionStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });



      await tx.project.update({
        where: { id: project.id },
        data: {
          status: ProjectStatus.COMPLETED
        }
      });


      if (role != enumRoles.ADMIN) {
        return {
          CurrentBalance: newWallet.balance,
          LockedBalance: newWallet.lockedBalance,
          message: 'approved successfully'
        }

      }
      else {
        return { message: 'approved successfully' }
      }

    });
  }

  async reject(
    id: number,
    rejectionReason: string,
    reviewerId: number,
    role: string,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    if (
      role !== enumRoles.ADMIN &&
      submission.project.clientId !== reviewerId
    ) {
      throw new ForbiddenException(
        'Only the project client or an admin can reject this submission',
      );
    }

    if (submission.project.status !== ProjectStatus.IN_PROGRESS) {
      throw new ConflictException('Project is not in progress');
    }

    if (submission.status !== SubmissionStatus.PENDING) {
      throw new ConflictException('This submission has already been reviewed');
    }

    return this.prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.REJECTED,
        rejectionReason,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      omit: {
        filePath: true,
      },
    });
  }



}
