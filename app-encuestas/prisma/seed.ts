import 'dotenv/config';
import { PrismaClient, RolUsuario, TipoPregunta } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

function dateOnlyToDbDate(dateStr: string): Date {
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  if (!isValidFormat) {
    throw new Error(`Fecha inválida: ${dateStr}. Debe tener formato YYYY-MM-DD`);
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

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

// =======================================================
// COLABORADORES BASE
// =======================================================

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

// =======================================================
// PREGUNTAS GENÉRICAS PARA ÁREAS REALES
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
    texto: '¿Qué tan probable es que recomiende el club?',
    tipo: TipoPregunta.ESCALA_1_10,
    orden: 5,
    obligatoria: true,
  },
  {
    texto: 'Cuéntenos brevemente en qué podríamos mejorar o qué le agradó.',
    tipo: TipoPregunta.DESCRIPCION,
    orden: 6,
    obligatoria: false,
  },
  {
    texto: 'Nombres y apellidos del socio',
    tipo: TipoPregunta.NOMBRE_SOCIO,
    orden: 7,
    obligatoria: true,
  },
];

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
    rol: RolUsuario.REPORTES,
  },
  {
    email: 'administracion@clublacampina.com.ec',
    password: 'Administración2026!',
    nombre: 'Administración',
    rol: RolUsuario.REPORTES,
  },
];

// =======================================================
// ÁREA FICTICIA PARA PRUEBAS DE REPORTES
// =======================================================

const areaPruebasReportesSeed = {
  nombre: 'Pruebas Reportes',
  slug: 'pruebas-reportes',
  descripcion: 'Área ficticia para probar reportes, filtros, paginación, fechas y exportación Excel.',
};

const colaboradoresPruebasReportesSeed = [
  {
    nombre: 'Ana',
    apellido: 'Reporter',
  },
  {
    nombre: 'Luis',
    apellido: 'Filtro',
  },
  {
    nombre: 'Carla',
    apellido: 'Excel',
  },
  {
    nombre: 'Diego',
    apellido: 'Validacion',
  },
];

const preguntasPruebasReportesSeed = [
  {
    texto: '¿La atención fue cordial?',
    tipo: TipoPregunta.SI_NO,
    orden: 1,
    obligatoria: true,
  },
  {
    texto: '¿El requerimiento fue resuelto?',
    tipo: TipoPregunta.SI_NO,
    orden: 2,
    obligatoria: true,
  },
  {
    texto: '¿El tiempo de atención fue adecuado?',
    tipo: TipoPregunta.SI_NO,
    orden: 3,
    obligatoria: true,
  },
  {
    texto: '¿Recomendaría este servicio?',
    tipo: TipoPregunta.SI_NO,
    orden: 4,
    obligatoria: true,
  },
  {
    texto: '¿Qué tan probable es que recomiende el club?',
    tipo: TipoPregunta.ESCALA_1_10,
    orden: 5,
    obligatoria: true,
  },
  {
    texto: 'Comentario de prueba para reportes',
    tipo: TipoPregunta.DESCRIPCION,
    orden: 6,
    obligatoria: false,
  },
  {
    texto: 'Nombres y apellidos del socio',
    tipo: TipoPregunta.NOMBRE_SOCIO,
    orden: 7,
    obligatoria: true,
  },
];

const encuestasPruebasReportesSeed = [
  // MAYO: 6 encuestas
  {
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Ana Reporter',
    ipAddress: '10.10.10.1',
    fechaEnvio: new Date('2026-05-01T09:15:00-05:00'),
    fechaDia: '2026-05-01',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 9 },
      { orden: 6, valorTexto: 'Excelente atención en la prueba de inicio de mayo.' },
      { orden: 7, valorTexto: 'Carlos Andrade' },
    ],
  },
  {
    nombreSocio: 'María López',
    colaborador: 'Luis Filtro',
    ipAddress: '10.10.10.2',
    fechaEnvio: new Date('2026-05-10T15:00:00-05:00'),
    fechaDia: '2026-05-10',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: false },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 7 },
      { orden: 6, valorTexto: 'El servicio fue bueno, pero el requerimiento demoró.' },
      { orden: 7, valorTexto: 'María López' },
    ],
  },
  {
    nombreSocio: 'Jorge Cevallos',
    colaborador: 'Carla Excel',
    ipAddress: '10.10.10.3',
    fechaEnvio: new Date('2026-05-12T17:00:00-05:00'),
    fechaDia: '2026-05-12',
    respuestas: [
      { orden: 1, valorBooleano: false },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: false },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 6 },
      { orden: 6, valorTexto: 'La atención fue correcta, pero el tiempo puede mejorar.' },
      { orden: 7, valorTexto: 'Jorge Cevallos' },
    ],
  },
  {
    nombreSocio: 'Gabriela Moncayo',
    colaborador: 'Diego Validacion',
    ipAddress: '10.10.10.4',
    fechaEnvio: new Date('2026-05-15T14:00:00-05:00'),
    fechaDia: '2026-05-15',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: false },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 8 },
      { orden: 6, valorTexto: 'Prueba para validar filtros de mitad de mes.' },
      { orden: 7, valorTexto: 'Gabriela Moncayo' },
    ],
  },
  {
    nombreSocio: 'Patricia Molina',
    colaborador: 'Ana Reporter',
    ipAddress: '10.10.10.5',
    fechaEnvio: new Date('2026-05-20T20:45:00-05:00'),
    fechaDia: '2026-05-20',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: false },
      { orden: 4, valorBooleano: false },
      { orden: 5, valorNumero: 5 },
      { orden: 6, valorTexto: 'Buena atención, pero faltó seguimiento.' },
      { orden: 7, valorTexto: 'Patricia Molina' },
    ],
  },
  {
    nombreSocio: 'Andrés Salazar',
    colaborador: 'Luis Filtro',
    ipAddress: '10.10.10.6',
    fechaEnvio: new Date('2026-05-31T21:20:00-05:00'),
    fechaDia: '2026-05-31',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 10 },
      { orden: 6, valorTexto: 'Prueba nocturna: debe contar como mayo por fechaDia.' },
      { orden: 7, valorTexto: 'Andrés Salazar' },
    ],
  },

  // JUNIO: 6 encuestas
  {
    nombreSocio: 'Daniela Torres',
    colaborador: 'Carla Excel',
    ipAddress: '10.10.10.7',
    fechaEnvio: new Date('2026-06-01T08:30:00-05:00'),
    fechaDia: '2026-06-01',
    respuestas: [
      { orden: 1, valorBooleano: false },
      { orden: 2, valorBooleano: false },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: false },
      { orden: 5, valorNumero: 4 },
      { orden: 6, valorTexto: 'Encuesta de inicio de junio para probar filtros por fecha.' },
      { orden: 7, valorTexto: 'Daniela Torres' },
    ],
  },
  {
    nombreSocio: 'Roberto Castillo',
    colaborador: 'Ana Reporter',
    ipAddress: '10.10.10.8',
    fechaEnvio: new Date('2026-06-05T13:25:00-05:00'),
    fechaDia: '2026-06-05',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: false },
      { orden: 3, valorBooleano: false },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 7 },
      { orden: 6, valorTexto: 'Prueba adicional para paginación y reportes de junio.' },
      { orden: 7, valorTexto: 'Roberto Castillo' },
    ],
  },
  {
    nombreSocio: 'Fernanda Ruiz',
    colaborador: 'Luis Filtro',
    ipAddress: '10.10.10.9',
    fechaEnvio: new Date('2026-06-16T10:40:00-05:00'),
    fechaDia: '2026-06-16',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: false },
      { orden: 5, valorNumero: 9 },
      { orden: 6, valorTexto: 'Prueba para validar filtros de mitad de junio.' },
      { orden: 7, valorTexto: 'Fernanda Ruiz' },
    ],
  },
  {
    nombreSocio: 'Sebastián Rivas',
    colaborador: 'Diego Validacion',
    ipAddress: '10.10.10.10',
    fechaEnvio: new Date('2026-06-20T18:15:00-05:00'),
    fechaDia: '2026-06-20',
    respuestas: [
      { orden: 1, valorBooleano: false },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 8 },
      { orden: 6, valorTexto: 'Prueba con respuestas mixtas para resumen.' },
      { orden: 7, valorTexto: 'Sebastián Rivas' },
    ],
  },
  {
    nombreSocio: 'Valeria Castro',
    colaborador: 'Carla Excel',
    ipAddress: '10.10.10.11',
    fechaEnvio: new Date('2026-06-30T11:05:00-05:00'),
    fechaDia: '2026-06-30',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: true },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: true },
      { orden: 5, valorNumero: 10 },
      { orden: 6, valorTexto: 'Prueba de cierre de junio en horario normal.' },
      { orden: 7, valorTexto: 'Valeria Castro' },
    ],
  },
  {
    nombreSocio: 'Esteban Paredes',
    colaborador: 'Ana Reporter',
    ipAddress: '10.10.10.12',
    fechaEnvio: new Date('2026-06-30T22:50:00-05:00'),
    fechaDia: '2026-06-30',
    respuestas: [
      { orden: 1, valorBooleano: true },
      { orden: 2, valorBooleano: false },
      { orden: 3, valorBooleano: true },
      { orden: 4, valorBooleano: false },
      { orden: 5, valorNumero: 6 },
      { orden: 6, valorTexto: 'Prueba nocturna: puede verse como julio en UTC, pero debe contar como junio.' },
      { orden: 7, valorTexto: 'Esteban Paredes' },
    ],
  },
];

// =======================================================
// ENCUESTAS DEMO EN ÁREAS REALES
// =======================================================

const encuestasDemoAreasRealesSeed = [
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'Socio Demo Alimentos',
    ipAddress: '192.168.100.1',
    fechaEnvio: new Date('2026-05-31T21:20:00-05:00'),
    fechaDia: '2026-05-31',
    comentario: 'Demo real: debe contar como mayo aunque fechaEnvio se vea como junio en UTC.',
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Socio Demo Comercial',
    ipAddress: '192.168.100.2',
    fechaEnvio: new Date('2026-06-01T08:30:00-05:00'),
    fechaDia: '2026-06-01',
    comentario: 'Demo real: encuesta de junio para área comercial.',
  },
  {
    areaSlug: 'area-socios',
    nombreSocio: 'Socio Demo Socios',
    ipAddress: '192.168.100.3',
    fechaEnvio: new Date('2026-05-15T14:00:00-05:00'),
    fechaDia: '2026-05-15',
    comentario: 'Demo real: encuesta de mayo para área de socios.',
  },
  {
    areaSlug: 'areas-humedas',
    nombreSocio: 'Socio Demo Húmedas',
    ipAddress: '192.168.100.4',
    fechaEnvio: new Date('2026-06-16T11:30:00-05:00'),
    fechaDia: '2026-06-16',
    comentario: 'Demo real: encuesta de junio para áreas húmedas.',
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Socio Demo Cafetería',
    ipAddress: '192.168.100.5',
    fechaEnvio: new Date('2026-06-30T22:30:00-05:00'),
    fechaDia: '2026-06-30',
    comentario: 'Demo real: debe contar como junio aunque en UTC pueda verse como julio.',
  },
];

// =======================================================
// FUNCIONES BASE
// =======================================================

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

// =======================================================
// HELPERS PARA ENCUESTAS DE PRUEBA
// =======================================================

async function deleteEncuestasByIds(encuestaIds: number[]) {
  if (encuestaIds.length === 0) return;

  await prisma.respuesta.deleteMany({
    where: {
      encuestaId: {
        in: encuestaIds,
      },
    },
  });

  await prisma.encuesta.deleteMany({
    where: {
      id: {
        in: encuestaIds,
      },
    },
  });
}

async function createEncuestaConRespuestas(params: {
  areaId: number;
  colaboradorId?: number | null;
  nombreSocio: string;
  ipAddress: string;
  fechaEnvio: Date;
  fechaDia: string;
  preguntas: Array<{
    id: number;
    orden: number;
    tipo: TipoPregunta;
  }>;
  respuestas: Array<{
    orden: number;
    valorBooleano?: boolean;
    valorTexto?: string;
    valorNumero?: number;
  }>;
}) {
  const preguntasPorOrden = new Map(params.preguntas.map((pregunta) => [pregunta.orden, pregunta]));

  await prisma.encuesta.create({
    data: {
      areaId: params.areaId,
      colaboradorId: params.colaboradorId ?? null,
      nombreSocio: params.nombreSocio,
      ipAddress: params.ipAddress,
      fechaEnvio: params.fechaEnvio,
      fechaDia: dateOnlyToDbDate(params.fechaDia),
      respuestas: {
        create: params.respuestas.map((respuestaSeed) => {
          const pregunta = preguntasPorOrden.get(respuestaSeed.orden);

          if (!pregunta) {
            throw new Error(`No existe pregunta con orden ${respuestaSeed.orden}`);
          }

          return {
            preguntaId: pregunta.id,
            valorBooleano:
              typeof respuestaSeed.valorBooleano === 'boolean'
                ? respuestaSeed.valorBooleano
                : null,
            valorTexto:
              typeof respuestaSeed.valorTexto === 'string'
                ? respuestaSeed.valorTexto
                : null,
            valorNumero:
              typeof respuestaSeed.valorNumero === 'number'
                ? respuestaSeed.valorNumero
                : null,
          };
        }),
      },
    },
  });
}

// =======================================================
// ÁREA PRUEBAS REPORTES: SE RECREA CADA VEZ
// =======================================================

async function seedAreaPruebasReportes() {
  console.log('Recreando área ficticia "Pruebas Reportes"...');

  const areaExistente = await prisma.area.findUnique({
    where: {
      slug: areaPruebasReportesSeed.slug,
    },
    select: {
      id: true,
    },
  });

  if (areaExistente) {
    const encuestasExistentes = await prisma.encuesta.findMany({
      where: {
        areaId: areaExistente.id,
      },
      select: {
        id: true,
      },
    });

    const encuestaIds = encuestasExistentes.map((encuesta) => encuesta.id);

    await deleteEncuestasByIds(encuestaIds);

    await prisma.pregunta.deleteMany({
      where: {
        areaId: areaExistente.id,
      },
    });

    await prisma.colaborador.deleteMany({
      where: {
        areaId: areaExistente.id,
      },
    });

    await prisma.area.delete({
      where: {
        id: areaExistente.id,
      },
    });
  }

  const area = await prisma.area.create({
    data: {
      nombre: areaPruebasReportesSeed.nombre,
      slug: areaPruebasReportesSeed.slug,
      descripcion: areaPruebasReportesSeed.descripcion,
      activa: true,
    },
  });

  const colaboradores = await Promise.all(
    colaboradoresPruebasReportesSeed.map((colaborador) =>
      prisma.colaborador.create({
        data: {
          nombre: colaborador.nombre,
          apellido: colaborador.apellido,
          areaId: area.id,
          activo: true,
        },
      }),
    ),
  );

  const colaboradoresPorNombreCompleto = new Map(
    colaboradores.map((colaborador) => [
      `${colaborador.nombre} ${colaborador.apellido}`,
      colaborador,
    ]),
  );

  const preguntas = await Promise.all(
    preguntasPruebasReportesSeed.map((pregunta) =>
      prisma.pregunta.create({
        data: {
          areaId: area.id,
          texto: pregunta.texto,
          tipo: pregunta.tipo,
          orden: pregunta.orden,
          obligatoria: pregunta.obligatoria,
          activa: true,
        },
      }),
    ),
  );

  for (const encuestaSeed of encuestasPruebasReportesSeed) {
    const colaborador = colaboradoresPorNombreCompleto.get(encuestaSeed.colaborador);

    if (!colaborador) {
      throw new Error(`No existe colaborador de prueba: ${encuestaSeed.colaborador}`);
    }

    await createEncuestaConRespuestas({
      areaId: area.id,
      colaboradorId: colaborador.id,
      nombreSocio: encuestaSeed.nombreSocio,
      ipAddress: encuestaSeed.ipAddress,
      fechaEnvio: encuestaSeed.fechaEnvio,
      fechaDia: encuestaSeed.fechaDia,
      preguntas,
      respuestas: encuestaSeed.respuestas,
    });
  }

  console.log(
    `Área ficticia "${area.nombre}" creada con id ${area.id}. Encuestas creadas: ${encuestasPruebasReportesSeed.length}`,
  );
}

// =======================================================
// ENCUESTAS DEMO PARA ÁREAS REALES
// =======================================================

async function seedEncuestasDemoAreasReales(
  areasMap: Map<string, { id: number; nombre: string; slug: string }>,
) {
  console.log('Recreando encuestas demo para áreas reales...');

  const demoIps = encuestasDemoAreasRealesSeed.map((encuesta) => encuesta.ipAddress);

  const encuestasDemoExistentes = await prisma.encuesta.findMany({
    where: {
      ipAddress: {
        in: demoIps,
      },
    },
    select: {
      id: true,
    },
  });

  await deleteEncuestasByIds(encuestasDemoExistentes.map((encuesta) => encuesta.id));

  for (const encuestaSeed of encuestasDemoAreasRealesSeed) {
    const area = areasMap.get(encuestaSeed.areaSlug);

    if (!area) {
      throw new Error(`No existe el área con slug ${encuestaSeed.areaSlug}`);
    }

    const colaborador = await prisma.colaborador.findFirst({
      where: {
        areaId: area.id,
        activo: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const preguntas = await prisma.pregunta.findMany({
      where: {
        areaId: area.id,
        activa: true,
      },
      orderBy: {
        orden: 'asc',
      },
      select: {
        id: true,
        orden: true,
        tipo: true,
      },
    });

    const respuestas = preguntas.map((pregunta) => {
      if (pregunta.tipo === TipoPregunta.SI_NO) {
        return { orden: pregunta.orden, valorBooleano: true };
      }

      if (pregunta.tipo === TipoPregunta.ESCALA_1_10) {
        return { orden: pregunta.orden, valorNumero: 8 };
      }

      if (pregunta.tipo === TipoPregunta.NOMBRE_SOCIO) {
        return { orden: pregunta.orden, valorTexto: encuestaSeed.nombreSocio };
      }

      return { orden: pregunta.orden, valorTexto: encuestaSeed.comentario };
    });

    await createEncuestaConRespuestas({
      areaId: area.id,
      colaboradorId: colaborador?.id ?? null,
      nombreSocio: encuestaSeed.nombreSocio,
      ipAddress: encuestaSeed.ipAddress,
      fechaEnvio: encuestaSeed.fechaEnvio,
      fechaDia: encuestaSeed.fechaDia,
      preguntas,
      respuestas,
    });
  }

  console.log(`Encuestas demo de áreas reales creadas: ${encuestasDemoAreasRealesSeed.length}`);
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

  await seedAreaPruebasReportes();
  await seedEncuestasDemoAreasReales(areasMap);

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

1. Ejecutar el seed:

   npm run seed

2. Revisar en Prisma Studio:

   npx prisma studio

3. Levantar backend:

   npm run start:dev

4. Revisar área de prueba:

   GET http://localhost:3000/api/areas/pruebas-reportes

5. Pruebas esperadas con el areaId de "Pruebas Reportes":

   MAYO:
   GET /api/reportes/resumen?areaId=ID_AREA&fechaDesde=2026-05-01&fechaHasta=2026-05-31
   Esperado: 6 encuestas

   JUNIO:
   GET /api/reportes/resumen?areaId=ID_AREA&fechaDesde=2026-06-01&fechaHasta=2026-06-30
   Esperado: 6 encuestas

   PAGINACIÓN:
   GET /api/reportes/encuestas?areaId=ID_AREA&page=1&limit=5
   Esperado: 5 registros, total 12

   GET /api/reportes/encuestas?areaId=ID_AREA&page=2&limit=5
   Esperado: 5 registros, total 12

   GET /api/reportes/encuestas?areaId=ID_AREA&page=3&limit=5
   Esperado: 2 registros, total 12

   EXPORTAR:
   GET /api/reportes/exportar?areaId=ID_AREA

=======================================================
NOTAS
=======================================================

- El área "Pruebas Reportes" se elimina y recrea cada vez que corres npm run seed.
- Por eso su id puede cambiar.
- Usa GET /api/areas/pruebas-reportes para obtener el id actual.
- Las áreas reales se mantienen con upsert.
- Las encuestas demo de áreas reales se eliminan/recrean solo por IPs 192.168.100.x.
- fechaEnvio es el timestamp técnico.
- fechaDia es la fecha de negocio usada para filtros, reportes y rate limit.

=======================================================
*/