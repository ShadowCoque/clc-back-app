import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const BCRYPT_ROUNDS = 10;

// Nunca exponer passwordHash hacia afuera.
const usuarioSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  areasPermitidas: { select: { areaId: true } },
} satisfies Prisma.UsuarioSelect;

type UsuarioRow = Prisma.UsuarioGetPayload<{ select: typeof usuarioSelect }>;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  // Aplana areasPermitidas -> number[] para la respuesta.
  private toResponse(u: UsuarioRow) {
    const { areasPermitidas, ...rest } = u;
    return { ...rest, areasPermitidas: areasPermitidas.map((a) => a.areaId) };
  }

  // Los ADMIN no se restringen por área; las áreas solo aplican a REPORTES.
  private normalizeAreas(rol: RolUsuario, areasIds?: number[]): number[] {
    if (rol === RolUsuario.ADMIN) return [];
    return Array.from(new Set(areasIds ?? []));
  }

  private async assertAreasExisten(areasIds: number[]): Promise<void> {
    if (areasIds.length === 0) return;
    const encontradas = await this.prisma.area.count({
      where: { id: { in: areasIds } },
    });
    if (encontradas !== areasIds.length) {
      throw new BadRequestException('Una o más áreas seleccionadas no existen.');
    }
  }

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      select: usuarioSelect,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });
    return usuarios.map((u) => this.toResponse(u));
  }

  async create(dto: CreateUsuarioDto) {
    const emailExiste = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (emailExiste) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    const areas = this.normalizeAreas(dto.rol, dto.areasIds);
    await this.assertAreasExisten(areas);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        email: dto.email.trim(),
        rol: dto.rol,
        passwordHash,
        areasPermitidas: {
          create: areas.map((areaId) => ({ areaId })),
        },
      },
      select: usuarioSelect,
    });
    return this.toResponse(usuario);
  }

  async update(id: number, dto: UpdateUsuarioDto, currentUserId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, rol: true, activo: true },
    });
    if (!usuario) throw new NotFoundException(`Usuario no encontrado: ${id}`);

    const quedaInactivo = dto.activo === false && usuario.activo;
    const dejaDeSerAdmin =
      dto.rol !== undefined &&
      dto.rol !== RolUsuario.ADMIN &&
      usuario.rol === RolUsuario.ADMIN;

    // No permitir auto-bloqueo.
    if (id === currentUserId && (quedaInactivo || dejaDeSerAdmin)) {
      throw new ForbiddenException(
        'No puede quitarse a sí mismo el rol ADMIN ni desactivar su propia cuenta.',
      );
    }

    // No dejar al sistema sin ningún ADMIN activo.
    if (quedaInactivo || dejaDeSerAdmin) {
      await this.assertNoEsUltimoAdmin(id);
    }

    // El rol resultante define si se conservan/borran las áreas.
    const rolFinal = dto.rol ?? usuario.rol;
    const data: Prisma.UsuarioUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.rol !== undefined) data.rol = dto.rol;
    if (dto.activo !== undefined) data.activo = dto.activo;

    // Reemplazar áreas si vienen en el dto, o si el usuario pasó a ADMIN.
    let nuevasAreas: number[] | undefined;
    if (dto.areasIds !== undefined || rolFinal === RolUsuario.ADMIN) {
      nuevasAreas = this.normalizeAreas(rolFinal, dto.areasIds);
      await this.assertAreasExisten(nuevasAreas);
    }

    const actualizado = await this.prisma.$transaction(async (tx) => {
      if (nuevasAreas !== undefined) {
        await tx.usuarioArea.deleteMany({ where: { usuarioId: id } });
        if (nuevasAreas.length > 0) {
          await tx.usuarioArea.createMany({
            data: nuevasAreas.map((areaId) => ({ usuarioId: id, areaId })),
          });
        }
      }
      return tx.usuario.update({
        where: { id },
        data,
        select: usuarioSelect,
      });
    });

    return this.toResponse(actualizado);
  }

  async changePassword(id: number, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException(`Usuario no encontrado: ${id}`);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash },
    });
    return { ok: true };
  }

  // Evita quedarse sin ningún ADMIN activo en el sistema.
  private async assertNoEsUltimoAdmin(id: number): Promise<void> {
    const otrosAdmins = await this.prisma.usuario.count({
      where: { rol: RolUsuario.ADMIN, activo: true, id: { not: id } },
    });
    if (otrosAdmins === 0) {
      throw new BadRequestException(
        'No puede quedar el sistema sin ningún administrador activo.',
      );
    }
  }
}
