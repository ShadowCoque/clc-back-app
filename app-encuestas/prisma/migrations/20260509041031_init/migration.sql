-- CreateEnum
CREATE TYPE "TipoPregunta" AS ENUM ('SI_NO', 'DESCRIPCION', 'NOMBRE_SOCIO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'GERENTE', 'REPORTES');

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "areaId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoPregunta" NOT NULL,
    "orden" INTEGER NOT NULL,
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encuesta" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "colaboradorId" INTEGER,
    "nombreSocio" VARCHAR(150) NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respuesta" (
    "id" SERIAL NOT NULL,
    "encuestaId" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "valorBooleano" BOOLEAN,
    "valorTexto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_nombre_key" ON "Area"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Area_slug_key" ON "Area"("slug");

-- CreateIndex
CREATE INDEX "Colaborador_areaId_idx" ON "Colaborador"("areaId");

-- CreateIndex
CREATE INDEX "Colaborador_activo_idx" ON "Colaborador"("activo");

-- CreateIndex
CREATE INDEX "Pregunta_areaId_idx" ON "Pregunta"("areaId");

-- CreateIndex
CREATE INDEX "Pregunta_activa_idx" ON "Pregunta"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "Pregunta_areaId_orden_key" ON "Pregunta"("areaId", "orden");

-- CreateIndex
CREATE INDEX "Encuesta_areaId_idx" ON "Encuesta"("areaId");

-- CreateIndex
CREATE INDEX "Encuesta_colaboradorId_idx" ON "Encuesta"("colaboradorId");

-- CreateIndex
CREATE INDEX "Encuesta_fechaEnvio_idx" ON "Encuesta"("fechaEnvio");

-- CreateIndex
CREATE INDEX "Encuesta_ipAddress_idx" ON "Encuesta"("ipAddress");

-- CreateIndex
CREATE INDEX "Encuesta_areaId_fechaEnvio_idx" ON "Encuesta"("areaId", "fechaEnvio");

-- CreateIndex
CREATE INDEX "Encuesta_colaboradorId_fechaEnvio_idx" ON "Encuesta"("colaboradorId", "fechaEnvio");

-- CreateIndex
CREATE INDEX "Encuesta_ipAddress_areaId_fechaEnvio_idx" ON "Encuesta"("ipAddress", "areaId", "fechaEnvio");

-- CreateIndex
CREATE INDEX "Respuesta_encuestaId_idx" ON "Respuesta"("encuestaId");

-- CreateIndex
CREATE INDEX "Respuesta_preguntaId_idx" ON "Respuesta"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "Respuesta_encuestaId_preguntaId_key" ON "Respuesta"("encuestaId", "preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuesta" ADD CONSTRAINT "Encuesta_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuesta" ADD CONSTRAINT "Encuesta_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_encuestaId_fkey" FOREIGN KEY ("encuestaId") REFERENCES "Encuesta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
