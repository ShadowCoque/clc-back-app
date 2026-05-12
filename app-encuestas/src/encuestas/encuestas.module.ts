import { Module } from '@nestjs/common';
import { EncuestasController } from './encuestas.controller';
import { EncuestasService } from './encuestas.service';

@Module({
  controllers: [EncuestasController],
  providers: [EncuestasService],
})
export class EncuestasModule {}
