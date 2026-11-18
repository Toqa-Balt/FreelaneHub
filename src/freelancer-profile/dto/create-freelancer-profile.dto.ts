import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateProfileDto {
  @Type(() => Number)
  @Min(0)
  @IsNotEmpty()
  hourlyRate: number;

  @IsString()
  @IsNotEmpty()
  bio : string 
}
