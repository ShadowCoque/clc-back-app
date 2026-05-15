import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

const SIN_COLABORADORES_MSG =
  'Esta área aún no está disponible porque no tiene colaboradores activos asignados.';
const SIN_PREGUNTAS_MSG =
  'Esta área aún no está disponible porque no tiene preguntas activas configuradas.';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.area.findMany({
      where: {
        activa: true,
        colaboradores: { some: { activo: true } },
        preguntas: { some: { activa: true } },
      },
      select: { id: true, nombre: true, slug: true, descripcion: true, imagenUrl: true },
    });
  }

  async findAllAdmin() {
    const areas = await this.prisma.area.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        slug: true,
        descripcion: true,
        imagenUrl: true,
        activa: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            colaboradores: { where: { activo: true } },
            preguntas: { where: { activa: true } },
          },
        },
      },
    });

    return areas.map(({ _count, ...rest }) => ({
      ...rest,
      totalColaboradoresActivos: _count.colaboradores,
      totalPreguntasActivas: _count.preguntas,
    }));
  }

  async findBySlug(slug: string) {
    const area = await this.prisma.area.findFirst({
      where: { slug, activa: true },
      select: {
        id: true,
        nombre: true,
        slug: true,
        descripcion: true,
        imagenUrl: true,
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

    if (area.colaboradores.length === 0) {
      throw new BadRequestException(SIN_COLABORADORES_MSG);
    }
    if (area.preguntas.length === 0) {
      throw new BadRequestException(SIN_PREGUNTAS_MSG);
    }

    return area;
  }

  create(dto: CreateAreaDto) {
    return this.prisma.area.create({ data: dto });
  }

  async update(id: number, dto: UpdateAreaDto) {
    await this.findById(id);
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    return this.prisma.area.update({ where: { id }, data });
  }

  private async findById(id: number) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundException(`Área no encontrada: ${id}`);
    return area;
  }
}
