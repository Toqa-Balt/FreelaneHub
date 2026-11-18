import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/guards.roles.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';
import { CreateUserDto } from './dto/create-user.dto.js';
@UseGuards(JwtAuthGuard , RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

@Roles(enumRoles.ADMIN)
  @Post()
  create(@Body() body : CreateUserDto) {
    return this.userService.createUser(body);
  }
@Roles(enumRoles.ADMIN)
  @Get()
  findAll() {
    return this.userService.findAll();
  }
@Roles(enumRoles.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }
@Roles(enumRoles.CLIENT , enumRoles.FREELANCER)
  @Patch()
  update(@CurrentUser('id') id : number , @Body('name') name : string) {
    return this.userService.updateName(id, name);
  }
  
  @Roles(enumRoles.CLIENT , enumRoles.FREELANCER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
