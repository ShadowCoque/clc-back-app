import { IsString, IsInt, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPregunta } from '@prisma/client';

export class CreatePreguntaDto {
  @Type(() => Number)
  @IsInt()
  areaId: number;

  @IsString()
  texto: string;

  @IsEnum(TipoPregunta)
  tipo: TipoPregunta;

  @Type(() => Number)
  @IsInt()
  orden: number;

  @IsOptional()
  @IsBoolean()
  obligatoria?: boolean;
}
