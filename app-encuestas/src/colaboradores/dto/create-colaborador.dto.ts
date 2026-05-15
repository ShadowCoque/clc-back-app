import { IsString, IsInt, IsDefined, IsNotEmpty, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateColaboradorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido: string;

  @IsDefined({ message: 'Debe seleccionar un área para el colaborador.' })
  @Type(() => Number)
  @IsInt({ message: 'Debe seleccionar un área para el colaborador.' })
  @Min(1, { message: 'Debe seleccionar un área para el colaborador.' })
  areaId: number;
}
