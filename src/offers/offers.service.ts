import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectStatus } from '../common/enums/projectStatus.enum.js';
import { offerStatus } from '../common/enums/offerStatus.js';
import { Prisma } from '../generated/prisma/client.js';
import { TransactionType } from '../common/enums/transactionType.js';
import { ReferenceType } from '../common/enums/refrenceType.js';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(projectId: number, freelancerId: number, d: CreateOfferDto) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      if (project.status !== ProjectStatus.OPEN) {
        throw new ConflictException('You can only make offers on open projects');
      }


      return await this.prisma.offer.create({
        data: {
          ...d,
          freelancerId,
          projectId
        }
      })

    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('you already made an offer on this ');
      }

      throw e;

    }

  }

  async acceptOffer(id: number, clientId: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!offer) {
      throw new NotFoundException(`offer with ID ${id} not found`);
    }

    if (offer.project.clientId !== clientId) {
      throw new ForbiddenException('This offer is not yours');
    }

    if (offer.project.status !== ProjectStatus.OPEN) {
      throw new ConflictException('this project is not opend !')
    }

    if(offer.status !== offerStatus.PENDING){
      throw new ConflictException('this offer is no longer pending')

    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: clientId }
    })

    if (!wallet || wallet.balance.lt(offer.amount)) {
      throw new BadRequestException('Insufficient wallet balance');

    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.offer.update({
        where: { id },
        data: { status: offerStatus.ACCEPTED },
      });

      await tx.offer.updateMany({
        where: {
          projectId: offer.projectId,
          id: { not: id } ,
          status : offerStatus.PENDING 
        },
        data: { status: offerStatus.REJECTED },
      });

      await tx.project.update({
        where: { id: offer.projectId },
        data: { status: ProjectStatus.IN_PROGRESS,
          selectedFreelancerId : offer.freelancerId
         },
      });

      const newWallet = await tx.wallet.update({
        where: { userId: clientId },
        data: {
          balance: { decrement: offer.amount },
          lockedBalance: { increment: offer.amount } , 
          transactions : {
            create : {
              amount : offer.amount , 
              type : TransactionType.ESCROW_LOCK ,
              description : `Escrow locked for project: ${offer.project.title}`,
              referenceType : ReferenceType.OFFER ,
              referenceId : offer.id
            }
          }
        }

      })

      return {
        updated,
        CurrentBalance: newWallet.balance
      }

    });

  }

  async getMyOffers(freelancerId: number) {
    return await this.prisma.offer.findMany({
      where: { freelancerId ,
        status : {not : offerStatus.CANCELLED}
      },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            title: true,
            status: true,
          },
        },
      },
    });
  }

  async getOffersOnProject(projectId: number, clientId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.clientId !== clientId) {
      throw new ConflictException('This project is not yours');
    }

    return await this.prisma.offer.findMany({
      where: { projectId ,
        status : {not : offerStatus.CANCELLED}
      },
      orderBy: { createdAt: 'desc' },
    });

  }

  async findOne(id: number, userId: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            title: true,
            clientId: true,
            status: true,
          },
        },
        freelancer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!offer || offer.status === offerStatus.CANCELLED) {
      throw new NotFoundException(`Offer with ID ${id} not found`);
    }

    if (offer.freelancerId != userId && offer.project.clientId != userId) {
      throw new ConflictException("you can't view this offer");
    }

    return offer;
  }

  async update(id: number, freelancerId: number, updateOfferDto: UpdateOfferDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
    });

    if (!offer || offer.status === offerStatus.CANCELLED) {
      throw new NotFoundException(`offer with ID ${id} not found`);
    }

    if (offer.freelancerId !== freelancerId) {
      throw new ConflictException('This offer is not yours');
    }
    if (offer.status != 'PENDING') {
      throw new ConflictException('you cannot update an/a ${offer.status}ED offer')

    }

    return this.prisma.offer.update({
      where: { id },
      data: updateOfferDto,
    });
  }

  async remove(id: number, freelancerId: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
    });

    if (!offer || offer.status === offerStatus.CANCELLED) {
      throw new NotFoundException(`offer with ID ${id} not found`);
    }

    if (offer.freelancerId !== freelancerId) {
      throw new ConflictException('This offer is not yours');
    }

    if (offer.status != offerStatus.PENDING) {
      throw new ConflictException(`you cannot cancel an/a ${offer.status}ED offer`);

    }

    await this.prisma.offer.update({
      where: { id },
      data: {
        status: offerStatus.CANCELLED
      },
    });
    return {
      "message": "Deleted successfully"
    }

  }
}
