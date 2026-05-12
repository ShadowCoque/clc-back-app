/*
  Warnings:

  - Added the required column `fechaDia` to the `Encuesta` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Encuesta_ipAddress_areaId_fechaEnvio_idx";

-- AlterTable
ALTER TABLE "Encuesta" ADD COLUMN     "fechaDia" DATE NOT NULL;

-- CreateIndex
CREATE INDEX "Encuesta_fechaDia_idx" ON "Encuesta"("fechaDia");

-- CreateIndex
CREATE INDEX "Encuesta_areaId_fechaDia_idx" ON "Encuesta"("areaId", "fechaDia");

-- CreateIndex
CREATE INDEX "Encuesta_colaboradorId_fechaDia_idx" ON "Encuesta"("colaboradorId", "fechaDia");

-- CreateIndex
CREATE INDEX "Encuesta_ipAddress_areaId_fechaDia_idx" ON "Encuesta"("ipAddress", "areaId", "fechaDia");
