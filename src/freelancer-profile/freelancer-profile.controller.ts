import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FreelancerProfileService } from './freelancer-profile.service.js';
import { CreateProfileDto } from './dto/create-freelancer-profile.dto.js';
import { UpdateProfileDto } from './dto/update-freelancer-profile.dto.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { UploadFile } from '../common/decoraters/upload_file.decorater.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/guards.roles.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('freelancer-profile')
export class FreelancerProfileController {
  constructor(private readonly freelancerProfileService: FreelancerProfileService) { }

  @UploadFile({
    fieldName: 'avatar',
    folder: 'public/freelancerProfile',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jfif'],
    maxSizeMB: 2
  })
  @Roles(enumRoles.FREELANCER)
  @Patch('complete-profile')
  complete(@Body() body: CreateProfileDto,
    @CurrentUser('id') id: number,
    @UploadedFile() avatar?: Express.Multer.File) {

    const avatarUrl = avatar ? `/uploads/public/freelancerProfile/${avatar.filename}` : undefined;
    
    return this.freelancerProfileService.completeProfile(body, id, avatarUrl);

  }

  @Get()
  findAll() {
    return this.freelancerProfileService.findAll();
  }
  @Roles(enumRoles.FREELANCER)
  @Get('me')
  myProfile(@CurrentUser('id') id: number) {
    return this.freelancerProfileService.findMe(+id);
  }
  @Roles(enumRoles.CLIENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.freelancerProfileService.findOne(+id);
  }
  @Roles(enumRoles.FREELANCER)
  @UploadFile({
    fieldName: 'avatar',
    folder: 'public/freelancerProfile',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jfif'],
    maxSizeMB: 2
  })
  @Patch()
  update(@CurrentUser('id') id: number,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File) {
    const avatarUrl = avatar ? `/uploads/public/freelancerProfile/${avatar.filename}` : undefined;

    return this.freelancerProfileService.update(id, updateProfileDto, avatarUrl);
  }

}
