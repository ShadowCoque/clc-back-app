# CLAUDE.md

## Proyecto

Backend NestJS + Prisma + PostgreSQL para encuestas de satisfacción del Club Social y Deportivo La Campiña.

El sistema permite:
- Mostrar formularios públicos por área mediante slug/QR.
- Registrar encuestas de socios.
- Administrar áreas, colaboradores y preguntas.
- Autenticar usuarios administrativos con JWT.
- Consultar reportes y exportarlos a Excel.

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
- `Encuesta`
- `Respuesta`
- `Usuario`

Enums:

- `TipoPregunta`: `SI_NO`, `DESCRIPCION`, `NOMBRE_SOCIO`
- `RolUsuario`: `ADMIN`, `GERENTE`, `REPORTES`

No existe `RateLimitLog`. No crearlo ni usarlo.

El control de 1 encuesta por IP/área/día se hace consultando `Encuesta` con:

- `ipAddress`
- `areaId`
- rango diario de `fechaEnvio`

## Datos iniciales del seed

Áreas activas:

- Alimentos y Bebidas — `alimentos-bebidas`
- Área Comercial — `area-comercial`
- Área de Socios — `area-socios`
- Áreas Húmedas — `areas-humedas`
- Cafetería — `cafeteria`

Colaboradores:

- Alimentos y Bebidas: Aracely Frias
- Área Comercial: Silvia Medina, Viviana Anrango
- Área de Socios: Michelle Donoso
- Áreas Húmedas: Lorena Peralta
- Cafetería: Juan Carlos

Preguntas iniciales por área:

1. ¿Fue atendido de manera cordial y oportuna? — `SI_NO`
2. ¿Su solicitud o requerimiento fue resuelto adecuadamente? — `SI_NO`
3. ¿El espacio o instalaciones estuvieron en buenas condiciones? — `SI_NO`
4. ¿Su experiencia general cumplió con sus expectativas? — `SI_NO`
5. Cuéntenos brevemente en qué podríamos mejorar o qué le agradó. — `DESCRIPCION`
6. Nombres y apellidos del socio — `NOMBRE_SOCIO`

Usuarios seed:

- `soporte.ti@clublacampina.com.ec` — `ADMIN`
- `gerencia@clublacampina.com.ec` — `REPORTES`
- `administracion@clublacampina.com.ec` — `REPORTES`

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

No usar mocks ni arrays hardcodeados como fuente de datos.

Cada servicio debe usar `PrismaService`.

Usar errores HTTP correctos:

- `BadRequestException`
- `UnauthorizedException`
- `ForbiddenException`
- `NotFoundException`
- `ConflictException`
- `TooManyRequestsException` o `HttpException` con status 429

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

Roles:

- `ADMIN`: administración.
- `REPORTES`: consulta/exportación.
- Endpoints públicos no requieren JWT.
- Reportes requieren JWT.

## Rate limit de encuestas

No usar `RateLimitLog`.

En `POST /encuestas`:

1. Obtener IP desde request.
2. Calcular inicio y fin del día actual.
3. Buscar si existe encuesta con misma `ipAddress`, `areaId` y `fechaEnvio` dentro del día.
4. Si existe, responder 429: `Ya enviaste una encuesta para esta área hoy.`
5. Si no existe, guardar encuesta y respuestas en transacción Prisma.

## Calidad esperada

Antes de terminar:

- Verificar imports.
- Verificar módulos registrados.
- Verificar DTOs.
- Verificar guards/decoradores.
- Verificar que compile con `npm run build`.
- No ejecutar comandos destructivos de base de datos.
- No cambiar migraciones manualmente.