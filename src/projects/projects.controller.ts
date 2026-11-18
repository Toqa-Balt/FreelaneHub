import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, Query, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { UploadFile } from '../common/decoraters/upload_file.decorater.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { FilterProjectDto } from './dto/filter-project.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/guards.roles.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.CLIENT)
  @UploadFile({
    fieldName: 'attachment',
    folder: 'private/projects',
    allowedTypes: ['application/pdf'],
    maxSizeMB: 5
  })
  @Post()
  create(
    @Body() body: CreateProjectDto,
    @CurrentUser('id') id: number,
    @UploadedFile() attachment?: Express.Multer.File
  ) {
    const attachmentPath = attachment ? `uploads/private/projects/${attachment.filename}` : undefined;
    return this.projectsService.create(body, id, attachmentPath);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.CLIENT)
  @Get('my-projects')
  MyProjects(@CurrentUser('id') clientId: number) {
    return this.projectsService.myProjects(clientId);
  }

  @Get()
  findAll(@Query() query: FilterProjectDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.projectsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.CLIENT, enumRoles.FREELANCER, enumRoles.ADMIN)
  @Get(':id/attachment')
  getProjectAttachment(
    @Param('id', ParseIntPipe) projectId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.projectsService.getProjectAttachment(projectId, userId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.CLIENT)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser('id') clientId: number
  ) {
    return this.projectsService.update(+id, updateProjectDto, clientId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.CLIENT)
  @UploadFile({
    fieldName: 'attachment',
    folder: 'private/projects',
    allowedTypes: ['application/pdf'],
    maxSizeMB: 5,
  })
  @Patch(':id/attachment')
  uploadAttachment(
    @Param('id', ParseIntPipe) id: string,
    @CurrentUser('id') clientId: number,
    @UploadedFile() attachment: Express.Multer.File,
  ) {
    if (!attachment) {
      throw new BadRequestException('Attachment file is required');
    }

    const attachmentPath = `uploads/private/projects/${attachment.filename}`;
    return this.projectsService.addAttachment(+id, clientId, attachmentPath);
  }





  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.CLIENT)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') clientId: number
  ) {
    return this.projectsService.remove(+id, clientId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.ADMIN)
  @Patch(':id/cancel')
  cancelProject(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.cancelProject(id);
  }



}