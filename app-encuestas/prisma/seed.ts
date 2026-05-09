import 'dotenv/config';
import { PrismaClient, RolUsuario, TipoPregunta } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definido en el archivo .env');
}
/* CONEXIÓN CON BASE DE DATOS POSTGRE SQL  */
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});
/* CONEXIÓN CON BASE DE DATOS POSTGRE SQL  */
const areasSeed = [
  {
    nombre: 'Alimentos y Bebidas',
    slug: 'alimentos-bebidas',
    descripcion: 'Área encargada de servicios de alimentos, bebidas y atención relacionada.',
  },
  {
    nombre: 'Área Comercial',
    slug: 'area-comercial',
    descripcion: 'Área encargada de la atención comercial y procesos relacionados con socios o clientes.',
  },
  {
    nombre: 'Área de Socios',
    slug: 'area-socios',
    descripcion: 'Área encargada de la atención y gestión relacionada con socios del club.',
  },
  {
    nombre: 'Áreas Húmedas',
    slug: 'areas-humedas',
    descripcion: 'Área relacionada con piscina, sauna, turco, hidromasaje u otros espacios húmedos.',
  },
  {
    nombre: 'Cafetería',
    slug: 'cafeteria',
    descripcion: 'Área encargada de la atención en cafetería.',
  },
];

const colaboradoresSeed = [
  {
    nombre: 'Aracely',
    apellido: 'Frias',
    areaSlug: 'alimentos-bebidas',
  },
  {
    nombre: 'Silvia',
    apellido: 'Medina',
    areaSlug: 'area-comercial',
  },
  {
    nombre: 'Viviana',
    apellido: 'Anrango',
    areaSlug: 'area-comercial',
  },
  {
    nombre: 'Michelle',
    apellido: 'Donoso',
    areaSlug: 'area-socios',
  },
  {
    nombre: 'Lorena',
    apellido: 'Peralta',
    areaSlug: 'areas-humedas',
  },
  {
    nombre: 'Juan Carlos',
    apellido: '',
    areaSlug: 'cafeteria',
  },
];

const preguntasGenericasSeed = [
  {
    texto: '¿Fue atendido de manera cordial y oportuna?',
    tipo: TipoPregunta.SI_NO,
    orden: 1,
    obligatoria: true,
  },
  {
    texto: '¿Su solicitud o requerimiento fue resuelto adecuadamente?',
    tipo: TipoPregunta.SI_NO,
    orden: 2,
    obligatoria: true,
  },
  {
    texto: '¿El espacio o instalaciones estuvieron en buenas condiciones?',
    tipo: TipoPregunta.SI_NO,
    orden: 3,
    obligatoria: true,
  },
  {
    texto: '¿Su experiencia general cumplió con sus expectativas?',
    tipo: TipoPregunta.SI_NO,
    orden: 4,
    obligatoria: true,
  },
  {
    texto: 'Cuéntenos brevemente en qué podríamos mejorar o qué le agradó.',
    tipo: TipoPregunta.DESCRIPCION,
    orden: 5,
    obligatoria: false,
  },
  {
    texto: 'Nombres y apellidos del socio',
    tipo: TipoPregunta.NOMBRE_SOCIO,
    orden: 6,
    obligatoria: true,
  },
];

const usuariosSeed = [
  {
    email: 'soporte.ti@clublacampina.com.ec',
    password: 'Admin2026!',
    nombre: 'Administrador TIC',
    rol: RolUsuario.ADMIN,
  },
  {
    email: 'gerencia@clublacampina.com.ec',
    password: 'Gerente2026!',
    nombre: 'Gerencia',
    rol: RolUsuario.REPORTES,
  },
  {
    email: 'administracion@clublacampina.com.ec',
    password: 'Administracion2026!',
    nombre: 'Administración',
    rol: RolUsuario.REPORTES,
  },
];

async function seedAreas() {
  const areasMap = new Map<string, { id: number; nombre: string; slug: string }>();

  for (const area of areasSeed) {
    const areaCreada = await prisma.area.upsert({
      where: {
        slug: area.slug,
      },
      update: {
        nombre: area.nombre,
        descripcion: area.descripcion,
        activa: true,
      },
      create: {
        nombre: area.nombre,
        slug: area.slug,
        descripcion: area.descripcion,
        activa: true,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
      },
    });

    areasMap.set(areaCreada.slug, areaCreada);
  }

  return areasMap;
}

async function seedColaboradores(
  areasMap: Map<string, { id: number; nombre: string; slug: string }>,
) {
  for (const colaborador of colaboradoresSeed) {
    const area = areasMap.get(colaborador.areaSlug);

    if (!area) {
      throw new Error(`No existe el área con slug: ${colaborador.areaSlug}`);
    }

    const colaboradorExistente = await prisma.colaborador.findFirst({
      where: {
        nombre: colaborador.nombre,
        apellido: colaborador.apellido,
        areaId: area.id,
      },
    });

    if (colaboradorExistente) {
      await prisma.colaborador.update({
        where: {
          id: colaboradorExistente.id,
        },
        data: {
          activo: true,
        },
      });
    } else {
      await prisma.colaborador.create({
        data: {
          nombre: colaborador.nombre,
          apellido: colaborador.apellido,
          areaId: area.id,
          activo: true,
        },
      });
    }
  }
}

async function seedPreguntas(
  areasMap: Map<string, { id: number; nombre: string; slug: string }>,
) {
  for (const area of areasMap.values()) {
    for (const pregunta of preguntasGenericasSeed) {
      await prisma.pregunta.upsert({
        where: {
          areaId_orden: {
            areaId: area.id,
            orden: pregunta.orden,
          },
        },
        update: {
          texto: pregunta.texto,
          tipo: pregunta.tipo,
          obligatoria: pregunta.obligatoria,
          activa: true,
        },
        create: {
          areaId: area.id,
          texto: pregunta.texto,
          tipo: pregunta.tipo,
          orden: pregunta.orden,
          obligatoria: pregunta.obligatoria,
          activa: true,
        },
      });
    }
  }
}

async function seedUsuarios() {
  for (const usuario of usuariosSeed) {
    const passwordHash = await bcrypt.hash(usuario.password, 10);

    await prisma.usuario.upsert({
      where: {
        email: usuario.email,
      },
      update: {
        passwordHash,
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: true,
      },
      create: {
        email: usuario.email,
        passwordHash,
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: true,
      },
    });
  }
}

async function main() {
  console.log('Iniciando seed...');

  const areasMap = await seedAreas();

  await seedColaboradores(areasMap);
  await seedPreguntas(areasMap);
  await seedUsuarios();

  console.log('Seed ejecutado correctamente.');
}

main()
  .catch((error) => {
    console.error('Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
=======================================================
INSTRUCCIONES DE EJECUCIÓN
=======================================================

1. Instalar dependencias necesarias:

   npm install bcryptjs
   npm install -D ts-node

2. Verificar que en package.json exista el script:

   "seed": "ts-node prisma/seed.ts"

3. Generar Prisma Client:

   npx prisma generate

4. Crear y ejecutar la migración inicial:

   npx prisma migrate dev --name init

5. Ejecutar el seed:

   npm run seed

6. Opcional: abrir Prisma Studio para revisar datos:

   npx prisma studio

=======================================================
NOTA
=======================================================

El colaborador "Juan Carlos" fue registrado con:

   nombre: "Juan Carlos"
   apellido: ""

porque no se especificó apellido en la información inicial.

=======================================================
*/