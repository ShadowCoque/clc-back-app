import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RespuestaItemDto, SubmitEncuestaDto } from './dto/submit-encuesta.dto';
import { Pregunta, TipoPregunta } from '@prisma/client';

type PreguntaSubmit = Pick<Pregunta, 'id' | 'texto' | 'tipo' | 'obligatoria'>;
import { getEcuadorTodayForDb } from '../common/utils/ecuador-date.util';
import {
  esNombreAnonimo,
  esTextoPreguntaNombreSocio,
} from '../common/utils/nombre-socio.util';

@Injectable()
export class EncuestasService {
  constructor(private prisma: PrismaService) {}

  async submit(dto: SubmitEncuestaDto, ipAddress: string) {
    const [area, colaborador, preguntas] = await Promise.all([
      this.prisma.area.findUnique({
        where: { id: dto.areaId },
        select: { activa: true },
      }),
      dto.colaboradorId !== undefined
        ? this.prisma.colaborador.findUnique({
            where: { id: dto.colaboradorId },
            select: { activo: true, areaId: true },
          })
        : Promise.resolve(null),
      this.prisma.pregunta.findMany({
        where: { areaId: dto.areaId, activa: true },
        select: { id: true, texto: true, tipo: true, obligatoria: true },
      }),
    ]);

    if (!area || !area.activa)
      throw new NotFoundException('Área no encontrada o inactiva');

    if (dto.colaboradorId !== undefined) {
      if (!colaborador || !colaborador.activo)
        throw new BadRequestException('Colaborador no encontrado o inactivo');
      if (colaborador.areaId !== dto.areaId)
        throw new BadRequestException(
          'El colaborador no pertenece a esta área',
        );
    }

    const fechaDia = getEcuadorTodayForDb();
    // ipAddress se conserva para auditoría, pero no se usa como rate limit
    // porque varios socios pueden compartir IP pública por NAT.

    for (const pregunta of preguntas) {
      if (!pregunta.obligatoria) continue;

      const respuesta = dto.respuestas.find(
        (r) => r.preguntaId === pregunta.id,
      );

      if (pregunta.tipo === TipoPregunta.SI_NO) {
        if (
          !respuesta ||
          respuesta.valorBooleano === undefined ||
          respuesta.valorBooleano === null
        ) {
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
        // Una respuesta de solo espacios cuenta como vacía; el nombreSocio del
        // dto (aunque sea "Anónimo") puede suplirla, como hasta ahora.
        if (
          !respuesta ||
          (!respuesta.valorTexto?.trim() && !dto.nombreSocio.trim())
        ) {
          throw new BadRequestException(
            'La pregunta de nombre del socio es obligatoria',
          );
        }
      } else if (pregunta.tipo === TipoPregunta.ESCALA_1_10) {
        if (
          !respuesta ||
          respuesta.valorNumero === undefined ||
          respuesta.valorNumero === null
        ) {
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

    const nombreSocio = this.resolverNombreSocio(dto, preguntas);

    const preguntaPorId = new Map(preguntas.map((p) => [p.id, p]));
    const respuestasData = dto.respuestas
      .filter((r) => preguntaPorId.has(r.preguntaId))
      .map((r) => {
        const pregunta = preguntaPorId.get(r.preguntaId)!;
        let valorTexto = r.valorTexto?.trim() || null;
        if (pregunta.tipo === TipoPregunta.NOMBRE_SOCIO && !valorTexto) {
          valorTexto = nombreSocio;
        }
        return {
          preguntaId: r.preguntaId,
          valorBooleano: r.valorBooleano ?? null,
          valorTexto,
          valorNumero: r.valorNumero ?? null,
        };
      });

    // create anidado + createMany: una sola operación atómica en lugar de una
    // transacción interactiva con un insert por respuesta.
    const encuesta = await this.prisma.encuesta.create({
      data: {
        areaId: dto.areaId,
        colaboradorId: dto.colaboradorId ?? null,
        nombreSocio,
        ipAddress,
        fechaEnvio: new Date(),
        fechaDia,
        respuestas: { createMany: { data: respuestasData } },
      },
      select: { id: true },
    });

    return { message: 'Encuesta enviada correctamente', id: encuesta.id };
  }

  /**
   * Defensa del servidor: frontends viejos, caché o POST directos pueden mandar
   * nombreSocio vacío o "Anónimo" aunque el nombre real venga en las respuestas.
   * En ese caso se recupera de la respuesta a la pregunta NOMBRE_SOCIO y, si no
   * existe, de una pregunta de texto cuyo enunciado pida el nombre del socio.
   */
  private resolverNombreSocio(
    dto: SubmitEncuestaDto,
    preguntas: PreguntaSubmit[],
  ): string {
    const nombreDto = dto.nombreSocio.trim();
    if (!esNombreAnonimo(nombreDto)) return nombreDto;

    const idsNombreSocio = new Set(
      preguntas
        .filter((p) => p.tipo === TipoPregunta.NOMBRE_SOCIO)
        .map((p) => p.id),
    );
    const idsTextoNombre = new Set(
      preguntas
        .filter(
          (p) =>
            p.tipo === TipoPregunta.DESCRIPCION &&
            esTextoPreguntaNombreSocio(p.texto),
        )
        .map((p) => p.id),
    );

    const tieneNombre = (r: RespuestaItemDto) =>
      !!r.valorTexto?.trim() && !esNombreAnonimo(r.valorTexto);

    const respuestaNombre =
      dto.respuestas.find(
        (r) => idsNombreSocio.has(r.preguntaId) && tieneNombre(r),
      ) ??
      dto.respuestas.find(
        (r) => idsTextoNombre.has(r.preguntaId) && tieneNombre(r),
      );

    if (!respuestaNombre?.valorTexto) return 'Anónimo';

    // nombreSocio es VarChar(150) en la base.
    return respuestaNombre.valorTexto.trim().slice(0, 150).trim();
  }
}
