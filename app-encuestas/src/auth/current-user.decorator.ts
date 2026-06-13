import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RolUsuario } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  rol: RolUsuario;
  /** Áreas a las que el usuario está limitado. Vacío = sin restricción. */
  areas: number[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
