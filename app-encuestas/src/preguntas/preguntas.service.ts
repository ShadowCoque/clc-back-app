import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreguntaDto } from './dto/create-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

const ORDEN_CONFLICT_MSG = 'Ya existe una pregunta con ese orden en esta área.';

// Detecta P2002 sin usar instanceof para evitar problemas con Prisma 7 + driver adapters.
// El único @@unique compuesto en Pregunta es [areaId, orden], así que cualquier P2002
// en este servicio corresponde a ese constraint.
function isOrdenConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e['code'] === 'P2002') return true;
  // Algunas versiones del adapter exponen el código en una propiedad anidada
  const cause = e['cause'] as Record<string, unknown> | undefined;
  return cause?.['code'] === 'P2002';
}

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

  findAllByAreaAdmin(areaId: number) {
    return this.prisma.pregunta.findMany({
      where: { areaId },
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        areaId: true,
        texto: true,
        tipo: true,
        orden: true,
        obligatoria: true,
        activa: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreatePreguntaDto) {
    const duplicado = await this.prisma.pregunta.findFirst({
      where: { areaId: dto.areaId, orden: dto.orden },
      select: { id: true },
    });
    if (duplicado) throw new ConflictException(ORDEN_CONFLICT_MSG);

    try {
      return await this.prisma.pregunta.create({
        data: { ...dto, obligatoria: dto.obligatoria ?? true },
      });
    } catch (err) {
      if (isOrdenConflict(err)) throw new ConflictException(ORDEN_CONFLICT_MSG);
      throw err;
    }
  }

  async update(id: number, dto: UpdatePreguntaDto) {
    const actual = await this.findById(id);

    const dtoAreaId = (dto as { areaId?: number }).areaId;
    const areaIdFinal = dtoAreaId ?? actual.areaId;
    const ordenFinal = dto.orden ?? actual.orden;

    const cambiaArea = dtoAreaId !== undefined && dtoAreaId !== actual.areaId;
    const cambiaOrden = dto.orden !== undefined && dto.orden !== actual.orden;

    if (cambiaArea || cambiaOrden) {
      const conflicto = await this.prisma.pregunta.findFirst({
        where: {
          areaId: areaIdFinal,
          orden: ordenFinal,
          NOT: { id },
        },
        select: { id: true },
      });
      if (conflicto) throw new ConflictException(ORDEN_CONFLICT_MSG);
    }

    try {
      return await this.prisma.pregunta.update({ where: { id }, data: dto });
    } catch (err) {
      if (isOrdenConflict(err)) throw new ConflictException(ORDEN_CONFLICT_MSG);
      throw err;
    }
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
