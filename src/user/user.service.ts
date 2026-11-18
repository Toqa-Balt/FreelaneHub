import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { create } from 'domain';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService
  ) { }

  async createUser(d: CreateUserDto) {
    const user = await this.prisma.user.create({
      data : {...d,
        wallet : {
          create : {}
        }
      }
    })
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

  async updateName(id: number, name : string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {name} , 
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