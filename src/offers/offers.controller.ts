import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OffersService } from './offers.service.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/guards.roles.js';
import { Roles } from '../common/decoraters/Roles.decorater.js';
import { CurrentUser } from '../common/decoraters/user.decorater.js';
import { enumRoles } from '../common/enums/enumRoles.js';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Roles(enumRoles.FREELANCER)
  @Post('project/:projectId')
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser('id') freelancerId: number,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    return this.offersService.create(projectId, freelancerId, createOfferDto);
  }

  @Roles(enumRoles.CLIENT)
  @Patch('accept/:id')
  acceptOffer(@Param('id' , ParseIntPipe) id : number , @CurrentUser('id')  clientId  :number){
    return this.offersService.acceptOffer(id , clientId) ;

  }

  @Roles(enumRoles.FREELANCER)
  @Get('my-offers')
  getMyOffers(@CurrentUser('id') freelancerId: number) {
    return this.offersService.getMyOffers(freelancerId);
  }

  @Roles(enumRoles.CLIENT)
  @Get('project/:projectId')
  getOffersOnMyProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser('id') clientId: number,
  ) {
    return this.offersService.getOffersOnProject(projectId, clientId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.offersService.findOne(id, userId);
  }

  @Roles(enumRoles.FREELANCER)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') freelancerId: number,
    @Body() updateOfferDto: UpdateOfferDto,
  ) {
    return this.offersService.update(id, freelancerId, updateOfferDto);
  }

  @Roles(enumRoles.FREELANCER)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') freelancerId: number,
  ) {
    return this.offersService.remove(id, freelancerId);
  }
}