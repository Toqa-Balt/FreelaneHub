import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { UpdateProfileDto } from './dto/update-freelancer-profile.dto.js';
import { CreateProfileDto } from './dto/create-freelancer-profile.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { enumRoles } from '../common/enums/enumRoles.js';


import * as fs from 'fs'
import { Prisma } from '../generated/prisma/client.js';
@Injectable()
export class FreelancerProfileService {
  constructor(private readonly prisma: PrismaService) { }

  async create(d: CreateProfileDto,
    userId: number,
    avatarUrl: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        omit: { password: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID #${userId} not found`);
      }

      return await this.prisma.freelancerProfile.create({
        data: {
          ...d,
          userId,
          avatarUrl
        }

      })
    }catch (e) {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === 'P2002'
  ) {
    throw new ConflictException('you already have a damn profile');
  }

  throw e;
}
     
  }

  async findAll() {
    return this.prisma.freelancerProfile.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findOne(id: number) {

    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Freelancer profile with ID ${id} not found`);
    }

    return profile;
  }

  async findMe(id: number) {

    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Freelancer profile with ID ${id} not found`);
    }

    return profile;
  }

  async update(userId: number, updateProfileDto: UpdateProfileDto, avatarUrl?: string) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId }
    })

    const oldUrl = profile?.avatarUrl;

    const data = {
      ...updateProfileDto,
      avatarUrl: avatarUrl ? avatarUrl : undefined
    }
    const updated = await this.prisma.freelancerProfile.update({
      where: { userId },
      data
    })
     if(oldUrl)
     fs.unlinkSync(oldUrl) ;


    return updated;
  }


}
