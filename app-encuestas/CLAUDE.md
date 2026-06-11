# CLAUDE.md

## Proyecto

Backend NestJS + Prisma + PostgreSQL para encuestas de satisfacción del Club Social y Deportivo La Campiña.

El sistema permite:
- Mostrar formularios públicos por área mediante slug/QR.
- Registrar encuestas de socios.
- Administrar áreas, colaboradores y preguntas.
- Autenticar usuarios administrativos con JWT.
- Consultar reportes y exportarlos a Excel.

Frontend (repo aparte): https://github.com/ShadowCoque/clc-front-app — React + Vite, código en `app-encuestas/`.

## Reglas de contexto

Antes de generar o modificar código, lee solo archivos necesarios:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `package.json`
- `src/app.module.ts`
- `src/main.ts`
- `tsconfig.json`
- `tsconfig.build.json`

No leas ni analices salvo necesidad real:

- `node_modules/`
- `dist/`
- `prisma/migrations/`
- `package-lock.json`
- `.env`
- archivos grandes o generados

No modificar `schema.prisma`, `seed.ts`, `.env` ni `prisma.config.ts` salvo que la tarea lo pida o sea estrictamente necesario. Explica antes el motivo.

## Base de datos actual

Fuente real: `prisma/schema.prisma`.

Modelos principales:

- `Area`
- `Colaborador`
- `Pregunta`
- `Encuesta` (incluye `nombreSocio`, `ipAddress`, `fechaEnvio` y `fechaDia` tipo Date)
- `Respuesta` (`valorBooleano`, `valorTexto`, `valorNumero`)
- `Usuario`

Enums:

- `TipoPregunta`: `SI_NO`, `DESCRIPCION`, `NOMBRE_SOCIO`, `ESCALA_1_10`
- `RolUsuario`: `ADMIN`, `GERENTE`, `REPORTES`

No existe `RateLimitLog`. No crearlo ni usarlo.

## Datos iniciales del seed

Áreas activas (no existe Cafetería):

- Alimentos y Bebidas — `alimentos-bebidas`
- Área Comercial — `area-comercial`
- Área de Socios — `area-socios`
- Áreas Húmedas — `areas-humedas`

Colaboradores:

- Alimentos y Bebidas: Aracely Frias
- Área Comercial: Silvia Medina, Viviana Anrango
- Área de Socios: Michelle Donoso
- Áreas Húmedas: Lorena Peralta (inactiva por defecto)

Preguntas por área — genéricas (órdenes 1, 2, 3, 7, 8, 9):

1. ¿Fue atendido de manera cordial y oportuna? — `SI_NO`
2. ¿Su solicitud o requerimiento fue resuelto adecuadamente? — `SI_NO`
3. ¿Su experiencia general cumplió con sus expectativas? — `SI_NO`
7. ¿Qué tan probable es que recomiende el club? — `ESCALA_1_10`
8. Cuéntenos brevemente en qué podríamos mejorar o qué le agradó. — `DESCRIPCION` (opcional)
9. Nombres y apellidos del socio — `NOMBRE_SOCIO`

Más 3 preguntas `SI_NO` específicas por área en los órdenes 4, 5 y 6 (ver `prisma/seed.ts`).

Usuarios seed:

- `soporte.ti@clublacampina.com.ec` — `ADMIN`
- `gerencia@clublacampina.com.ec` — `GERENTE`
- `administracion@clublacampina.com.ec` — `ADMIN`
- `recursoshumanos@clublacampina.com.ec` — `ADMIN`

No hardcodear contraseñas en código nuevo.

## Convenciones de backend

Usar NestJS con TypeScript.

Usar:
- DTOs con `class-validator` y `class-transformer`
- `PrismaService` para acceso a datos
- JWT con Passport
- `bcryptjs` para validar contraseñas
- Guards para JWT y roles
- `exceljs` para exportación Excel
- `compression` (gzip) aplicado globalmente en `main.ts`
- En reportes, las preguntas se cargan una sola vez y se consultan vía `Map`
  (`preguntaPorId`); no volver a hacer `include { pregunta }` por respuesta.
- Endpoints públicos GET (áreas, preguntas) responden con
  `Cache-Control: public, max-age=60`.
- `main.ts` escucha en `process.env.HOST` (fallback `192.168.2.91`) y
  `process.env.PORT` (fallback 3000).

No usar mocks ni arrays hardcodeados como fuente de datos.

Cada servicio debe usar `PrismaService`.

Usar errores HTTP correctos:

- `BadRequestException`
- `UnauthorizedException`
- `ForbiddenException`
- `NotFoundException`
- `ConflictException`
- `HttpException` con status 429 si se necesita Too Many Requests

`isolatedModules` está activo: tipos de Express en firmas decoradas (`@Req()`, `@Res()`) deben importarse con `import type`.

## Reglas funcionales

Soft delete:

- `Area.activa = false`
- `Colaborador.activo = false`
- `Pregunta.activa = false`

Nunca borrar físicamente colaboradores o preguntas desde endpoints normales.

Formularios públicos:

- Solo mostrar áreas activas.
- Solo mostrar preguntas activas.
- Solo mostrar colaboradores activos.

Panel admin:

- Puede listar colaboradores inactivos.
- Puede listar preguntas inactivas si el endpoint lo requiere.

Roles y guards (estado real del código):

- Mutaciones de áreas/colaboradores/preguntas: `JwtAuthGuard` + `@Roles(ADMIN)`.
- Reportes (`/api/reportes/*`): solo `JwtAuthGuard` (cualquier rol autenticado).
- Endpoints públicos (GET áreas/preguntas, POST encuestas, login) no requieren JWT.

## Rate limit y `ipAddress`

No existe límite de 1 encuesta por IP/área/día: se desactivó a propósito porque
varios socios comparten IP pública por NAT. `ipAddress` se guarda solo para
auditoría. No reintroducir ese límite sin que la tarea lo pida.

No hay rate limiting activo: `@nestjs/throttler` se desinstaló porque estaba
configurado sin guard y no limitaba nada. Si se necesita en el futuro (p. ej.
anti fuerza bruta en login), reinstalarlo y aplicar un guard puntual.

## Nombre del socio (defensa del servidor)

El servidor no confía en `dto.nombreSocio`. En `POST /encuestas`
(`EncuestasService.resolverNombreSocio`): si llega vacío o "Anónimo" (con o sin
tilde, cualquier capitalización), el nombre se recupera de la respuesta a la
pregunta `NOMBRE_SOCIO` o, en su defecto, de una `DESCRIPCION` cuyo enunciado
pida el nombre del socio. Heurística compartida en
`src/common/utils/nombre-socio.util.ts`; debe mantenerse sincronizada con
`src/utils/preguntaNombre.ts` del frontend.

Validación de texto: una respuesta de solo espacios cuenta como vacía
(`valorTexto.trim()`); todo `valorTexto` se guarda con trim.

Script one-off de reparación de encuestas "Anónimo" históricas:
`npm run reparar:anonimos:dry` para previsualizar sin escribir, y
`npm run reparar:anonimos` para aplicar.

## Build y ejecución

- `npm run build` emite a `dist/` con entry `dist/main.js`. `prisma/` y
  `prisma.config.ts` están excluidos en `tsconfig.build.json` porque corren con
  `ts-node`/CLI de Prisma; no los agregues de vuelta al build.
- Producción: `npm run build` y luego `npm run start:prod` (`node dist/main`).
- Desarrollo: `npm run start:dev`.
- Seed: `npm run seed`.

## Calidad esperada

Antes de terminar:

- Verificar imports.
- Verificar módulos registrados.
- Verificar DTOs.
- Verificar guards/decoradores.
- Verificar que compile con `npm run build`.
- No ejecutar comandos destructivos de base de datos.
- No cambiar migraciones manualmente.
