import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { enumRoles } from '../common/enums/enumRoles.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService
  ) { }

  async createUser(d: CreateUserDto, role: enumRoles) {
    let user : any ;
    if (role == enumRoles.CLIENT) {
      user = await this.prisma.user.create({
        data: {
          ...d,
          wallet: {
            create: {}
          }
        }
      })
    }

    if (role == enumRoles.FREELANCER) {
      user = await this.prisma.user.create({
        data: {
          ...d,
          wallet: {
            create: {},
          },
          freelancerProfile: {
            create: {
              bio: '' ,
              hourlyRate: 0 ,
            }
          }
        }
      })
    }
      return user ;
  }

  async findAll() {
    return this.prisma.user.findMany({
      omit: { password: true },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID #${id} not found`);
    }

    return user;
  }

  async updateName(id: number, name: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { name },
      omit: { password: true },
    });
  }



  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      omit: { password: true },
    });
  }


}