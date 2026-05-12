import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResumenQueryDto } from './dto/resumen-query.dto';
import { EncuestasQueryDto } from './dto/encuestas-query.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('resumen')
  getResumen(@Query() query: ResumenQueryDto) {
    return this.reportesService.getResumen(query);
  }

  @Get('encuestas')
  getEncuestas(@Query() query: EncuestasQueryDto) {
    return this.reportesService.getEncuestas(query);
  }

  @Get('exportar')
  exportar(@Query() query: EncuestasQueryDto, @Res() res: Response) {
    return this.reportesService.exportarExcel(query, res);
  }
}
