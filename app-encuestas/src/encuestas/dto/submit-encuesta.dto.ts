import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
  Min,
  Max,
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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  valorNumero?: number;
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
