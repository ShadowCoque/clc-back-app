import { IsString, IsInt, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPregunta } from '@prisma/client';

export class UpdatePreguntaDto {
  @IsOptional()
  @IsString()
  texto?: string;

  @IsOptional()
  @IsEnum(TipoPregunta)
  tipo?: TipoPregunta;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  obligatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
