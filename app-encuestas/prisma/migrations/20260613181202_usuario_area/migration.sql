-- CreateTable
CREATE TABLE "UsuarioArea" (
    "usuarioId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioArea_pkey" PRIMARY KEY ("usuarioId","areaId")
);

-- CreateIndex
CREATE INDEX "UsuarioArea_usuarioId_idx" ON "UsuarioArea"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioArea_areaId_idx" ON "UsuarioArea"("areaId");

-- AddForeignKey
ALTER TABLE "UsuarioArea" ADD CONSTRAINT "UsuarioArea_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioArea" ADD CONSTRAINT "UsuarioArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
