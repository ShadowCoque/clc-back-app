import 'dotenv/config';
import { PrismaClient, RolUsuario, TipoPregunta } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definido en el archivo .env');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// =======================================================
// ÁREAS BASE DEL CLUB
// =======================================================

const areasSeed = [
  {
    nombre: 'Alimentos y Bebidas',
    slug: 'alimentos-bebidas',
    descripcion: 'Área encargada de servicios de alimentos, bebidas y atención relacionada.',
    imagenUrl: '/areas/alimentos-bebidas.jpg',
  },
  {
    nombre: 'Área Comercial',
    slug: 'area-comercial',
    descripcion: 'Área encargada de la atención comercial y procesos relacionados con socios o clientes.',
    imagenUrl: '/areas/area-comercial.jpg',
  },
  {
    nombre: 'Área de Socios',
    slug: 'area-socios',
    descripcion: 'Área encargada de la atención y gestión relacionada con socios del club.',
    imagenUrl: '/areas/area-socios.jpg',
  },
  {
    nombre: 'Áreas Húmedas',
    slug: 'areas-humedas',
    descripcion: 'Área relacionada con piscina, sauna, turco, hidromasaje u otros espacios húmedos.',
    imagenUrl: '/areas/areas-humedas.jpg',
  },
];

// =======================================================
// COLABORADORES BASE
// Lorena Peralta (áreas húmedas) queda inactiva hasta ser
// confirmada o reemplazada desde el panel admin.
// =======================================================

const colaboradoresSeed = [
  { nombre: 'Aracely', apellido: 'Frias', areaSlug: 'alimentos-bebidas', activo: true },
  { nombre: 'Silvia', apellido: 'Medina', areaSlug: 'area-comercial', activo: true },
  { nombre: 'Viviana', apellido: 'Anrango', areaSlug: 'area-comercial', activo: true },
  { nombre: 'Michelle', apellido: 'Donoso', areaSlug: 'area-socios', activo: true },
  { nombre: 'Lorena', apellido: 'Peralta', areaSlug: 'areas-humedas', activo: false },
];

// =======================================================
// PREGUNTAS GENÉRICAS (aplican a todas las áreas)
// Posiciones: 1, 2, 3, 7, 8, 9
// =======================================================

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
    texto: '¿Su experiencia general cumplió con sus expectativas?',
    tipo: TipoPregunta.SI_NO,
    orden: 3,
    obligatoria: true,
  },
  {
    texto: '¿Qué tan probable es que recomiende el club?',
    tipo: TipoPregunta.ESCALA_1_10,
    orden: 7,
    obligatoria: true,
  },
  {
    texto: 'Cuéntenos brevemente en qué podríamos mejorar o qué le agradó.',
    tipo: TipoPregunta.DESCRIPCION,
    orden: 8,
    obligatoria: false,
  },
  {
    texto: 'Nombres y apellidos del socio',
    tipo: TipoPregunta.NOMBRE_SOCIO,
    orden: 9,
    obligatoria: true,
  },
];

// =======================================================
// PREGUNTAS ESPECÍFICAS POR ÁREA (posiciones 4, 5, 6)
// =======================================================

const preguntasEspecificasPorAreaSeed: Record<
  string,
  Array<{ texto: string; orden: number; obligatoria: boolean }>
> = {
  'alimentos-bebidas': [
    { texto: '¿La presentación de los alimentos o bebidas fue adecuada?', orden: 4, obligatoria: true },
    { texto: '¿El tiempo de atención fue razonable?', orden: 5, obligatoria: true },
    { texto: '¿El espacio de atención se encontró limpio y ordenado?', orden: 6, obligatoria: true },
  ],
  'area-comercial': [
    { texto: '¿La información recibida fue clara y completa?', orden: 4, obligatoria: true },
    { texto: '¿El trámite o requerimiento fue gestionado con agilidad?', orden: 5, obligatoria: true },
    { texto: '¿Recibió seguimiento adecuado a su solicitud?', orden: 6, obligatoria: true },
  ],
  'area-socios': [
    { texto: '¿La información sobre su cuenta o requerimiento fue clara?', orden: 4, obligatoria: true },
    { texto: '¿La gestión realizada por el área fue eficiente?', orden: 5, obligatoria: true },
    { texto: '¿Recibió una atención personalizada y respetuosa?', orden: 6, obligatoria: true },
  ],
  'areas-humedas': [
    { texto: '¿Las instalaciones se encontraron limpias y en buen estado?', orden: 4, obligatoria: true },
    { texto: '¿La temperatura y funcionamiento de los servicios fue adecuado?', orden: 5, obligatoria: true },
    { texto: '¿Percibió orden y seguridad durante el uso del área?', orden: 6, obligatoria: true },
  ],
};

// =======================================================
// USUARIOS INICIALES
// =======================================================

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
    rol: RolUsuario.GERENTE,
  },
  {
    email: 'administracion@clublacampina.com.ec',
    password: 'Administración2026!',
    nombre: 'Administración',
    rol: RolUsuario.ADMIN,
  },
  {
    email: 'recursoshumanos@clublacampina.com.ec',
    password: 'RecursosHumanos2026!',
    nombre: 'Recursos Humanos',
    rol: RolUsuario.REPORTES,
  },
];

// =======================================================
// FUNCIONES DE SEED
// =======================================================

async function seedAreas() {
  const areasMap = new Map<string, { id: number; nombre: string; slug: string }>();

  for (const area of areasSeed) {
    const areaCreada = await prisma.area.upsert({
      where: { slug: area.slug },
      update: {
        nombre: area.nombre,
        descripcion: area.descripcion,
        imagenUrl: area.imagenUrl,
        activa: true,
      },
      create: {
        nombre: area.nombre,
        slug: area.slug,
        descripcion: area.descripcion,
        imagenUrl: area.imagenUrl,
        activa: true,
      },
      select: { id: true, nombre: true, slug: true },
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
        where: { id: colaboradorExistente.id },
        data: { activo: colaborador.activo },
      });
    } else {
      await prisma.colaborador.create({
        data: {
          nombre: colaborador.nombre,
          apellido: colaborador.apellido,
          areaId: area.id,
          activo: colaborador.activo,
        },
      });
    }
  }
}

async function seedPreguntas(
  areasMap: Map<string, { id: number; nombre: string; slug: string }>,
) {
  for (const area of areasMap.values()) {
    // Preguntas genéricas (posiciones 1, 2, 3, 7, 8, 9)
    for (const pregunta of preguntasGenericasSeed) {
      await prisma.pregunta.upsert({
        where: { areaId_orden: { areaId: area.id, orden: pregunta.orden } },
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

    // Preguntas propias del área (posiciones 4, 5, 6)
    const especificas = preguntasEspecificasPorAreaSeed[area.slug];
    if (especificas) {
      for (const pregunta of especificas) {
        await prisma.pregunta.upsert({
          where: { areaId_orden: { areaId: area.id, orden: pregunta.orden } },
          update: {
            texto: pregunta.texto,
            tipo: TipoPregunta.SI_NO,
            obligatoria: pregunta.obligatoria,
            activa: true,
          },
          create: {
            areaId: area.id,
            texto: pregunta.texto,
            tipo: TipoPregunta.SI_NO,
            orden: pregunta.orden,
            obligatoria: pregunta.obligatoria,
            activa: true,
          },
        });
      }
    }
  }
}

async function seedUsuarios() {
  for (const usuario of usuariosSeed) {
    const passwordHash = await bcrypt.hash(usuario.password, 10);

    await prisma.usuario.upsert({
      where: { email: usuario.email },
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

// =======================================================
// MAIN
// =======================================================

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
