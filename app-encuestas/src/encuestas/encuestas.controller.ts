import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { EncuestasService } from './encuestas.service';
import { SubmitEncuestaDto } from './dto/submit-encuesta.dto';

@Controller('encuestas')
export class EncuestasController {
  constructor(private encuestasService: EncuestasService) {}

  @Post()
  submit(@Body() dto: SubmitEncuestaDto, @Req() req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
        ?.split(',')[0]
        ?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';
    return this.encuestasService.submit(dto, ip);
  }
}
