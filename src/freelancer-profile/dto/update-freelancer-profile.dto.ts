import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create-freelancer-profile.dto.js';


export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
