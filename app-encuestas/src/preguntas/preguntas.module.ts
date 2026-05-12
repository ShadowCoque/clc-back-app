import { Module } from '@nestjs/common';
import { PreguntasController } from './preguntas.controller';
import { PreguntasService } from './preguntas.service';

@Module({
  controllers: [PreguntasController],
  providers: [PreguntasService],
})
export class PreguntasModule {}
