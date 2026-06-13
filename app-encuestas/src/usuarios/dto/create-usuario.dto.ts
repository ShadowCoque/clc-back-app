import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '@prisma/client';

// Solo se gestionan estos dos roles desde el panel.
export const ROLES_GESTIONABLES: RolUsuario[] = [
  RolUsuario.ADMIN,
  RolUsuario.REPORTES,
];

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsIn(ROLES_GESTIONABLES)
  rol: RolUsuario;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // límite de bytes que hashea bcrypt
  password: string;

  // Áreas permitidas (solo aplica a REPORTES). Vacío = sin restricción.
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  areasIds?: number[];
}
