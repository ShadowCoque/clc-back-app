import { IsString, IsInt, IsBoolean, IsOptional, MaxLength, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateColaboradorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El área seleccionada no es válida.' })
  @Min(1, { message: 'El área seleccionada no es válida.' })
  areaId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
