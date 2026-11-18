import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/guards.roles.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { DepositDto } from './dto/deposit.dto.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Patch('deposit')
  @Roles(enumRoles.CLIENT)
  deposit(@CurrentUser('id') userId: number, @Body() depositDto: DepositDto) {
    return this.walletService.deposit(userId, depositDto.amount);
  }

  @Get('my-balance')
  @Roles(enumRoles.CLIENT , enumRoles.FREELANCER, enumRoles.ADMIN )
  getMybalance(@CurrentUser('id') userId: number) {
    return this.walletService.getMyBalance(userId);
  }


  @Get('transactions')
  @Roles(enumRoles.CLIENT, enumRoles.FREELANCER, enumRoles.ADMIN)
  getWalletTransactions(@CurrentUser('id') userId: number) {
    return this.walletService.getWalletTransactions(userId);
  }
}