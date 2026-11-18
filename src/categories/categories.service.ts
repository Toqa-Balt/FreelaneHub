import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Prisma } from '../generated/prisma/client.js';
@Injectable()
export class CategoriesService {
 constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const category = await this.prisma.category.create({
        data: createCategoryDto,
      });

      await this.cacheManager.del('categories');

      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    const cacheKey = 'categories' ;
    const cached = await this.cacheManager.get(cacheKey) ;
    if(cached){
      console.log('Cache Hit');
      return cached ;      
    }

    console.log('cache Miss');
    
    const categories = await  this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    await this.cacheManager.set(cacheKey , categories) ;
    return categories ;     
  }

  async findOne(id: number) {
    const cacheKey = `categories:${id}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      console.log(`Cache Hit for category ${id}`);
      return cached;
    }

    console.log(`Cache Miss for category ${id}`);

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID #${id} not found`);
    }

    await this.cacheManager.set(cacheKey, category);
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });

      await this.cacheManager.del('categories');
      await this.cacheManager.del(`categories:${id}`);

      return category;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Category with ID #${id} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Category name already exists');
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID #${id} not found`);
    }

    
    if (category._count.projects > 0) {
      throw new ConflictException(
        'Cannot delete category because it has associated projects',
      );
    }

    const deleted = await this.prisma.category.delete({
      where: { id },
    });

       await this.cacheManager.del('categories');
      await this.cacheManager.del(`categories:${id}`);

    return deleted;
  }
}
