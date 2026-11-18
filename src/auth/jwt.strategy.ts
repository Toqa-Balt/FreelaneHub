import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { userStatus } from '../common/enums/UserStatus.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { id: number; role: string; sid: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id }
    });

    if (!user || user.status === userStatus.BANNED) {
      throw new UnauthorizedException('Invalid account');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid }
    });

    if (
      !session ||
      session.userId !== payload.id ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid session');
    }

    return {
      id: payload.id,
      role: payload.role,
      sid : payload.sid
    };
  }
}