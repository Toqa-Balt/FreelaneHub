import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TransactionType } from '../common/enums/transactionType.js';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) { }

  async deposit(userId: number, amount: number) {
    return await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        transactions: {
          create: {
            amount,
            type: TransactionType.DEPOSIT,
            description: `you deposit ${amount} to your balance`
          }
        }
      },
      select: { balance: true }
    })

  }

  async getMyBalance(userId: number) {
  return this.prisma.wallet.findUnique({
    where: { userId },
    select: {
      balance: true,
      lockedBalance: true,
    },
  });
}

async getWalletTransactions(
  
  userId: number){
  return await this.prisma.walletTransaction.findMany({
    where : {
      wallet : {
        userId 
      }
    }
  })

}



}
