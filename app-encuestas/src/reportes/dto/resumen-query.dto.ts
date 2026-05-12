import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ResumenQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  areaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  colaboradorId?: number;

  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @IsOptional()
  @IsString()
  fechaHasta?: string;
}
