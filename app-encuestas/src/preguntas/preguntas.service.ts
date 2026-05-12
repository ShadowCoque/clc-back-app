import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreguntaDto } from './dto/create-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@Injectable()
export class PreguntasService {
  constructor(private prisma: PrismaService) {}

  findByArea(areaId: number) {
    return this.prisma.pregunta.findMany({
      where: { areaId, activa: true },
      orderBy: { orden: 'asc' },
      select: { id: true, texto: true, tipo: true, orden: true, obligatoria: true },
    });
  }

  create(dto: CreatePreguntaDto) {
    return this.prisma.pregunta.create({
      data: { ...dto, obligatoria: dto.obligatoria ?? true },
    });
  }

  async update(id: number, dto: UpdatePreguntaDto) {
    await this.findById(id);
    return this.prisma.pregunta.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findById(id);
    return this.prisma.pregunta.update({ where: { id }, data: { activa: false } });
  }

  private async findById(id: number) {
    const p = await this.prisma.pregunta.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Pregunta no encontrada: ${id}`);
    return p;
  }
}
