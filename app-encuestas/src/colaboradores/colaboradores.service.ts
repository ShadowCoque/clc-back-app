import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';

const AREA_OBLIGATORIA_MSG = 'Debe seleccionar un área para el colaborador.';
const AREA_NO_EXISTE_MSG = 'El área seleccionada no existe.';

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
    if (
      dto.areaId === undefined ||
      dto.areaId === null ||
      !Number.isInteger(dto.areaId) ||
      dto.areaId < 1
    ) {
      throw new BadRequestException(AREA_OBLIGATORIA_MSG);
    }
    const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
    if (!area) throw new BadRequestException(AREA_NO_EXISTE_MSG);
    return this.prisma.colaborador.create({ data: dto });
  }

  async update(id: number, dto: UpdateColaboradorDto) {
    await this.findById(id);

    if (Object.prototype.hasOwnProperty.call(dto, 'areaId')) {
      if (
        dto.areaId === null ||
        dto.areaId === undefined ||
        !Number.isInteger(dto.areaId) ||
        dto.areaId < 1
      ) {
        throw new BadRequestException(AREA_OBLIGATORIA_MSG);
      }
      const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) throw new BadRequestException(AREA_NO_EXISTE_MSG);
    }

    return this.prisma.colaborador.update({ where: { id }, data: dto });
  }

  private async findById(id: number) {
    const c = await this.prisma.colaborador.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Colaborador no encontrado: ${id}`);
    return c;
  }
}
