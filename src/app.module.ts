import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { SeedModule } from './seed/seed.module.js';
import { UserModule } from './user/user.module.js';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { FreelancerProfileModule } from './freelancer-profile/freelancer-profile.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { OffersModule } from './offers/offers.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { SubmissionModule } from './submission/submission.module.js';
import { MailModule } from './mail-module/mail.module.js';
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 10_000 }),
    PrismaModule,
    UserModule,
    AuthModule,
    SeedModule,
    FreelancerProfileModule,
    CategoriesModule,
    ProjectsModule,
    OffersModule,
    WalletModule,
    SubmissionModule,
    MailModule
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
