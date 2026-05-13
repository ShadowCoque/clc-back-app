import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Workbook, Worksheet, Row } from 'exceljs';
import { TipoPregunta, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResumenQueryDto } from './dto/resumen-query.dto';
import { EncuestasQueryDto } from './dto/encuestas-query.dto';
import {
  buildFechaDiaFilter,
  formatFechaDia,
  formatHoraEcuador,
} from '../common/utils/ecuador-date.util';

// ─── Colores institucionales ────────────────────────────────────────────────
const COLOR = {
  PRIMARY:    '1F3864',
  SECONDARY:  '2E75B6',
  ACCENT:     '4472C4',
  HEADER_FG:  'FFFFFF',
  GREEN_BG:   'E2EFDA',
  YELLOW_BG:  'FFEB9C',
  RED_BG:     'FFC7CE',
  LIGHT_GRAY: 'F2F2F2',
  BORDER:     'BFBFBF',
  KPI_BG:     'DEEAF1',
};

// ─── Helpers de estilo ──────────────────────────────────────────────────────
function headerStyle(ws: Worksheet, row: Row, bgColor = COLOR.PRIMARY) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgColor}` } };
    cell.font = { bold: true, color: { argb: `FF${COLOR.HEADER_FG}` }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
  row.height = 30;
  void ws;
}

function thinBorder() {
  const s = { style: 'thin' as const, color: { argb: `FF${COLOR.BORDER}` } };
  return { top: s, left: s, bottom: s, right: s };
}

function zebraRow(row: Row, idx: number) {
  if (idx % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.LIGHT_GRAY}` } };
    });
  }
  row.eachCell((cell) => {
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', wrapText: false };
  });
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
}

/** NPS real: %promotores - %detractores con 2 decimales, sin redondeo a entero. */
function calcNps(valores: number[], total: number): {
  promotores: number; pasivos: number; detractores: number; nps: number;
} {
  const promotores  = valores.filter((v) => v >= 9).length;
  const pasivos     = valores.filter((v) => v >= 7 && v <= 8).length;
  const detractores = valores.filter((v) => v <= 6).length;
  const nps = total > 0 ? pct(promotores, total) - pct(detractores, total) : 0;
  return { promotores, pasivos, detractores, nps };
}

function npsLabel(nps: number): string {
  if (nps >= 50) return 'Excelente';
  if (nps >= 0)  return 'Aceptable / mejorable';
  return 'Crítico';
}

function alertFill(value: number, good: number, warn: number) {
  if (value >= good) return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${COLOR.GREEN_BG}` } };
  if (value >= warn) return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${COLOR.YELLOW_BG}` } };
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${COLOR.RED_BG}` } };
}

// ─── Tipos internos ─────────────────────────────────────────────────────────
type ColabStats = {
  id: number; nombre: string; apellido: string;
  areaId: number; areaNombre: string;
  total: number; escalaValores: number[];
  siCount: number; noCount: number; comentarios: number;
};

type PreguntaStats = {
  id: number; texto: string; tipo: string;
  areaId: number; areaNombre: string;
  colaboradorNombre: string;
  siCount: number; noCount: number; escalaValores: number[];
};

type ComentarioRow = {
  fecha: string; hora: string; area: string; colaborador: string;
  nombreSocio: string; texto: string; escala: number | null; clasificacion: string;
};

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  // ─── Validación colaborador–área ─────────────────────────────────────────
  private async validateColaboradorArea(areaId?: number, colaboradorId?: number): Promise<void> {
    if (!areaId || !colaboradorId) return;
    const existe = await this.prisma.colaborador.findFirst({
      where: { id: colaboradorId, areaId },
      select: { id: true },
    });
    if (!existe) {
      throw new BadRequestException(
        `El colaborador ${colaboradorId} no pertenece al área ${areaId}.`,
      );
    }
  }

  private buildWhere(q: EncuestasQueryDto): Prisma.EncuestaWhereInput {
    const where: Prisma.EncuestaWhereInput = {};
    if (q.areaId !== undefined) where.areaId = q.areaId;
    if (q.colaboradorId !== undefined) where.colaboradorId = q.colaboradorId;
    if (q.nombreSocio) where.nombreSocio = { contains: q.nombreSocio, mode: 'insensitive' };
    const fechaDiaFilter = buildFechaDiaFilter(q.fechaDesde, q.fechaHasta);
    if (fechaDiaFilter) where.fechaDia = fechaDiaFilter;
    return where;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  async getResumen(q: ResumenQueryDto) {
    await this.validateColaboradorArea(q.areaId, q.colaboradorId);
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
      id: number; nombre: string; total: number;
      preguntas: Map<number, { texto: string; si: number; no: number }>;
      escalas: Map<number, { texto: string; valores: number[] }>;
    };
    type ColabAccum = { id: number; nombre: string; apellido: string; total: number };

    const areaMap = new Map<number, AreaAccum>();
    const colaboradorMap = new Map<number, ColabAccum>();
    const respuestasTexto: {
      fecha: string; hora: string; area: string;
      colaborador: string | null; nombreSocio: string; texto: string;
    }[] = [];

    for (const encuesta of encuestas) {
      if (!areaMap.has(encuesta.areaId)) {
        areaMap.set(encuesta.areaId, {
          id: encuesta.areaId, nombre: encuesta.area.nombre,
          total: 0, preguntas: new Map(), escalas: new Map(),
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
            areaData.preguntas.set(respuesta.preguntaId, { texto: respuesta.pregunta.texto, si: 0, no: 0 });
          }
          const pData = areaData.preguntas.get(respuesta.preguntaId)!;
          if (respuesta.valorBooleano === true) pData.si++;
          else if (respuesta.valorBooleano === false) pData.no++;
        } else if (respuesta.pregunta.tipo === TipoPregunta.ESCALA_1_10) {
          if (respuesta.valorNumero !== null && respuesta.valorNumero !== undefined) {
            if (!areaData.escalas.has(respuesta.preguntaId)) {
              areaData.escalas.set(respuesta.preguntaId, { texto: respuesta.pregunta.texto, valores: [] });
            }
            areaData.escalas.get(respuesta.preguntaId)!.valores.push(respuesta.valorNumero);
          }
        } else if (respuesta.pregunta.tipo === TipoPregunta.DESCRIPCION && respuesta.valorTexto) {
          respuestasTexto.push({
            fecha: formatFechaDia(encuesta.fechaDia),
            hora: formatHoraEcuador(encuesta.fechaEnvio),
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
      id: area.id, nombre: area.nombre, totalEncuestas: area.total,
      preguntas: Array.from(area.preguntas.entries()).map(([id, p]) => {
        const total = p.si + p.no;
        return { id, texto: p.texto, si: p.si, no: p.no, total,
          porcentajeSatisfaccion: total > 0 ? Math.round((p.si / total) * 100) : 0 };
      }),
      escalas: Array.from(area.escalas.entries()).map(([id, e]) => {
        const valores = e.valores;
        const totalRespuestas = valores.length;
        if (totalRespuestas === 0) {
          return { preguntaId: id, pregunta: e.texto, totalRespuestas: 0,
            promedio: null, minimo: null, maximo: null, distribucion: {} as Record<number, number>,
            detractores: 0, pasivos: 0, promotores: 0,
            porcentajeDetractores: 0, porcentajePromotores: 0, npsAproximado: 0 };
        }
        const suma = valores.reduce((acc, v) => acc + v, 0);
        const promedio = Math.round((suma / totalRespuestas) * 100) / 100;
        const minimo = Math.min(...valores);
        const maximo = Math.max(...valores);
        const distribucion: Record<number, number> = {};
        for (let i = 1; i <= 10; i++) distribucion[i] = 0;
        for (const v of valores) distribucion[v] = (distribucion[v] ?? 0) + 1;
        const detractores = valores.filter((v) => v <= 6).length;
        const pasivos     = valores.filter((v) => v >= 7 && v <= 8).length;
        const promotores  = valores.filter((v) => v >= 9).length;
        const porcentajeDetractores = Math.round(pct(detractores, totalRespuestas));
        const porcentajePromotores  = Math.round(pct(promotores, totalRespuestas));
        const npsAproximado = porcentajePromotores - porcentajeDetractores;
        return { preguntaId: id, pregunta: e.texto, totalRespuestas, promedio, minimo, maximo,
          distribucion, detractores, pasivos, promotores,
          porcentajeDetractores, porcentajePromotores, npsAproximado };
      }),
    }));

    const result: Record<string, unknown> = { totalEncuestas, resumenPorArea, respuestasTexto };
    if (q.colaboradorId !== undefined) {
      result.resumenPorColaborador = Array.from(colaboradorMap.values());
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  async getEncuestas(q: EncuestasQueryDto) {
    await this.validateColaboradorArea(q.areaId, q.colaboradorId);
    const where = this.buildWhere(q);
    const page  = q.page ?? 1;
    const limit = q.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.encuesta.count({ where }),
      this.prisma.encuesta.findMany({
        where, skip, take: limit,
        orderBy: { fechaEnvio: 'desc' },
        include: {
          area: { select: { id: true, nombre: true } },
          colaborador: { select: { id: true, nombre: true, apellido: true } },
          respuestas: {
            include: { pregunta: { select: { id: true, texto: true, tipo: true, orden: true } } },
            orderBy: { pregunta: { orden: 'asc' } },
          },
        },
      }),
    ]);

    return {
      data: data.map((enc) => ({
        ...enc,
        fecha: formatFechaDia(enc.fechaDia),
        hora: formatHoraEcuador(enc.fechaEnvio),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════════════════════
  async exportarExcel(q: EncuestasQueryDto, res: Response) {
    await this.validateColaboradorArea(q.areaId, q.colaboradorId);
    const where = this.buildWhere(q);

    const encuestas = await this.prisma.encuesta.findMany({
      where,
      orderBy: { fechaEnvio: 'desc' },
      include: {
        area: { select: { id: true, nombre: true } },
        colaborador: { select: { id: true, nombre: true, apellido: true } },
        respuestas: {
          include: { pregunta: { select: { id: true, texto: true, tipo: true, orden: true } } },
          orderBy: { pregunta: { orden: 'asc' } },
        },
      },
    });

    // ── Preguntas únicas ordenadas ─────────────────────────────────────────
    const preguntasMap = new Map<number, { id: number; texto: string; tipo: string; orden: number }>();
    for (const enc of encuestas) {
      for (const r of enc.respuestas) {
        if (!preguntasMap.has(r.preguntaId)) preguntasMap.set(r.preguntaId, r.pregunta);
      }
    }
    const preguntas = Array.from(preguntasMap.values()).sort((a, b) => a.orden - b.orden);

    // ── Estadísticas globales ──────────────────────────────────────────────
    const totalEncuestas   = encuestas.length;
    const allEscalaValores: number[] = [];
    const allSiNo          = { si: 0, no: 0 };
    let   totalComentarios = 0;

    const colabStatsMap = new Map<number, ColabStats>();
    // Clave: preguntaId — colaboradorNombre se fija como "Todos" si no hay filtro por colaborador
    const pregStatsMap  = new Map<number, PreguntaStats>();
    const porFechaMap   = new Map<string, number>();
    const comentarios: ComentarioRow[] = [];

    for (const enc of encuestas) {
      const fecha       = formatFechaDia(enc.fechaDia);
      const colabId     = enc.colaboradorId;
      const colabNombre = enc.colaborador
        ? `${enc.colaborador.nombre} ${enc.colaborador.apellido}`.trim()
        : null;

      porFechaMap.set(fecha, (porFechaMap.get(fecha) ?? 0) + 1);

      if (colabId && enc.colaborador && !colabStatsMap.has(colabId)) {
        colabStatsMap.set(colabId, {
          id: colabId,
          nombre:    enc.colaborador.nombre,
          apellido:  enc.colaborador.apellido,
          areaId:    enc.areaId,
          areaNombre: enc.area.nombre,
          total: 0, escalaValores: [], siCount: 0, noCount: 0, comentarios: 0,
        });
      }
      if (colabId) colabStatsMap.get(colabId)!.total++;

      // Escala de esta encuesta (para clasificar comentarios)
      let escalaEncuesta: number | null = null;
      for (const r of enc.respuestas) {
        if (r.pregunta.tipo === TipoPregunta.ESCALA_1_10 && r.valorNumero != null) {
          escalaEncuesta = r.valorNumero;
        }
      }

      for (const r of enc.respuestas) {
        // Nombre de colaborador en Análisis Preguntas:
        // si hay filtro por colaborador → su nombre; si no → "Todos"
        const pregColabNombre =
          q.colaboradorId !== undefined ? (colabNombre ?? 'Sin colaborador') : 'Todos';

        if (!pregStatsMap.has(r.preguntaId)) {
          pregStatsMap.set(r.preguntaId, {
            id: r.preguntaId,
            texto: r.pregunta.texto,
            tipo:  r.pregunta.tipo,
            areaId: enc.areaId,
            areaNombre: enc.area.nombre,
            colaboradorNombre: pregColabNombre,
            siCount: 0, noCount: 0, escalaValores: [],
          });
        }
        const ps = pregStatsMap.get(r.preguntaId)!;

        if (r.pregunta.tipo === TipoPregunta.SI_NO) {
          if (r.valorBooleano === true)  { ps.siCount++; allSiNo.si++; if (colabId) colabStatsMap.get(colabId)!.siCount++; }
          else if (r.valorBooleano === false) { ps.noCount++; allSiNo.no++; if (colabId) colabStatsMap.get(colabId)!.noCount++; }
        } else if (r.pregunta.tipo === TipoPregunta.ESCALA_1_10 && r.valorNumero != null) {
          ps.escalaValores.push(r.valorNumero);
          allEscalaValores.push(r.valorNumero);
          if (colabId) colabStatsMap.get(colabId)!.escalaValores.push(r.valorNumero);
        } else if (r.pregunta.tipo === TipoPregunta.DESCRIPCION && r.valorTexto) {
          totalComentarios++;
          if (colabId) colabStatsMap.get(colabId)!.comentarios++;

          let clasificacion = 'Sin escala';
          if (escalaEncuesta !== null) {
            if      (escalaEncuesta >= 9) clasificacion = 'Promotor';
            else if (escalaEncuesta >= 7) clasificacion = 'Pasivo';
            else                          clasificacion = 'Detractor';
          }
          comentarios.push({
            fecha, hora: formatHoraEcuador(enc.fechaEnvio),
            area: enc.area.nombre,
            colaborador: colabNombre ?? '',
            nombreSocio: enc.nombreSocio,
            texto: r.valorTexto,
            escala: escalaEncuesta,
            clasificacion,
          });
        }
      }
    }

    // ── KPIs globales ──────────────────────────────────────────────────────
    const { promotores: gPromo, pasivos: gPasivos, detractores: gDetrac, nps: gNps } =
      calcNps(allEscalaValores, allEscalaValores.length);
    const promedioGlobal = allEscalaValores.length > 0
      ? Math.round((allEscalaValores.reduce((a, b) => a + b, 0) / allEscalaValores.length) * 100) / 100
      : null;
    const siNoTotal       = allSiNo.si + allSiNo.no;
    const pctSatisfaccion = pct(allSiNo.si, siNoTotal);

    // ── Resumen por área (necesario en Hoja 1 y Hoja 6) ───────────────────
    const areasResumen = new Map<number, {
      nombre: string; total: number; escalas: number[]; si: number; no: number; comentarios: number;
    }>();
    for (const enc of encuestas) {
      if (!areasResumen.has(enc.areaId)) {
        areasResumen.set(enc.areaId, { nombre: enc.area.nombre, total: 0, escalas: [], si: 0, no: 0, comentarios: 0 });
      }
      const a = areasResumen.get(enc.areaId)!;
      a.total++;
      for (const r of enc.respuestas) {
        if (r.pregunta.tipo === TipoPregunta.ESCALA_1_10 && r.valorNumero != null) a.escalas.push(r.valorNumero);
        else if (r.pregunta.tipo === TipoPregunta.SI_NO) {
          if (r.valorBooleano === true) a.si++;
          else if (r.valorBooleano === false) a.no++;
        } else if (r.pregunta.tipo === TipoPregunta.DESCRIPCION && r.valorTexto) a.comentarios++;
      }
    }

    // ── Etiquetas de filtro para portada ──────────────────────────────────
    let filtroArea = 'Todas las áreas';
    let filtroColaborador = 'Todos';
    let filtroPeriodo = 'Todos los registros';
    if (q.areaId) {
      const areaEnc = encuestas.find((e) => e.areaId === q.areaId);
      if (areaEnc) filtroArea = areaEnc.area.nombre;
    }
    if (q.colaboradorId) {
      const cs = colabStatsMap.get(q.colaboradorId);
      if (cs) filtroColaborador = `${cs.nombre} ${cs.apellido}`.trim();
    }
    if (q.fechaDesde || q.fechaHasta) {
      filtroPeriodo = `${q.fechaDesde ?? '...'} — ${q.fechaHasta ?? '...'}`;
    }

    const workbook = new Workbook();
    workbook.creator = 'Club La Campiña';
    workbook.created = new Date();

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 1: RESUMEN EJECUTIVO
    // ══════════════════════════════════════════════════════════════════════
    const ws1 = workbook.addWorksheet('Resumen Ejecutivo');
    ws1.properties.defaultRowHeight = 18;

    // Título principal
    ws1.mergeCells('A1:H1');
    const tituloCell = ws1.getCell('A1');
    tituloCell.value = 'REPORTE DE ENCUESTAS DE SATISFACCIÓN';
    tituloCell.font  = { bold: true, size: 18, color: { argb: `FF${COLOR.HEADER_FG}` } };
    tituloCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.PRIMARY}` } };
    tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 45;

    // Subtítulos de filtro
    const subtitulos: [string, string][] = [
      ['Área:',               filtroArea],
      ['Colaborador:',        filtroColaborador],
      ['Período:',            filtroPeriodo],
      ['Fecha de generación:', new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', dateStyle: 'long' })],
    ];
    let row = 2;
    for (const [label, val] of subtitulos) {
      ws1.mergeCells(`A${row}:B${row}`);
      ws1.mergeCells(`C${row}:H${row}`);
      const lc = ws1.getCell(`A${row}`);
      lc.value = label;
      lc.font  = { bold: true, size: 11, color: { argb: `FF${COLOR.PRIMARY}` } };
      lc.alignment = { horizontal: 'right', vertical: 'middle' };
      const vc = ws1.getCell(`C${row}`);
      vc.value = val;
      vc.font  = { size: 11 };
      vc.alignment = { horizontal: 'left', vertical: 'middle' };
      ws1.getRow(row).height = 22;
      row++;
    }
    row++; // espacio

    // Encabezado sección KPIs
    ws1.mergeCells(`A${row}:H${row}`);
    const kpiHdr = ws1.getCell(`A${row}`);
    kpiHdr.value = 'INDICADORES CLAVE DE DESEMPEÑO (KPIs)';
    kpiHdr.font  = { bold: true, size: 12, color: { argb: `FF${COLOR.HEADER_FG}` } };
    kpiHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.SECONDARY}` } };
    kpiHdr.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(row).height = 28;
    row++;

    // KPIs en 2 filas de 4 tarjetas cada una
    type KpiDef = { label: string; value: number | string; fmt: string };
    const kpiSets: KpiDef[][] = [
      [
        { label: 'Total Encuestas',      value: totalEncuestas,                                    fmt: '0'      },
        { label: 'Promedio Escala 1-10', value: promedioGlobal ?? 'N/A',                           fmt: '0.00'   },
        { label: 'NPS',                  value: gNps,                                              fmt: '0.00'   },
        { label: '% Satisfacción SI/NO', value: siNoTotal > 0 ? pctSatisfaccion / 100 : 'N/A',    fmt: '0.00%'  },
      ],
      [
        { label: 'Promotores (9-10)',    value: gPromo,         fmt: '0' },
        { label: 'Pasivos (7-8)',         value: gPasivos,       fmt: '0' },
        { label: 'Detractores (1-6)',     value: gDetrac,        fmt: '0' },
        { label: 'Total Comentarios',    value: totalComentarios, fmt: '0' },
      ],
    ];

    const colLetters = ['A', 'C', 'E', 'G'];
    for (const kpiSet of kpiSets) {
      const hRow = ws1.getRow(row);
      const vRow = ws1.getRow(row + 1);
      hRow.height = 20;
      vRow.height = 32;
      kpiSet.forEach((kpi, ci) => {
        const colL = colLetters[ci];
        const colR = String.fromCharCode(colL.charCodeAt(0) + 1);
        ws1.mergeCells(`${colL}${row}:${colR}${row}`);
        ws1.mergeCells(`${colL}${row + 1}:${colR}${row + 1}`);

        const lc = ws1.getCell(`${colL}${row}`);
        lc.value = kpi.label;
        lc.font  = { bold: true, size: 9, color: { argb: `FF${COLOR.PRIMARY}` } };
        lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.KPI_BG}` } };
        lc.alignment = { horizontal: 'center', vertical: 'middle' };
        lc.border = thinBorder();

        const vc = ws1.getCell(`${colL}${row + 1}`);
        vc.value = kpi.value;
        if (typeof kpi.value === 'number') vc.numFmt = kpi.fmt;
        vc.font  = { bold: true, size: 16, color: { argb: `FF${COLOR.PRIMARY}` } };
        vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        vc.alignment = { horizontal: 'center', vertical: 'middle' };
        vc.border = thinBorder();

        if (kpi.label === 'NPS' && typeof kpi.value === 'number')
          vc.fill = alertFill(kpi.value, 50, 0);
        if (kpi.label === 'Promedio Escala 1-10' && typeof kpi.value === 'number')
          vc.fill = alertFill(kpi.value, 8, 6);
      });
      row += 2;
    }
    row++;

    // Interpretación NPS
    ws1.mergeCells(`A${row}:H${row}`);
    const npsInterp = ws1.getCell(`A${row}`);
    npsInterp.value = `NPS: ${gNps.toFixed(2)}  —  ${npsLabel(gNps)}  |  Promotores ${pct(gPromo, allEscalaValores.length).toFixed(2)}% — Pasivos ${pct(gPasivos, allEscalaValores.length).toFixed(2)}% — Detractores ${pct(gDetrac, allEscalaValores.length).toFixed(2)}%`;
    npsInterp.font  = { italic: true, size: 10 };
    npsInterp.fill  = alertFill(gNps, 50, 0);
    npsInterp.alignment = { horizontal: 'center', vertical: 'middle' };
    npsInterp.border = thinBorder();
    ws1.getRow(row).height = 22;
    row += 2;

    // Resumen por área
    ws1.mergeCells(`A${row}:H${row}`);
    const areaSecH = ws1.getCell(`A${row}`);
    areaSecH.value = 'RESUMEN POR ÁREA';
    areaSecH.font  = { bold: true, size: 11, color: { argb: `FF${COLOR.HEADER_FG}` } };
    areaSecH.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.SECONDARY}` } };
    areaSecH.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(row).height = 24;
    row++;

    const areaHdrRow = ws1.getRow(row);
    areaHdrRow.values = ['Área', 'Total Encuestas', 'Promedio Escala', 'NPS', 'Interpretación NPS', '% Satisfacción SI/NO', 'Comentarios', ''];
    headerStyle(ws1, areaHdrRow, COLOR.ACCENT);
    row++;

    let areaIdx = 0;
    for (const [, a] of areasResumen) {
      const aPromedio = a.escalas.length > 0
        ? Math.round((a.escalas.reduce((s, v) => s + v, 0) / a.escalas.length) * 100) / 100 : null;
      const { nps: aNps } = calcNps(a.escalas, a.escalas.length);
      const aSiNoTotal = a.si + a.no;
      const aPctSat    = aSiNoTotal > 0 ? pct(a.si, aSiNoTotal) / 100 : null;

      const aRow = ws1.getRow(row);
      aRow.values = [a.nombre, a.total, aPromedio ?? 'N/A', aNps, npsLabel(aNps), aPctSat ?? 'N/A', a.comentarios, ''];
      if (aPctSat !== null) ws1.getCell(`F${row}`).numFmt = '0.00%';
      if (aPromedio !== null) ws1.getCell(`C${row}`).numFmt = '0.00';
      ws1.getCell(`D${row}`).numFmt = '0.00';

      const npsFill = alertFill(aNps, 50, 0);
      ws1.getCell(`D${row}`).fill = npsFill;

      zebraRow(aRow, areaIdx);
      aRow.height = 20;
      // Reaplicar color NPS después del zebra
      ws1.getCell(`D${row}`).fill = npsFill;
      areaIdx++;
      row++;
    }

    ws1.getColumn(1).width = 28; ws1.getColumn(2).width = 16;
    ws1.getColumn(3).width = 16; ws1.getColumn(4).width = 12;
    ws1.getColumn(5).width = 24; ws1.getColumn(6).width = 22;
    ws1.getColumn(7).width = 14; ws1.getColumn(8).width = 8;

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 2: DETALLE ENCUESTAS
    // ══════════════════════════════════════════════════════════════════════
    const ws2 = workbook.addWorksheet('Detalle Encuestas');
    ws2.properties.defaultRowHeight = 18;

    const detalleCols = [
      { header: 'ID',           key: 'id',          width: 8  },
      { header: 'Fecha',        key: 'fecha',        width: 13 },
      { header: 'Hora',         key: 'hora',         width: 10 },
      { header: 'Área',         key: 'area',         width: 25 },
      { header: 'Colaborador',  key: 'colaborador',  width: 26 },
      { header: 'Nombre Socio', key: 'nombreSocio',  width: 28 },
      { header: 'IP',           key: 'ip',           width: 16 },
      ...preguntas.map((p) => ({ header: p.texto, key: `p_${p.id}`, width: 28 })),
    ];
    ws2.columns = detalleCols;
    headerStyle(ws2, ws2.getRow(1), COLOR.PRIMARY);
    ws2.autoFilter = { from: 'A1', to: { row: 1, column: detalleCols.length } };
    ws2.views = [{ state: 'frozen', ySplit: 1 }];

    let detalleIdx = 0;
    for (const enc of encuestas) {
      const rowData: Record<string, string | number> = {
        id:          enc.id,
        fecha:       formatFechaDia(enc.fechaDia),
        hora:        formatHoraEcuador(enc.fechaEnvio),
        area:        enc.area.nombre,
        colaborador: enc.colaborador
          ? `${enc.colaborador.nombre} ${enc.colaborador.apellido}`.trim() : '',
        nombreSocio: enc.nombreSocio,
        ip:          enc.ipAddress,
      };
      for (const p of preguntas) {
        const resp = enc.respuestas.find((r) => r.preguntaId === p.id);
        if (!resp) rowData[`p_${p.id}`] = '';
        else if (resp.valorBooleano !== null && resp.valorBooleano !== undefined)
          rowData[`p_${p.id}`] = resp.valorBooleano ? 'Sí' : 'No';
        else if (resp.valorNumero !== null && resp.valorNumero !== undefined)
          rowData[`p_${p.id}`] = resp.valorNumero;
        else rowData[`p_${p.id}`] = resp.valorTexto ?? '';
      }

      const addedRow = ws2.addRow(rowData);
      zebraRow(addedRow, detalleIdx);

      // Color por escala 1-10 (aplicar después del zebra)
      for (const p of preguntas) {
        if (p.tipo === TipoPregunta.ESCALA_1_10) {
          const colIdx = detalleCols.findIndex((c) => c.key === `p_${p.id}`) + 1;
          const cell   = addedRow.getCell(colIdx);
          const val    = rowData[`p_${p.id}`];
          if (typeof val === 'number') {
            if      (val >= 9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.GREEN_BG}`  } };
            else if (val >= 7) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.YELLOW_BG}` } };
            else               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.RED_BG}`    } };
          }
        }
      }
      detalleIdx++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 3: DESEMPEÑO COLABORADORES
    // ══════════════════════════════════════════════════════════════════════
    const ws3 = workbook.addWorksheet('Desempeño Colaboradores');
    ws3.properties.defaultRowHeight = 18;

    const colabCols = [
      { header: 'Área',                  key: 'area',        width: 26 },
      { header: 'Colaborador',           key: 'colaborador', width: 26 },
      { header: 'Total Encuestas',       key: 'total',       width: 16 },
      { header: 'Promedio Escala',       key: 'promedio',    width: 16 },
      { header: 'NPS',                   key: 'nps',         width: 12 },
      { header: 'Interpretación NPS',    key: 'npsLbl',      width: 22 },
      { header: 'Promotores',            key: 'promotores',  width: 12 },
      { header: 'Pasivos',               key: 'pasivos',     width: 10 },
      { header: 'Detractores',           key: 'detractores', width: 12 },
      { header: '% Promotores',          key: 'pctPromo',    width: 14 },
      { header: '% Detractores',         key: 'pctDetrac',   width: 14 },
      { header: '% Satisfacción SI/NO',  key: 'pctSiNo',     width: 20 },
      { header: 'Resp. Sí',              key: 'siCount',     width: 10 },
      { header: 'Resp. No',              key: 'noCount',     width: 10 },
      { header: 'Comentarios',           key: 'comentarios', width: 13 },
    ];
    ws3.columns = colabCols;
    headerStyle(ws3, ws3.getRow(1), COLOR.PRIMARY);
    ws3.autoFilter = { from: 'A1', to: { row: 1, column: colabCols.length } };
    ws3.views = [{ state: 'frozen', ySplit: 1 }];

    let colabIdx = 0;
    for (const [, cs] of colabStatsMap) {
      const nEsc = cs.escalaValores.length;
      const prom = nEsc > 0
        ? Math.round((cs.escalaValores.reduce((a, b) => a + b, 0) / nEsc) * 100) / 100 : null;
      const { promotores, pasivos, detractores, nps: cNps } = calcNps(cs.escalaValores, nEsc);
      const siNoT   = cs.siCount + cs.noCount;
      const pctSiNo = siNoT > 0 ? pct(cs.siCount, siNoT) / 100 : null;

      const addedRow = ws3.addRow({
        area:        cs.areaNombre,
        colaborador: `${cs.nombre} ${cs.apellido}`.trim(),
        total:       cs.total,
        promedio:    prom ?? 'N/A',
        nps:         cNps,
        npsLbl:      npsLabel(cNps),
        promotores,
        pasivos,
        detractores,
        pctPromo:    nEsc > 0 ? pct(promotores, nEsc) / 100 : 'N/A',
        pctDetrac:   nEsc > 0 ? pct(detractores, nEsc) / 100 : 'N/A',
        pctSiNo:     pctSiNo ?? 'N/A',
        siCount:     cs.siCount,
        noCount:     cs.noCount,
        comentarios: cs.comentarios,
      });

      if (prom !== null) addedRow.getCell('D').numFmt = '0.00';
      addedRow.getCell('E').numFmt = '0.00';
      if (pctSiNo !== null)  { addedRow.getCell('L').numFmt = '0.00%'; }
      if (nEsc > 0) { addedRow.getCell('J').numFmt = '0.00%'; addedRow.getCell('K').numFmt = '0.00%'; }

      const npsFill = alertFill(cNps, 50, 0);
      zebraRow(addedRow, colabIdx);
      // Reaplicar color NPS después del zebra
      addedRow.getCell('E').fill = npsFill;
      colabIdx++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 4: ANÁLISIS PREGUNTAS
    // ══════════════════════════════════════════════════════════════════════
    const ws4 = workbook.addWorksheet('Análisis Preguntas');
    ws4.properties.defaultRowHeight = 18;

    const pregCols = [
      { header: 'Área',         key: 'area',        width: 24 },
      { header: 'Colaborador',  key: 'colab',       width: 24 },
      { header: 'Pregunta',     key: 'pregunta',    width: 40 },
      { header: 'Tipo',         key: 'tipo',        width: 14 },
      { header: 'Total Resp.',  key: 'total',       width: 12 },
      { header: 'Sí',           key: 'si',          width: 8  },
      { header: 'No',           key: 'no',          width: 8  },
      { header: '% Sí',         key: 'pctSi',       width: 10 },
      { header: '% No',         key: 'pctNo',       width: 10 },
      { header: 'Promedio',     key: 'promedio',    width: 11 },
      { header: 'Mínimo',       key: 'minimo',      width: 9  },
      { header: 'Máximo',       key: 'maximo',      width: 9  },
      { header: 'Detractores',  key: 'detractores', width: 13 },
      { header: 'Pasivos',      key: 'pasivos',     width: 10 },
      { header: 'Promotores',   key: 'promotores',  width: 12 },
      { header: '% Detrac.',    key: 'pctDetrac',   width: 11 },
      { header: '% Promo.',     key: 'pctPromo',    width: 11 },
      { header: 'NPS',          key: 'nps',         width: 12 },
      ...Array.from({ length: 10 }, (_, i) => ({ header: `Dist. ${i + 1}`, key: `dist${i + 1}`, width: 9 })),
    ];
    ws4.columns = pregCols;
    headerStyle(ws4, ws4.getRow(1), COLOR.PRIMARY);
    ws4.autoFilter = { from: 'A1', to: { row: 1, column: pregCols.length } };
    ws4.views = [{ state: 'frozen', ySplit: 1 }];

    let pregIdx = 0;
    for (const [, ps] of pregStatsMap) {
      const totalRespSiNo = ps.siCount + ps.noCount;
      const nEsc = ps.escalaValores.length;

      const distribucion: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) distribucion[`dist${i}`] = 0;
      for (const v of ps.escalaValores) distribucion[`dist${v}`] = (distribucion[`dist${v}`] ?? 0) + 1;

      const { promotores, pasivos, detractores, nps: pNps } = calcNps(ps.escalaValores, nEsc);
      const prom = nEsc > 0
        ? Math.round((ps.escalaValores.reduce((a, b) => a + b, 0) / nEsc) * 100) / 100 : null;

      const addedRow = ws4.addRow({
        area:        ps.areaNombre,
        colab:       ps.colaboradorNombre,
        pregunta:    ps.texto,
        tipo:        ps.tipo,
        total:       ps.tipo === TipoPregunta.SI_NO ? totalRespSiNo : nEsc,
        si:          ps.tipo === TipoPregunta.SI_NO ? ps.siCount : '',
        no:          ps.tipo === TipoPregunta.SI_NO ? ps.noCount : '',
        pctSi:       ps.tipo === TipoPregunta.SI_NO && totalRespSiNo > 0 ? pct(ps.siCount, totalRespSiNo) / 100 : '',
        pctNo:       ps.tipo === TipoPregunta.SI_NO && totalRespSiNo > 0 ? pct(ps.noCount, totalRespSiNo) / 100 : '',
        promedio:    prom ?? '',
        minimo:      nEsc > 0 ? Math.min(...ps.escalaValores) : '',
        maximo:      nEsc > 0 ? Math.max(...ps.escalaValores) : '',
        detractores: ps.tipo === TipoPregunta.ESCALA_1_10 ? detractores : '',
        pasivos:     ps.tipo === TipoPregunta.ESCALA_1_10 ? pasivos     : '',
        promotores:  ps.tipo === TipoPregunta.ESCALA_1_10 ? promotores  : '',
        pctDetrac:   ps.tipo === TipoPregunta.ESCALA_1_10 && nEsc > 0 ? pct(detractores, nEsc) / 100 : '',
        pctPromo:    ps.tipo === TipoPregunta.ESCALA_1_10 && nEsc > 0 ? pct(promotores,  nEsc) / 100 : '',
        nps:         ps.tipo === TipoPregunta.ESCALA_1_10 ? pNps : '',
        ...distribucion,
      });

      if (prom !== null) addedRow.getCell('J').numFmt = '0.00';

      // Colores y formatos (aplicar después del zebra)
      zebraRow(addedRow, pregIdx);

      if (ps.tipo === TipoPregunta.SI_NO && totalRespSiNo > 0) {
        addedRow.getCell('H').numFmt = '0.00%';
        addedRow.getCell('I').numFmt = '0.00%';
        const siVal   = pct(ps.siCount, totalRespSiNo);
        addedRow.getCell('H').fill = alertFill(siVal, 70, 50);
      }
      if (ps.tipo === TipoPregunta.ESCALA_1_10 && nEsc > 0) {
        addedRow.getCell('Q').numFmt = '0.00%';
        addedRow.getCell('R').numFmt = '0.00%';
        addedRow.getCell('R').numFmt = '0.00';
        addedRow.getCell('R').fill  = alertFill(pNps, 50, 0);
      }
      pregIdx++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 5: COMENTARIOS
    // ══════════════════════════════════════════════════════════════════════
    const ws5 = workbook.addWorksheet('Comentarios');
    ws5.properties.defaultRowHeight = 18;

    const comentCols = [
      { header: 'Fecha',         key: 'fecha',         width: 13 },
      { header: 'Hora',          key: 'hora',          width: 10 },
      { header: 'Área',          key: 'area',          width: 24 },
      { header: 'Colaborador',   key: 'colaborador',   width: 24 },
      { header: 'Nombre Socio',  key: 'nombreSocio',   width: 26 },
      { header: 'Comentario',    key: 'texto',         width: 60 },
      { header: 'Escala 1-10',   key: 'escala',        width: 12 },
      { header: 'Clasificación', key: 'clasificacion', width: 14 },
    ];
    ws5.columns = comentCols;
    headerStyle(ws5, ws5.getRow(1), COLOR.PRIMARY);
    ws5.autoFilter = { from: 'A1', to: { row: 1, column: comentCols.length } };
    ws5.views = [{ state: 'frozen', ySplit: 1 }];

    const comentariosOrdenados = [...comentarios].sort((a, b) => b.fecha.localeCompare(a.fecha));
    let comentIdx = 0;
    for (const c of comentariosOrdenados) {
      const addedRow = ws5.addRow({
        fecha:         c.fecha,
        hora:          c.hora,
        area:          c.area,
        colaborador:   c.colaborador,
        nombreSocio:   c.nombreSocio,
        texto:         c.texto,
        escala:        c.escala ?? '',
        clasificacion: c.clasificacion,
      });
      addedRow.height = 40;

      // Primero zebra, luego colores de escala para que no se sobreescriban
      zebraRow(addedRow, comentIdx);
      addedRow.getCell('F').alignment = { wrapText: true, vertical: 'top' };

      if (c.escala !== null) {
        const eF =
          c.escala >= 9 ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${COLOR.GREEN_BG}` } }
          : c.escala >= 7 ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${COLOR.YELLOW_BG}` } }
          : { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${COLOR.RED_BG}` } };
        addedRow.getCell('G').fill = eF;
        addedRow.getCell('H').fill = eF;
      }
      comentIdx++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 6: DATOS PARA GRÁFICOS
    // ══════════════════════════════════════════════════════════════════════
    const ws6 = workbook.addWorksheet('Datos para Gráficos');
    ws6.properties.defaultRowHeight = 18;
    ws6.getColumn(1).width = 28; ws6.getColumn(2).width = 14;
    ws6.getColumn(3).width = 14; ws6.getColumn(4).width = 14;
    ws6.getColumn(5).width = 14;

    let g = 1;

    const addGrafTitle = (title: string) => {
      ws6.mergeCells(`A${g}:E${g}`);
      const cell = ws6.getCell(`A${g}`);
      cell.value = title;
      cell.font  = { bold: true, size: 11, color: { argb: `FF${COLOR.HEADER_FG}` } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.SECONDARY}` } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder();
      ws6.getRow(g).height = 24;
      g++;
    };

    const addGrafHeader = (...cols: string[]) => {
      const r = ws6.getRow(g);
      r.values = cols;
      r.eachCell((cell, ci) => {
        if (ci <= cols.length) {
          cell.font  = { bold: true, size: 10, color: { argb: `FF${COLOR.HEADER_FG}` } };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.ACCENT}` } };
          cell.border = thinBorder();
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
      ws6.getRow(g).height = 22;
      g++;
    };

    const addGrafRow = (...values: (string | number)[]) => {
      const r = ws6.addRow(values);
      r.eachCell((c) => { c.border = thinBorder(); c.alignment = { horizontal: 'center', vertical: 'middle' }; });
      g++;
      return r;
    };

    // 1. Distribución NPS Global
    addGrafTitle('1. Distribución NPS Global  (NPS = ' + gNps.toFixed(2) + ' — ' + npsLabel(gNps) + ')');
    addGrafHeader('Categoría', 'Cantidad', '% del Total');
    addGrafRow('Promotores (9-10)', gPromo, allEscalaValores.length > 0 ? pct(gPromo, allEscalaValores.length) / 100 : 0);
    ws6.getCell(`C${g - 1}`).numFmt = '0.00%';
    addGrafRow('Pasivos (7-8)', gPasivos, allEscalaValores.length > 0 ? pct(gPasivos, allEscalaValores.length) / 100 : 0);
    ws6.getCell(`C${g - 1}`).numFmt = '0.00%';
    addGrafRow('Detractores (1-6)', gDetrac, allEscalaValores.length > 0 ? pct(gDetrac, allEscalaValores.length) / 100 : 0);
    ws6.getCell(`C${g - 1}`).numFmt = '0.00%';
    g++;

    // 2. Distribución escala 1-10
    addGrafTitle('2. Distribución Escala 1-10');
    addGrafHeader('Valor', 'Cantidad', '% del Total');
    const distGlobal: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) distGlobal[i] = 0;
    for (const v of allEscalaValores) distGlobal[v] = (distGlobal[v] ?? 0) + 1;
    for (let i = 1; i <= 10; i++) {
      addGrafRow(i, distGlobal[i], allEscalaValores.length > 0 ? pct(distGlobal[i], allEscalaValores.length) / 100 : 0);
      ws6.getCell(`C${g - 1}`).numFmt = '0.00%';
    }
    g++;

    // 3. Satisfacción SI/NO Global
    addGrafTitle('3. Satisfacción SI/NO Global');
    addGrafHeader('Respuesta', 'Cantidad', '% del Total');
    addGrafRow('Sí', allSiNo.si, siNoTotal > 0 ? pct(allSiNo.si, siNoTotal) / 100 : 0);
    ws6.getCell(`C${g - 1}`).numFmt = '0.00%';
    addGrafRow('No', allSiNo.no, siNoTotal > 0 ? pct(allSiNo.no, siNoTotal) / 100 : 0);
    ws6.getCell(`C${g - 1}`).numFmt = '0.00%';
    g++;

    // 4. Encuestas por colaborador
    addGrafTitle('4. Encuestas por Colaborador');
    addGrafHeader('Colaborador', 'Total Encuestas', 'Promedio Escala', 'NPS');
    for (const [, cs] of colabStatsMap) {
      const nEsc = cs.escalaValores.length;
      const prom = nEsc > 0
        ? Math.round((cs.escalaValores.reduce((a, b) => a + b, 0) / nEsc) * 100) / 100 : null;
      const { nps: cNps } = calcNps(cs.escalaValores, nEsc);
      const r = addGrafRow(`${cs.nombre} ${cs.apellido}`.trim(), cs.total, prom ?? 'N/A', cNps);
      if (prom !== null) r.getCell(3).numFmt = '0.00';
      r.getCell(4).numFmt = '0.00';
    }
    g++;

    // 5. Encuestas por área
    addGrafTitle('5. Encuestas por Área');
    addGrafHeader('Área', 'Total Encuestas', 'Promedio Escala', 'NPS');
    for (const [, a] of areasResumen) {
      const prom = a.escalas.length > 0
        ? Math.round((a.escalas.reduce((s, v) => s + v, 0) / a.escalas.length) * 100) / 100 : null;
      const { nps: aNps } = calcNps(a.escalas, a.escalas.length);
      const r = addGrafRow(a.nombre, a.total, prom ?? 'N/A', aNps);
      if (prom !== null) r.getCell(3).numFmt = '0.00';
      r.getCell(4).numFmt = '0.00';
    }
    g++;

    // 6. Encuestas por fecha
    addGrafTitle('6. Encuestas por Fecha');
    addGrafHeader('Fecha', 'Total Encuestas');
    const fechasOrdenadas = Array.from(porFechaMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [fecha, total] of fechasOrdenadas) {
      addGrafRow(fecha, total);
    }

    // ── Respuesta HTTP ─────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-encuestas.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}
