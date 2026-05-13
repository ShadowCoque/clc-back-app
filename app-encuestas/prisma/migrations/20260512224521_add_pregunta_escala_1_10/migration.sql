-- AlterEnum
ALTER TYPE "TipoPregunta" ADD VALUE 'ESCALA_1_10';

-- AlterTable
ALTER TABLE "Respuesta" ADD COLUMN     "valorNumero" INTEGER;
