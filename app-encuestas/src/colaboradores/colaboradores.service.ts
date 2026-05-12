import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';

@Injectable()
export class ColaboradoresService {
  constructor(private prisma: PrismaService) {}

  findByArea(areaId: number) {
    return this.prisma.colaborador.findMany({
      where: { areaId },
      select: { id: true, nombre: true, apellido: true, activo: true, areaId: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async create(dto: CreateColaboradorDto) {
    const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
    if (!area) throw new BadRequestException(`Área no encontrada: ${dto.areaId}`);
    return this.prisma.colaborador.create({ data: dto });
  }

  async update(id: number, dto: UpdateColaboradorDto) {
    await this.findById(id);
    if (dto.areaId !== undefined) {
      const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) throw new BadRequestException(`Área no encontrada: ${dto.areaId}`);
    }
    return this.prisma.colaborador.update({ where: { id }, data: dto });
  }

  private async findById(id: number) {
    const c = await this.prisma.colaborador.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Colaborador no encontrado: ${id}`);
    return c;
  }
}
