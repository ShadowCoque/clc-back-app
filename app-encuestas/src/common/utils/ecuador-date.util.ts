import { BadRequestException } from '@nestjs/common';

const TZ = 'America/Guayaquil';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getEcuadorDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: parseInt(parts.find((p) => p.type === 'year')!.value, 10),
    month: parseInt(parts.find((p) => p.type === 'month')!.value, 10),
    day: parseInt(parts.find((p) => p.type === 'day')!.value, 10),
  };
}

/** Retorna la fecha local Ecuador de ahora como Date UTC-midnight (para @db.Date). */
export function getEcuadorTodayForDb(): Date {
  const { year, month, day } = getEcuadorDateParts(new Date());
  return new Date(Date.UTC(year, month - 1, day));
}

/** Convierte un string YYYY-MM-DD a Date UTC-midnight (para @db.Date). Lanza BadRequestException si el formato es inválido. */
export function dateStringToDbDate(dateStr: string): Date {
  if (!DATE_RE.test(dateStr)) {
    throw new BadRequestException(`Formato de fecha inválido: "${dateStr}". Use YYYY-MM-DD.`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Construye el filtro Prisma para fechaDia a partir de strings YYYY-MM-DD opcionales. */
export function buildFechaDiaFilter(
  fechaDesde?: string,
  fechaHasta?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!fechaDesde && !fechaHasta) return undefined;

  const gte = fechaDesde ? dateStringToDbDate(fechaDesde) : undefined;
  const lte = fechaHasta ? dateStringToDbDate(fechaHasta) : undefined;

  if (gte && lte && gte > lte) {
    throw new BadRequestException('fechaDesde no puede ser mayor que fechaHasta.');
  }

  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

/** Formatea fecha/hora de un timestamp UTC al horario Ecuador para Excel o reportes. */
export function formatEcuadorDateTime(date: Date): { fecha: string; hora: string } {
  return {
    fecha: new Intl.DateTimeFormat('es-EC', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
    hora: new Intl.DateTimeFormat('es-EC', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date),
  };
}
