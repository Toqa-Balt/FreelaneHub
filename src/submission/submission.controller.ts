import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { SubmissionService } from './submission.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/guards.roles.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';
import { UploadFile } from '../common/decoraters/upload_file.decorater.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { RejectSubmissionDto } from './dto/rejectSubmission.dto.js';

@Controller('submission')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Roles(enumRoles.FREELANCER)
  @UploadFile({
    fieldName: 'submissionFile',
    folder: 'private/submissions',
    allowedTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'application/vnd.rar',
      'application/x-rar-compressed',
    ],
    maxSizeMB: 50,
  })
  @Post('project/:id')
  submitFile(
    @Param('id', ParseIntPipe) projectId: number,
    @UploadedFile() submissionFile: Express.Multer.File,
    @CurrentUser('id') freelancerId: number,
  ) {
    if (!submissionFile) {
      throw new BadRequestException('Submission file is required');
    }

    const filePath = `uploads/private/submissions/${submissionFile.filename}`;

    return this.submissionService.submitFile(
      projectId,
      filePath,
      submissionFile.mimetype,
      freelancerId,
    );
  }

  @Roles(enumRoles.FREELANCER, enumRoles.CLIENT, enumRoles.ADMIN)
  @Get('project/:projectId')
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.submissionService.findAllByProject(projectId, userId, role);
  }

  @Roles(enumRoles.FREELANCER, enumRoles.CLIENT, enumRoles.ADMIN)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.submissionService.findOne(id, userId, role);
  }

  @Roles(enumRoles.FREELANCER, enumRoles.CLIENT, enumRoles.ADMIN)
  @Get(':id/file')
  getSubmissionFile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string
  ) {
    return this.submissionService.getSubmissionFile(
      id,
      userId,
      role
    );
  }

  @Roles(enumRoles.CLIENT, enumRoles.ADMIN)
  @Patch(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') reviewerId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.submissionService.approve(id, reviewerId, role);
  }

  @Roles(enumRoles.CLIENT, enumRoles.ADMIN)
  @Patch(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body : RejectSubmissionDto,
    @CurrentUser('id') reviewerId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.submissionService.reject(id, body.rejectionReason, reviewerId, role);
  }
}