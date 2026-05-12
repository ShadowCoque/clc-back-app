import { IsString, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateColaboradorDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(100)
  apellido: string;

  @Type(() => Number)
  @IsInt()
  areaId: number;
}
