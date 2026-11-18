import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { enumRoles } from '../../common/enums/enumRoles.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsIn([enumRoles.CLIENT , enumRoles.FREELANCER])
  @IsNotEmpty()
  role: enumRoles;
}