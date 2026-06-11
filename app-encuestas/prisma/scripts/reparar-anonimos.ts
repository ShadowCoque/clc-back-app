// Script one-off de reparación de datos.
//
// Encuestas guardadas con nombreSocio = "Anónimo" (o vacío) aunque el nombre
// real del socio sí quedó en sus respuestas (bug de frontends viejos).
// Recupera el nombre desde la respuesta a la pregunta NOMBRE_SOCIO o, si no,
// desde una pregunta de texto cuyo enunciado pida el nombre del socio.
//
// Solo hace UPDATE de encuesta.nombreSocio. No borra nada.
//
// Ejecutar: npm run reparar:anonimos
import 'dotenv/config';
import { PrismaClient, TipoPregunta } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  esNombreAnonimo,
  esTextoPreguntaNombreSocio,
} from '../../src/common/utils/nombre-socio.util';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definido en el archivo .env');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const encuestas = await prisma.encuesta.findMany({
    select: {
      id: true,
      nombreSocio: true,
      respuestas: {
        select: {
          valorTexto: true,
          pregunta: { select: { texto: true, tipo: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  const anonimas = encuestas.filter((e) => esNombreAnonimo(e.nombreSocio));
  console.log(`Encuestas totales: ${encuestas.length}`);
  console.log(
    `Encuestas anónimas (nombreSocio vacío o "Anónimo"): ${anonimas.length}\n`,
  );

  let reparadas = 0;
  const sinNombre: number[] = [];

  for (const encuesta of anonimas) {
    // El backend viejo rellenaba la respuesta NOMBRE_SOCIO con el propio
    // "Anónimo" del dto, por eso un valorTexto anónimo no cuenta como nombre.
    const tieneNombre = (valorTexto: string | null) =>
      !!valorTexto?.trim() && !esNombreAnonimo(valorTexto);

    const respuestaNombre =
      encuesta.respuestas.find(
        (r) =>
          r.pregunta.tipo === TipoPregunta.NOMBRE_SOCIO &&
          tieneNombre(r.valorTexto),
      ) ??
      encuesta.respuestas.find(
        (r) =>
          tieneNombre(r.valorTexto) &&
          esTextoPreguntaNombreSocio(r.pregunta.texto),
      );

    if (!respuestaNombre?.valorTexto) {
      sinNombre.push(encuesta.id);
      continue;
    }

    // nombreSocio es VarChar(150) en la base.
    const nombreSocio = respuestaNombre.valorTexto.trim().slice(0, 150).trim();

    await prisma.encuesta.update({
      where: { id: encuesta.id },
      data: { nombreSocio },
    });

    reparadas++;
    console.log(
      `Encuesta ${encuesta.id}: "${encuesta.nombreSocio}" -> "${nombreSocio}"`,
    );
  }

  console.log(`\nReparadas: ${reparadas}`);
  console.log(
    `Anónimas de verdad (sin nombre en sus respuestas): ${sinNombre.length}` +
      (sinNombre.length > 0 ? ` — ids: ${sinNombre.join(', ')}` : ''),
  );
}

main()
  .catch((error) => {
    console.error('Error ejecutando reparación:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
