import { 
  IsNotEmpty, 
  IsString, 
  IsInt, 
  IsNumber, 
  IsPositive, 
  Min, 
  IsOptional, 
  MaxLength 
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  budgetMin: number;

  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  budgetMax: number;

}