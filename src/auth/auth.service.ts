import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './Dtos/Login.dto.js';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { UserService } from '../user/user.service.js';
import { userStatus } from '../common/enums/UserStatus.js';
import { ForgotPasswordDto } from './Dtos/forgotPassword.dto.js';
import { MailService } from '../mail-module/mail.service.js';
import { throwError } from 'rxjs';

@Injectable()
export class AuthService {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly mailService: MailService
    ) { }

    async register(d: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where:
                { email: d.email }
        });

        if (existingUser) {
            throw new ConflictException('email already exists');
        }

        d.password = await bcrypt.hash(d.password, 10);

        const user = await this.userService.createUser(d , d.role) ;

        return {
            email: user.email,
            role: user.role,
        };
    }

    //1
    private async validateUser(d: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: d.email
            }
        });

        if (!user) {
            throw new UnauthorizedException('Email or password incorrect');
        }

        const isMatch = await bcrypt.compare(d.password, user.password);

        if (!isMatch) {
            throw new UnauthorizedException('Email or password incorrect');
        }

        if (user.status == userStatus.BANNED) {
            throw new UnauthorizedException('your account has been banned');
        }

        return user;
    }
    //2
    private async signTokens(user: { id: number; role: string }, sid: number) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { id: user.id, role: user.role, sid },
                { secret: this.configService.getOrThrow<string>('JWT_SECRET'), expiresIn: '10m' },
            ),
            this.jwtService.signAsync(
                { id: user.id, sid },
                { secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
            ),
        ]);
        return { accessToken, refreshToken };
    }

    private hash(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
    //3
    private saveRefreshHash(sid: number, token: string) {
        return this.prisma.session.update({
            where: { id: sid },
            data: { refreshTokenHash: this.hash(token) },
        });
    }



    async login(d: LoginDto, ip?: string, info?: string) {
        //1
        const user = await this.validateUser(d);

        const session = await this.prisma.session.create({
            data: {
                userId: user.id,
                refreshTokenHash: '',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                deviceInfo: info,
                ipAddress: ip
            },
        });

        //2
        const tokens = await this.signTokens(user, session.id);
        //3
        await this.saveRefreshHash(session.id, tokens.refreshToken);

        return tokens;

    }

    async refresh(refreshToken: string) {
        let payload: { id: number; sid: number };
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
        } catch {
            throw new UnauthorizedException();
        }

        const session = await this.prisma.session.findUnique({
            where: { id: payload.sid },
        });

        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new UnauthorizedException();
        }

        if (session.refreshTokenHash !== this.hash(refreshToken)) {
            await this.prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            throw new UnauthorizedException();
        }

        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: payload.id },
        });

        const tokens = await this.signTokens(user, session.id);

        await this.saveRefreshHash(session.id, tokens.refreshToken);

        return tokens;

    }
    async blockUser(userId: number) {
        await this.prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        const banned = await this.prisma.user.update({
            where: { id: userId },
            data: { status: userStatus.BANNED }
        })

        return {
            banned,
            message: 'banned successfully'
        }

    }

    async unban(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const active = await this.prisma.user.update({
            where: { id },
            data: { status: userStatus.ACTIVE },
            omit: { password: true },
        });

        return {
            active,
            message: 'unbanned successfully'
        }
    }

    async logout(sid: number) {
        const session = await this.prisma.session.findFirst({
            where: { id: sid }
        })

        if (session?.revokedAt != null) throw new UnauthorizedException();
        return this.prisma.session.update({
            where: { id: sid },
            data: { revokedAt: new Date() },
        });
    }

    logoutOthers(userId: number, currentSid: number) {
        return this.prisma.session.updateMany({
            where: { userId, id: { not: currentSid }, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    async activeSessions(userId: number) {
        return await this.prisma.session.findMany({
            where: {
                userId,
                AND: { revokedAt: null }
            }
        })
    }

    async forgotPassword(d: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: d.email },
        });

        if (!user) {
            return {
                message: 'If that email exists in our system, a reset link has been sent.',
            };
        }

        const resetToken = randomBytes(32).toString('hex');
        
        const hashedToken = this.hash(resetToken);

        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedToken,
                resetTokenExpiry: expiry
            }
        })

        const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;

        await this.mailService.sendResetPasswordEmail(user.email, resetLink);

        return {
            message: 'If that email exists in our system, a reset link has been sent.',
        };

    }

    async resetPassword(newPassword: string, token: string) {
        const hashedToken = this.hash(token);

        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
                resetTokenExpiry: { gt: new Date() }
            }
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null,
                },
            });

            await tx.session.updateMany({
                where: {
                    userId: user.id,
                    revokedAt: null,
                },
                data: {
                    revokedAt: new Date(),
                },
            });
        });

        return { message: 'Password has been reset successfully' };
    }



}