import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './Dtos/Login.dto.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import type { Request } from 'express';
import { RolesGuard } from '../common/guards/guards.roles.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordDto } from './Dtos/forgotPassword.dto.js';
import { ResetPasswordDto } from './Dtos/resetPassowrd.dto.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }
  
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    const info = req.headers['userAgent'];

    return this.authService.login(body, req.ip, typeof info === 'string' ? info : undefined)
  }

  @Post('refresh')
  refresh(@Body() body: { token: string }) {
    return this.authService.refresh(body.token)

  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(enumRoles.ADMIN)
  @Patch(':id/ban')
  banUser(@Param('id', ParseIntPipe) userId: number) {
    return this.authService.blockUser(userId)

  }

  @Roles(enumRoles.ADMIN)
  @Patch(':id/unban')
  unban(@Param('id', ParseIntPipe) id: number) {
    return this.authService.unban(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser('sid') sid: number) {
    return this.authService.logout(sid);
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('logout-others')
  logoutOthers(
    @CurrentUser('id') userId: number,
    @CurrentUser('sid') currentSid: number,
  ) {
    return this.authService.logoutOthers(userId, currentSid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getMyActiveSessions(@CurrentUser('id') userId: number) {
    return this.authService.activeSessions(userId);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body : ForgotPasswordDto){
    return this.authService.forgotPassword(body) ;
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() body : ResetPasswordDto , @Query('token') token : string ){
    return this.authService.resetPassword(body.newPassword , token) ;

  }




}