import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ResumenQueryDto } from './resumen-query.dto';

export class EncuestasQueryDto extends ResumenQueryDto {
  @IsOptional()
  @IsString()
  nombreSocio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
