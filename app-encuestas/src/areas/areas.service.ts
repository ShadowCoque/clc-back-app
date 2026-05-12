import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.area.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, slug: true, descripcion: true },
    });
  }

  async findBySlug(slug: string) {
    const area = await this.prisma.area.findFirst({
      where: { slug, activa: true },
      select: {
        id: true,
        nombre: true,
        slug: true,
        descripcion: true,
        preguntas: {
          where: { activa: true },
          orderBy: { orden: 'asc' },
          select: { id: true, texto: true, tipo: true, orden: true, obligatoria: true },
        },
        colaboradores: {
          where: { activo: true },
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });
    if (!area) throw new NotFoundException(`Área no encontrada: ${slug}`);
    return area;
  }

  create(dto: CreateAreaDto) {
    return this.prisma.area.create({ data: dto });
  }

  async update(id: number, dto: UpdateAreaDto) {
    await this.findById(id);
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  private async findById(id: number) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundException(`Área no encontrada: ${id}`);
    return area;
  }
}
