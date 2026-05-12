import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RespuestaItemDto {
  @IsInt()
  preguntaId: number;

  @IsOptional()
  @IsBoolean()
  valorBooleano?: boolean;

  @IsOptional()
  @IsString()
  valorTexto?: string;
}

export class SubmitEncuestaDto {
  @IsInt()
  areaId: number;

  @IsOptional()
  @IsInt()
  colaboradorId?: number;

  @IsString()
  nombreSocio: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespuestaItemDto)
  respuestas: RespuestaItemDto[];
}
