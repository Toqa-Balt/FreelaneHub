import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Rejection reason must be at least 10 characters long',
  })
  @MaxLength(500, {
    message: 'Rejection reason must not exceed 500 characters',
  })
  rejectionReason: string;
}