import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PreguntasService } from './preguntas.service';
import { CreatePreguntaDto } from './dto/create-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '@prisma/client';

@Controller('preguntas')
export class PreguntasController {
  constructor(private preguntasService: PreguntasService) {}

  @Get()
  findByArea(@Query('areaId', ParseIntPipe) areaId: number) {
    return this.preguntasService.findByArea(areaId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.GERENTE)
  create(@Body() dto: CreatePreguntaDto) {
    return this.preguntasService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.GERENTE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePreguntaDto) {
    return this.preguntasService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.GERENTE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.preguntasService.remove(id);
  }
}
