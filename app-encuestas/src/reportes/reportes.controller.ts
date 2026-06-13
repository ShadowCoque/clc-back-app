import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { ResumenQueryDto } from './dto/resumen-query.dto';
import { EncuestasQueryDto } from './dto/encuestas-query.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('resumen')
  getResumen(@Query() query: ResumenQueryDto, @CurrentUser() user: AuthUser) {
    return this.reportesService.getResumen(query, user.areas);
  }

  @Get('encuestas')
  getEncuestas(@Query() query: EncuestasQueryDto, @CurrentUser() user: AuthUser) {
    return this.reportesService.getEncuestas(query, user.areas);
  }

  @Get('exportar')
  exportar(
    @Query() query: EncuestasQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    return this.reportesService.exportarExcel(query, res, user.areas);
  }
}
