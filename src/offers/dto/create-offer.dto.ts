import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  proposalMessage: string;
}