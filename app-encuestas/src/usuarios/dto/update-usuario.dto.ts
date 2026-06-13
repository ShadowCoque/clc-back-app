import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '@prisma/client';
import { ROLES_GESTIONABLES } from './create-usuario.dto';

// El email no es editable a propósito.
export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsIn(ROLES_GESTIONABLES)
  rol?: RolUsuario;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  areasIds?: number[];
}
