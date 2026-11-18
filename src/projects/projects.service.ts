import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FilterProjectDto } from './dto/filter-project.dto.js';
import { ProjectStatus } from '../common/enums/projectStatus.enum.js';
import * as fs from 'fs'
import * as path from 'path';
import { enumRoles } from '../common/enums/enumRoles.js';
import { offerStatus } from '../common/enums/offerStatus.js';
import { TransactionType } from '../common/enums/transactionType.js';
import { ReferenceType } from '../common/enums/refrenceType.js';
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) { }
  async create(createProjectDto: CreateProjectDto, userId: number, attachmentPath?: string) {
    if (createProjectDto.budgetMin > createProjectDto.budgetMax) {
      throw new BadRequestException('budgetMin must be less than budgetMax');
    }

    return await this.prisma.project.create({
      omit: { attachmentPath: true },
      data: {
        ...createProjectDto,
        clientId: userId,
        attachmentPath: attachmentPath
      }
    })

  }

  async findAll(q: FilterProjectDto) {
    const skip = (q.page - 1) * q.limit;
    const where: any = {
      status: ProjectStatus.OPEN
    }

    if (q.categoryId) {
      where.categoryId = q.categoryId;
    }
    if (q.search) {
      where.title = {
        contains: q.search,
        mode: 'insensitive'
      }
    }
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        omit: {
          attachmentPath: true
        },
        skip,
        take: q.limit,
        orderBy: { [q.sortBy]: q.sortOrder },
        include: {
          client: { select: { name: true } },
          category: { select: { id: true, name: true } }
        }

      }),
      this.prisma.project.count({ where })
    ])
    const totalPages = Math.ceil(total / q.limit);

    return {
      items,
      total,
      totalPages
    }


  }

  async myProjects(clientId: number) {
    return this.prisma.project.findMany({
      where: {
        clientId
      },
      omit: { attachmentPath: true },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      omit: { attachmentPath: true },
      include: {
        category: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async getProjectAttachment(
    projectId: number,
    userId: number,
    role: string,
  ): Promise<StreamableFile> {

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.attachmentPath) {
      throw new NotFoundException('This project does not have an attachment');
    }

    if (
      role !== enumRoles.ADMIN &&
      project.clientId !== userId &&
      role !== enumRoles.FREELANCER
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this project attachment',
      );
    }

    if (!fs.existsSync(project.attachmentPath)) {
      throw new NotFoundException(`This project does not have an attachment`);
    }

    const file = fs.createReadStream(project.attachmentPath);

    return new StreamableFile(file, {
      type: 'application/pdf',
      disposition: 'attachment'
    })






  }

  async update(id: number, updateProjectDto: UpdateProjectDto, userId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.clientId !== userId) {
      throw new ForbiddenException('This project is not yours');
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new ConflictException('You can only update an open project');
    }

    return this.prisma.project.update({
      where: { id },
      omit: { attachmentPath: true },
      data: updateProjectDto,
    });
  }

  async addAttachment(id: number, clientId: number, attachmentPath: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.clientId !== clientId) {
      throw new ForbiddenException('This project is not yours');
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new ConflictException('You can only update an open project');
    }
    const oldPath = project.attachmentPath;

    const updated = await this.prisma.project.update({
      where: { id },
      omit: { attachmentPath: true },
      data: { attachmentPath },
    });

    if (oldPath) {
      const cleanRelativePath = oldPath.startsWith('/') ? oldPath.slice(1) : oldPath;

      const fullPath = path.join(process.cwd(), cleanRelativePath);

      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error(`Failed to delete old attachment at ${fullPath}:`, err);
        }
      }
    }

    return {
      message: 'added Successfully'
    }

  }

  async remove(id: number, userId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.clientId !== userId) {
      throw new ForbiddenException('This project is not yours');
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new ConflictException('You can only delete an opened project');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return {
      "message": "deleted successfully"
    }
  }

  async cancelProject(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        offers: {
          where: { status: offerStatus.ACCEPTED },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const acceptedOffer = project.offers[0];
    if (!acceptedOffer) {
      throw new BadRequestException(
        'No accepted offer found for this in-progress project',
      );
    }

    const lockedAmount = acceptedOffer.amount;

    return this.prisma.$transaction(async (tx) => {

      if (project.status !== ProjectStatus.IN_PROGRESS) {
        throw new BadRequestException(
          'Only projects currently in progress can be cancelled by an admin',
        );
      }


      const clientWallet = await tx.wallet.update({
        where: { userId: project.clientId },
        data: {
          lockedBalance: { decrement: lockedAmount },
          balance: { increment: lockedAmount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: clientWallet.id,
          amount: lockedAmount,
          type: TransactionType.REFUND,
          referenceType: ReferenceType.PROJECT,
          referenceId: project.id,
        },
      });

      await tx.offer.update({
        where: { id: acceptedOffer.id },
        data: { status: offerStatus.CANCELLED },
      });

      return tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.CANCELLED },
      });
    });
  }


}
