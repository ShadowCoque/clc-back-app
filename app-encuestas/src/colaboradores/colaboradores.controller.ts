import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ColaboradoresService } from './colaboradores.service';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '@prisma/client';

@Controller('colaboradores')
@UseGuards(JwtAuthGuard)
export class ColaboradoresController {
  constructor(private colaboradoresService: ColaboradoresService) {}

  @Get()
  findAll(@Query('areaId') areaIdRaw?: string) {
    let areaId: number | undefined;
    if (areaIdRaw !== undefined && areaIdRaw !== '') {
      const parsed = Number(areaIdRaw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new BadRequestException('areaId debe ser un entero válido.');
      }
      areaId = parsed;
    }
    return this.colaboradoresService.findAll(areaId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  create(@Body() dto: CreateColaboradorDto) {
    return this.colaboradoresService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateColaboradorDto) {
    return this.colaboradoresService.update(id, dto);
  }
}
