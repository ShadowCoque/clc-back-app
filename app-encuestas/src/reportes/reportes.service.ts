import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Workbook } from 'exceljs';
import { TipoPregunta, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResumenQueryDto } from './dto/resumen-query.dto';
import { EncuestasQueryDto } from './dto/encuestas-query.dto';
import { buildFechaDiaFilter, formatEcuadorDateTime } from '../common/utils/ecuador-date.util';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(q: EncuestasQueryDto): Prisma.EncuestaWhereInput {
    const where: Prisma.EncuestaWhereInput = {};

    if (q.areaId !== undefined) where.areaId = q.areaId;
    if (q.colaboradorId !== undefined) where.colaboradorId = q.colaboradorId;
    if (q.nombreSocio) where.nombreSocio = { contains: q.nombreSocio, mode: 'insensitive' };

    const fechaDiaFilter = buildFechaDiaFilter(q.fechaDesde, q.fechaHasta);
    if (fechaDiaFilter) where.fechaDia = fechaDiaFilter;

    return where;
  }

  async getResumen(q: ResumenQueryDto) {
    const where = this.buildWhere(q);

    const encuestas = await this.prisma.encuesta.findMany({
      where,
      include: {
        area: { select: { id: true, nombre: true } },
        colaborador: { select: { id: true, nombre: true, apellido: true } },
        respuestas: {
          include: { pregunta: { select: { id: true, texto: true, tipo: true } } },
        },
      },
      orderBy: { fechaEnvio: 'desc' },
    });

    const totalEncuestas = encuestas.length;

    type AreaAccum = {
      id: number;
      nombre: string;
      total: number;
      preguntas: Map<number, { texto: string; si: number; no: number }>;
    };
    type ColabAccum = { id: number; nombre: string; apellido: string; total: number };

    const areaMap = new Map<number, AreaAccum>();
    const colaboradorMap = new Map<number, ColabAccum>();
    const respuestasTexto: {
      fecha: Date;
      area: string;
      colaborador: string | null;
      nombreSocio: string;
      texto: string;
    }[] = [];

    for (const encuesta of encuestas) {
      if (!areaMap.has(encuesta.areaId)) {
        areaMap.set(encuesta.areaId, {
          id: encuesta.areaId,
          nombre: encuesta.area.nombre,
          total: 0,
          preguntas: new Map(),
        });
      }
      const areaData = areaMap.get(encuesta.areaId)!;
      areaData.total++;

      if (encuesta.colaboradorId && encuesta.colaborador) {
        if (!colaboradorMap.has(encuesta.colaboradorId)) {
          colaboradorMap.set(encuesta.colaboradorId, {
            id: encuesta.colaboradorId,
            nombre: encuesta.colaborador.nombre,
            apellido: encuesta.colaborador.apellido,
            total: 0,
          });
        }
        colaboradorMap.get(encuesta.colaboradorId)!.total++;
      }

      for (const respuesta of encuesta.respuestas) {
        if (respuesta.pregunta.tipo === TipoPregunta.SI_NO) {
          if (!areaData.preguntas.has(respuesta.preguntaId)) {
            areaData.preguntas.set(respuesta.preguntaId, {
              texto: respuesta.pregunta.texto,
              si: 0,
              no: 0,
            });
          }
          const pData = areaData.preguntas.get(respuesta.preguntaId)!;
          if (respuesta.valorBooleano === true) pData.si++;
          else if (respuesta.valorBooleano === false) pData.no++;
        } else if (respuesta.pregunta.tipo === TipoPregunta.DESCRIPCION && respuesta.valorTexto) {
          respuestasTexto.push({
            fecha: encuesta.fechaEnvio,
            area: encuesta.area.nombre,
            colaborador: encuesta.colaborador
              ? `${encuesta.colaborador.nombre} ${encuesta.colaborador.apellido}`.trim()
              : null,
            nombreSocio: encuesta.nombreSocio,
            texto: respuesta.valorTexto,
          });
        }
      }
    }

    const resumenPorArea = Array.from(areaMap.values()).map((area) => ({
      id: area.id,
      nombre: area.nombre,
      totalEncuestas: area.total,
      preguntas: Array.from(area.preguntas.entries()).map(([id, p]) => {
        const total = p.si + p.no;
        return {
          id,
          texto: p.texto,
          si: p.si,
          no: p.no,
          total,
          porcentajeSatisfaccion: total > 0 ? Math.round((p.si / total) * 100) : 0,
        };
      }),
    }));

    const result: Record<string, unknown> = {
      totalEncuestas,
      resumenPorArea,
      respuestasTexto,
    };

    if (q.colaboradorId !== undefined) {
      result.resumenPorColaborador = Array.from(colaboradorMap.values());
    }

    return result;
  }

  async getEncuestas(q: EncuestasQueryDto) {
    const where = this.buildWhere(q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.encuesta.count({ where }),
      this.prisma.encuesta.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaEnvio: 'desc' },
        include: {
          area: { select: { id: true, nombre: true } },
          colaborador: { select: { id: true, nombre: true, apellido: true } },
          respuestas: {
            include: {
              pregunta: { select: { id: true, texto: true, tipo: true, orden: true } },
            },
            orderBy: { pregunta: { orden: 'asc' } },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportarExcel(q: EncuestasQueryDto, res: Response) {
    const where = this.buildWhere(q);

    const encuestas = await this.prisma.encuesta.findMany({
      where,
      orderBy: { fechaEnvio: 'desc' },
      include: {
        area: { select: { id: true, nombre: true } },
        colaborador: { select: { id: true, nombre: true, apellido: true } },
        respuestas: {
          include: {
            pregunta: { select: { id: true, texto: true, tipo: true, orden: true } },
          },
          orderBy: { pregunta: { orden: 'asc' } },
        },
      },
    });

    const preguntasMap = new Map<
      number,
      { id: number; texto: string; tipo: string; orden: number }
    >();
    for (const encuesta of encuestas) {
      for (const r of encuesta.respuestas) {
        if (!preguntasMap.has(r.preguntaId)) {
          preguntasMap.set(r.preguntaId, r.pregunta);
        }
      }
    }
    const preguntas = Array.from(preguntasMap.values()).sort((a, b) => a.orden - b.orden);

    const workbook = new Workbook();

    const sheet1 = workbook.addWorksheet('Encuestas');
    sheet1.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Hora', key: 'hora', width: 10 },
      { header: 'Área', key: 'area', width: 25 },
      { header: 'Colaborador', key: 'colaborador', width: 25 },
      { header: 'Nombre Socio', key: 'nombreSocio', width: 30 },
      { header: 'IP', key: 'ip', width: 18 },
      ...preguntas.map((p) => ({ header: p.texto, key: `p_${p.id}`, width: 30 })),
    ];

    for (const encuesta of encuestas) {
      const { fecha, hora } = formatEcuadorDateTime(encuesta.fechaEnvio);
      const row: Record<string, string | number> = {
        fecha,
        hora,
        area: encuesta.area.nombre,
        colaborador: encuesta.colaborador
          ? `${encuesta.colaborador.nombre} ${encuesta.colaborador.apellido}`.trim()
          : '',
        nombreSocio: encuesta.nombreSocio,
        ip: encuesta.ipAddress,
      };

      for (const p of preguntas) {
        const resp = encuesta.respuestas.find((r) => r.preguntaId === p.id);
        if (!resp) {
          row[`p_${p.id}`] = '';
        } else if (resp.valorBooleano !== null && resp.valorBooleano !== undefined) {
          row[`p_${p.id}`] = resp.valorBooleano ? 'Sí' : 'No';
        } else {
          row[`p_${p.id}`] = resp.valorTexto ?? '';
        }
      }

      sheet1.addRow(row);
    }

    const sheet2 = workbook.addWorksheet('Resumen');
    sheet2.columns = [
      { header: 'Área', key: 'area', width: 25 },
      { header: 'Total Encuestas', key: 'total', width: 16 },
      { header: 'Pregunta', key: 'pregunta', width: 40 },
      { header: 'Sí', key: 'si', width: 8 },
      { header: 'No', key: 'no', width: 8 },
      { header: '% Satisfacción', key: 'porcentaje', width: 15 },
    ];

    const areaMap = new Map<
      number,
      {
        nombre: string;
        total: number;
        preguntas: Map<number, { texto: string; si: number; no: number }>;
      }
    >();
    for (const encuesta of encuestas) {
      if (!areaMap.has(encuesta.areaId)) {
        areaMap.set(encuesta.areaId, { nombre: encuesta.area.nombre, total: 0, preguntas: new Map() });
      }
      const a = areaMap.get(encuesta.areaId)!;
      a.total++;
      for (const r of encuesta.respuestas) {
        if (r.pregunta.tipo === TipoPregunta.SI_NO) {
          if (!a.preguntas.has(r.preguntaId)) {
            a.preguntas.set(r.preguntaId, { texto: r.pregunta.texto, si: 0, no: 0 });
          }
          const p = a.preguntas.get(r.preguntaId)!;
          if (r.valorBooleano === true) p.si++;
          else if (r.valorBooleano === false) p.no++;
        }
      }
    }

    for (const [, area] of areaMap) {
      let first = true;
      for (const [, p] of area.preguntas) {
        const total = p.si + p.no;
        sheet2.addRow({
          area: first ? area.nombre : '',
          total: first ? area.total : '',
          pregunta: p.texto,
          si: p.si,
          no: p.no,
          porcentaje: total > 0 ? `${Math.round((p.si / total) * 100)}%` : '0%',
        });
        first = false;
      }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-encuestas.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }
}
