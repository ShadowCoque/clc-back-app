import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitEncuestaDto } from './dto/submit-encuesta.dto';
import { TipoPregunta } from '@prisma/client';
import { getEcuadorTodayForDb } from '../common/utils/ecuador-date.util';

@Injectable()
export class EncuestasService {
  constructor(private prisma: PrismaService) {}

  async submit(dto: SubmitEncuestaDto, ipAddress: string) {
    const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
    if (!area || !area.activa) throw new NotFoundException('Área no encontrada o inactiva');

    if (dto.colaboradorId !== undefined) {
      const colaborador = await this.prisma.colaborador.findUnique({
        where: { id: dto.colaboradorId },
      });
      if (!colaborador || !colaborador.activo)
        throw new BadRequestException('Colaborador no encontrado o inactivo');
      if (colaborador.areaId !== dto.areaId)
        throw new BadRequestException('El colaborador no pertenece a esta área');
    }

    const fechaDia = getEcuadorTodayForDb();

    const existing = await this.prisma.encuesta.findFirst({
      where: { ipAddress, areaId: dto.areaId, fechaDia },
    });
    if (existing) {
      throw new HttpException(
        'Ya enviaste una encuesta para esta área hoy.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const preguntas = await this.prisma.pregunta.findMany({
      where: { areaId: dto.areaId, activa: true },
    });

    for (const pregunta of preguntas) {
      if (!pregunta.obligatoria) continue;

      const respuesta = dto.respuestas.find((r) => r.preguntaId === pregunta.id);

      if (pregunta.tipo === TipoPregunta.SI_NO) {
        if (!respuesta || respuesta.valorBooleano === undefined || respuesta.valorBooleano === null) {
          throw new BadRequestException(
            `La pregunta "${pregunta.texto}" requiere respuesta SI/NO`,
          );
        }
      } else if (pregunta.tipo === TipoPregunta.DESCRIPCION) {
        if (!respuesta || !respuesta.valorTexto?.trim()) {
          throw new BadRequestException(
            `La pregunta "${pregunta.texto}" requiere una descripción`,
          );
        }
      } else if (pregunta.tipo === TipoPregunta.NOMBRE_SOCIO) {
        if (!respuesta) {
          throw new BadRequestException('La pregunta de nombre del socio es obligatoria');
        }
      } else if (pregunta.tipo === TipoPregunta.ESCALA_1_10) {
        if (!respuesta || respuesta.valorNumero === undefined || respuesta.valorNumero === null) {
          throw new BadRequestException(
            `La pregunta "${pregunta.texto}" requiere un valor entre 1 y 10`,
          );
        }
        if (respuesta.valorNumero < 1 || respuesta.valorNumero > 10) {
          throw new BadRequestException(
            `La pregunta "${pregunta.texto}" requiere un valor entre 1 y 10`,
          );
        }
      }
    }

    const encuesta = await this.prisma.$transaction(async (tx) => {
      const nueva = await tx.encuesta.create({
        data: {
          areaId: dto.areaId,
          colaboradorId: dto.colaboradorId ?? null,
          nombreSocio: dto.nombreSocio,
          ipAddress,
          fechaEnvio: new Date(),
          fechaDia,
        },
      });

      for (const r of dto.respuestas) {
        const pregunta = preguntas.find((p) => p.id === r.preguntaId);
        if (!pregunta) continue;

        let valorTexto = r.valorTexto ?? null;
        if (pregunta.tipo === TipoPregunta.NOMBRE_SOCIO && !valorTexto) {
          valorTexto = dto.nombreSocio;
        }

        await tx.respuesta.create({
          data: {
            encuestaId: nueva.id,
            preguntaId: r.preguntaId,
            valorBooleano: r.valorBooleano ?? null,
            valorTexto,
            valorNumero: r.valorNumero ?? null,
          },
        });
      }

      return nueva;
    });

    return { message: 'Encuesta enviada correctamente', id: encuesta.id };
  }
}
