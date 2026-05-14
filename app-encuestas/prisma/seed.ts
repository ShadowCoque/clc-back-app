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

type RespuestaSeed = {
  orden: number;
  valorBooleano?: boolean;
  valorTexto?: string;
  valorNumero?: number;
};

type EncuestaAreaRealSeed = {
  areaSlug: string;
  nombreSocio: string;
  colaborador: string;
  ipAddress: string;
  fechaEnvio: Date;
  fechaDia: string;
  respuestas: RespuestaSeed[];
};

type EncuestaPruebasSeed = Omit<EncuestaAreaRealSeed, 'areaSlug'>;

const CONTROLLED_SEED_IP_PREFIX = '172.20.';

function normalizeFullName(nombre: string, apellido?: string | null): string {
  return `${nombre} ${apellido ?? ''}`.trim().replace(/\s+/g, ' ');
}

function makeRespuestas(
  siNo: [boolean, boolean, boolean, boolean],
  escala: number,
  comentario: string,
  nombreSocio: string,
): RespuestaSeed[] {
  return [
    { orden: 1, valorBooleano: siNo[0] },
    { orden: 2, valorBooleano: siNo[1] },
    { orden: 3, valorBooleano: siNo[2] },
    { orden: 4, valorBooleano: siNo[3] },
    { orden: 5, valorNumero: escala },
    { orden: 6, valorTexto: comentario },
    { orden: 7, valorTexto: nombreSocio },
  ];
}

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
  {
    nombre: 'Cafetería',
    slug: 'cafeteria',
    descripcion: 'Área encargada de la atención en cafetería.',
    imagenUrl: '/areas/cafeteria.jpg',
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
  imagenUrl: '/areas/pruebas-reportes.jpg',
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

// =======================================================
// ENCUESTAS CONTROLADAS EN ÁREAS REALES
// Rango: 2026-04-01 a 2026-05-13
// =======================================================

const encuestasControladasAreasRealesSeed: EncuestaAreaRealSeed[] = [
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Aracely Frias',
    ipAddress: '172.20.10.1',
    fechaEnvio: new Date('2026-04-01T09:05:00-05:00'),
    fechaDia: '2026-04-01',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Buena atención en restaurante, servicio rápido.', 'Carlos Andrade'),
  },
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'María López',
    colaborador: 'Aracely Frias',
    ipAddress: '172.20.10.2',
    fechaEnvio: new Date('2026-04-04T12:20:00-05:00'),
    fechaDia: '2026-04-04',
    respuestas: makeRespuestas([true, true, true, false], 8, 'La atención fue buena, pero el tiempo de espera puede mejorar.', 'María López'),
  },
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'Jorge Cevallos',
    colaborador: 'Aracely Frias',
    ipAddress: '172.20.10.3',
    fechaEnvio: new Date('2026-04-12T13:10:00-05:00'),
    fechaDia: '2026-04-12',
    respuestas: makeRespuestas([true, false, true, false], 6, 'El pedido llegó incompleto y se corrigió después.', 'Jorge Cevallos'),
  },
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'Ana Beltrán',
    colaborador: 'Aracely Frias',
    ipAddress: '172.20.10.4',
    fechaEnvio: new Date('2026-04-22T15:35:00-05:00'),
    fechaDia: '2026-04-22',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Excelente servicio y trato del personal.', 'Ana Beltrán'),
  },
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'Gabriela Moncayo',
    colaborador: 'Aracely Frias',
    ipAddress: '172.20.10.5',
    fechaEnvio: new Date('2026-05-03T10:45:00-05:00'),
    fechaDia: '2026-05-03',
    respuestas: makeRespuestas([true, true, false, true], 7, 'La atención fue cordial, faltó limpieza en una mesa.', 'Gabriela Moncayo'),
  },
  {
    areaSlug: 'alimentos-bebidas',
    nombreSocio: 'Patricia Molina',
    colaborador: 'Aracely Frias',
    ipAddress: '172.20.10.6',
    fechaEnvio: new Date('2026-05-13T16:15:00-05:00'),
    fechaDia: '2026-05-13',
    respuestas: makeRespuestas([false, false, true, false], 5, 'La experiencia no cumplió con lo esperado.', 'Patricia Molina'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Silvia Medina',
    ipAddress: '172.20.20.1',
    fechaEnvio: new Date('2026-04-02T09:40:00-05:00'),
    fechaDia: '2026-04-02',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Información comercial clara y completa.', 'Carlos Andrade'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Roberto Castillo',
    colaborador: 'Silvia Medina',
    ipAddress: '172.20.20.2',
    fechaEnvio: new Date('2026-04-08T11:05:00-05:00'),
    fechaDia: '2026-04-08',
    respuestas: makeRespuestas([true, true, true, false], 9, 'Muy buena atención, aunque faltó cerrar un detalle.', 'Roberto Castillo'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Fernanda Ruiz',
    colaborador: 'Silvia Medina',
    ipAddress: '172.20.20.3',
    fechaEnvio: new Date('2026-05-01T14:30:00-05:00'),
    fechaDia: '2026-05-01',
    respuestas: makeRespuestas([true, true, false, true], 8, 'Atención cordial, pero el espacio estaba congestionado.', 'Fernanda Ruiz'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Esteban Paredes',
    colaborador: 'Silvia Medina',
    ipAddress: '172.20.20.4',
    fechaEnvio: new Date('2026-05-12T15:55:00-05:00'),
    fechaDia: '2026-05-12',
    respuestas: makeRespuestas([false, true, false, false], 6, 'La respuesta fue útil, pero tardía.', 'Esteban Paredes'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'María López',
    colaborador: 'Viviana Anrango',
    ipAddress: '172.20.20.5',
    fechaEnvio: new Date('2026-04-05T10:15:00-05:00'),
    fechaDia: '2026-04-05',
    respuestas: makeRespuestas([true, false, true, true], 7, 'Buena orientación, faltó resolver una inquietud.', 'María López'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Valeria Castro',
    colaborador: 'Viviana Anrango',
    ipAddress: '172.20.20.6',
    fechaEnvio: new Date('2026-04-18T12:45:00-05:00'),
    fechaDia: '2026-04-18',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Excelente acompañamiento comercial.', 'Valeria Castro'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Andrés Salazar',
    colaborador: 'Viviana Anrango',
    ipAddress: '172.20.20.7',
    fechaEnvio: new Date('2026-05-06T09:25:00-05:00'),
    fechaDia: '2026-05-06',
    respuestas: makeRespuestas([true, true, false, true], 9, 'Atención muy buena y seguimiento oportuno.', 'Andrés Salazar'),
  },
  {
    areaSlug: 'area-comercial',
    nombreSocio: 'Daniela Torres',
    colaborador: 'Viviana Anrango',
    ipAddress: '172.20.20.8',
    fechaEnvio: new Date('2026-05-13T17:00:00-05:00'),
    fechaDia: '2026-05-13',
    respuestas: makeRespuestas([false, false, false, false], 4, 'No recibí la información solicitada a tiempo.', 'Daniela Torres'),
  },
  {
    areaSlug: 'area-socios',
    nombreSocio: 'Gabriela Moncayo',
    colaborador: 'Michelle Donoso',
    ipAddress: '172.20.30.1',
    fechaEnvio: new Date('2026-04-03T08:50:00-05:00'),
    fechaDia: '2026-04-03',
    respuestas: makeRespuestas([true, true, true, true], 8, 'Gestión adecuada de la solicitud.', 'Gabriela Moncayo'),
  },
  {
    areaSlug: 'area-socios',
    nombreSocio: 'Patricia Molina',
    colaborador: 'Michelle Donoso',
    ipAddress: '172.20.30.2',
    fechaEnvio: new Date('2026-04-10T16:20:00-05:00'),
    fechaDia: '2026-04-10',
    respuestas: makeRespuestas([true, true, true, false], 9, 'Muy buena atención, faltó confirmar por correo.', 'Patricia Molina'),
  },
  {
    areaSlug: 'area-socios',
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Michelle Donoso',
    ipAddress: '172.20.30.3',
    fechaEnvio: new Date('2026-04-28T10:30:00-05:00'),
    fechaDia: '2026-04-28',
    respuestas: makeRespuestas([true, false, true, true], 7, 'Atención correcta, pero la resolución demoró.', 'Carlos Andrade'),
  },
  {
    areaSlug: 'area-socios',
    nombreSocio: 'Jorge Cevallos',
    colaborador: 'Michelle Donoso',
    ipAddress: '172.20.30.4',
    fechaEnvio: new Date('2026-05-04T13:40:00-05:00'),
    fechaDia: '2026-05-04',
    respuestas: makeRespuestas([false, false, true, false], 5, 'No quedó claro el proceso para el trámite.', 'Jorge Cevallos'),
  },
  {
    areaSlug: 'area-socios',
    nombreSocio: 'María López',
    colaborador: 'Michelle Donoso',
    ipAddress: '172.20.30.5',
    fechaEnvio: new Date('2026-05-11T11:35:00-05:00'),
    fechaDia: '2026-05-11',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Excelente atención y seguimiento.', 'María López'),
  },
  {
    areaSlug: 'areas-humedas',
    nombreSocio: 'Andrés Salazar',
    colaborador: 'Lorena Peralta',
    ipAddress: '172.20.40.1',
    fechaEnvio: new Date('2026-04-06T07:40:00-05:00'),
    fechaDia: '2026-04-06',
    respuestas: makeRespuestas([false, true, false, true], 6, 'La zona estuvo habilitada, pero faltó limpieza.', 'Andrés Salazar'),
  },
  {
    areaSlug: 'areas-humedas',
    nombreSocio: 'Daniela Torres',
    colaborador: 'Lorena Peralta',
    ipAddress: '172.20.40.2',
    fechaEnvio: new Date('2026-04-15T08:25:00-05:00'),
    fechaDia: '2026-04-15',
    respuestas: makeRespuestas([true, true, true, false], 7, 'El servicio fue bueno, pero la temperatura no fue la esperada.', 'Daniela Torres'),
  },
  {
    areaSlug: 'areas-humedas',
    nombreSocio: 'Roberto Castillo',
    colaborador: 'Lorena Peralta',
    ipAddress: '172.20.40.3',
    fechaEnvio: new Date('2026-04-30T09:10:00-05:00'),
    fechaDia: '2026-04-30',
    respuestas: makeRespuestas([true, true, false, true], 8, 'Atención cordial y servicio estable.', 'Roberto Castillo'),
  },
  {
    areaSlug: 'areas-humedas',
    nombreSocio: 'Fernanda Ruiz',
    colaborador: 'Lorena Peralta',
    ipAddress: '172.20.40.4',
    fechaEnvio: new Date('2026-05-08T10:00:00-05:00'),
    fechaDia: '2026-05-08',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Excelente estado de las instalaciones.', 'Fernanda Ruiz'),
  },
  {
    areaSlug: 'areas-humedas',
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Lorena Peralta',
    ipAddress: '172.20.40.5',
    fechaEnvio: new Date('2026-05-13T12:20:00-05:00'),
    fechaDia: '2026-05-13',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Muy buena experiencia en piscina y sauna.', 'Carlos Andrade'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Valeria Castro',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.1',
    fechaEnvio: new Date('2026-04-01T16:40:00-05:00'),
    fechaDia: '2026-04-01',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Café y atención excelentes.', 'Valeria Castro'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Ana Beltrán',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.2',
    fechaEnvio: new Date('2026-04-07T17:15:00-05:00'),
    fechaDia: '2026-04-07',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Muy buena atención en caja y entrega.', 'Ana Beltrán'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Jorge Cevallos',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.3',
    fechaEnvio: new Date('2026-04-16T18:00:00-05:00'),
    fechaDia: '2026-04-16',
    respuestas: makeRespuestas([true, false, true, true], 8, 'Servicio bueno, faltó variedad disponible.', 'Jorge Cevallos'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'María López',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.4',
    fechaEnvio: new Date('2026-04-25T15:30:00-05:00'),
    fechaDia: '2026-04-25',
    respuestas: makeRespuestas([true, true, false, true], 7, 'Buena atención, pero el área estaba llena.', 'María López'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Patricia Molina',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.5',
    fechaEnvio: new Date('2026-05-02T11:50:00-05:00'),
    fechaDia: '2026-05-02',
    respuestas: makeRespuestas([false, true, false, false], 6, 'El producto estuvo bien, pero la atención fue lenta.', 'Patricia Molina'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Gabriela Moncayo',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.6',
    fechaEnvio: new Date('2026-05-07T12:10:00-05:00'),
    fechaDia: '2026-05-07',
    respuestas: makeRespuestas([true, true, true, false], 8, 'Atención cordial, faltó confirmar disponibilidad.', 'Gabriela Moncayo'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Esteban Paredes',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.7',
    fechaEnvio: new Date('2026-05-10T13:15:00-05:00'),
    fechaDia: '2026-05-10',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Servicio rápido y amable.', 'Esteban Paredes'),
  },
  {
    areaSlug: 'cafeteria',
    nombreSocio: 'Roberto Castillo',
    colaborador: 'Juan Carlos',
    ipAddress: '172.20.50.8',
    fechaEnvio: new Date('2026-05-13T17:35:00-05:00'),
    fechaDia: '2026-05-13',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Excelente experiencia en cafetería.', 'Roberto Castillo'),
  },
];

// =======================================================
// ENCUESTAS CONTROLADAS PARA PRUEBAS REPORTES
// Rango: 2026-04-01 a 2026-05-13
// =======================================================

const encuestasPruebasReportesSeed: EncuestaPruebasSeed[] = [
  {
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Ana Reporter',
    ipAddress: '172.20.99.1',
    fechaEnvio: new Date('2026-04-01T09:15:00-05:00'),
    fechaDia: '2026-04-01',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Prueba controlada: promotor inicial.', 'Carlos Andrade'),
  },
  {
    nombreSocio: 'María López',
    colaborador: 'Ana Reporter',
    ipAddress: '172.20.99.2',
    fechaEnvio: new Date('2026-04-09T10:05:00-05:00'),
    fechaDia: '2026-04-09',
    respuestas: makeRespuestas([true, true, true, false], 9, 'Prueba controlada: promotor con un No.', 'María López'),
  },
  {
    nombreSocio: 'Jorge Cevallos',
    colaborador: 'Ana Reporter',
    ipAddress: '172.20.99.3',
    fechaEnvio: new Date('2026-04-21T14:10:00-05:00'),
    fechaDia: '2026-04-21',
    respuestas: makeRespuestas([true, false, true, true], 7, 'Prueba controlada: pasivo.', 'Jorge Cevallos'),
  },
  {
    nombreSocio: 'Ana Beltrán',
    colaborador: 'Ana Reporter',
    ipAddress: '172.20.99.4',
    fechaEnvio: new Date('2026-05-13T17:50:00-05:00'),
    fechaDia: '2026-05-13',
    respuestas: makeRespuestas([false, false, true, false], 4, 'Prueba controlada: detractor en fecha límite.', 'Ana Beltrán'),
  },
  {
    nombreSocio: 'Gabriela Moncayo',
    colaborador: 'Luis Filtro',
    ipAddress: '172.20.99.5',
    fechaEnvio: new Date('2026-04-02T11:20:00-05:00'),
    fechaDia: '2026-04-02',
    respuestas: makeRespuestas([true, true, false, true], 8, 'Prueba para filtro por colaborador Luis.', 'Gabriela Moncayo'),
  },
  {
    nombreSocio: 'Patricia Molina',
    colaborador: 'Luis Filtro',
    ipAddress: '172.20.99.6',
    fechaEnvio: new Date('2026-04-14T12:00:00-05:00'),
    fechaDia: '2026-04-14',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Prueba controlada positiva.', 'Patricia Molina'),
  },
  {
    nombreSocio: 'Andrés Salazar',
    colaborador: 'Luis Filtro',
    ipAddress: '172.20.99.7',
    fechaEnvio: new Date('2026-05-05T16:30:00-05:00'),
    fechaDia: '2026-05-05',
    respuestas: makeRespuestas([false, true, false, false], 6, 'Prueba controlada negativa.', 'Andrés Salazar'),
  },
  {
    nombreSocio: 'Daniela Torres',
    colaborador: 'Luis Filtro',
    ipAddress: '172.20.99.8',
    fechaEnvio: new Date('2026-05-11T09:45:00-05:00'),
    fechaDia: '2026-05-11',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Prueba controlada cierre positivo.', 'Daniela Torres'),
  },
  {
    nombreSocio: 'Roberto Castillo',
    colaborador: 'Carla Excel',
    ipAddress: '172.20.99.9',
    fechaEnvio: new Date('2026-04-04T08:35:00-05:00'),
    fechaDia: '2026-04-04',
    respuestas: makeRespuestas([false, false, true, false], 5, 'Prueba para exportación con detractor.', 'Roberto Castillo'),
  },
  {
    nombreSocio: 'Fernanda Ruiz',
    colaborador: 'Carla Excel',
    ipAddress: '172.20.99.10',
    fechaEnvio: new Date('2026-04-20T10:50:00-05:00'),
    fechaDia: '2026-04-20',
    respuestas: makeRespuestas([true, true, true, false], 7, 'Prueba para exportación con pasivo.', 'Fernanda Ruiz'),
  },
  {
    nombreSocio: 'Valeria Castro',
    colaborador: 'Carla Excel',
    ipAddress: '172.20.99.11',
    fechaEnvio: new Date('2026-05-01T15:05:00-05:00'),
    fechaDia: '2026-05-01',
    respuestas: makeRespuestas([true, true, false, true], 8, 'Prueba para exportación con fecha de mayo.', 'Valeria Castro'),
  },
  {
    nombreSocio: 'Esteban Paredes',
    colaborador: 'Carla Excel',
    ipAddress: '172.20.99.12',
    fechaEnvio: new Date('2026-05-12T13:55:00-05:00'),
    fechaDia: '2026-05-12',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Prueba para exportación con promotor.', 'Esteban Paredes'),
  },
  {
    nombreSocio: 'Carlos Andrade',
    colaborador: 'Diego Validacion',
    ipAddress: '172.20.99.13',
    fechaEnvio: new Date('2026-04-06T09:30:00-05:00'),
    fechaDia: '2026-04-06',
    respuestas: makeRespuestas([false, true, true, false], 6, 'Prueba de validación: detractor.', 'Carlos Andrade'),
  },
  {
    nombreSocio: 'María López',
    colaborador: 'Diego Validacion',
    ipAddress: '172.20.99.14',
    fechaEnvio: new Date('2026-04-27T14:35:00-05:00'),
    fechaDia: '2026-04-27',
    respuestas: makeRespuestas([true, true, true, true], 8, 'Prueba de validación: pasivo.', 'María López'),
  },
  {
    nombreSocio: 'Jorge Cevallos',
    colaborador: 'Diego Validacion',
    ipAddress: '172.20.99.15',
    fechaEnvio: new Date('2026-05-06T16:10:00-05:00'),
    fechaDia: '2026-05-06',
    respuestas: makeRespuestas([true, true, true, true], 9, 'Prueba de validación: promotor.', 'Jorge Cevallos'),
  },
  {
    nombreSocio: 'Gabriela Moncayo',
    colaborador: 'Diego Validacion',
    ipAddress: '172.20.99.16',
    fechaEnvio: new Date('2026-05-13T18:15:00-05:00'),
    fechaDia: '2026-05-13',
    respuestas: makeRespuestas([true, true, true, true], 10, 'Prueba de validación en fecha límite.', 'Gabriela Moncayo'),
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
// HELPERS PARA ENCUESTAS
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
  respuestas: RespuestaSeed[];
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

async function getPreguntasActivasPorArea(areaId: number) {
  return prisma.pregunta.findMany({
    where: {
      areaId,
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
}

async function getColaboradoresActivosMap(areaId: number) {
  const colaboradores = await prisma.colaborador.findMany({
    where: {
      areaId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
    },
  });

  return new Map(
    colaboradores.map((colaborador) => [
      normalizeFullName(colaborador.nombre, colaborador.apellido),
      colaborador,
    ]),
  );
}

// =======================================================
// ENCUESTAS CONTROLADAS DE ÁREAS REALES
// =======================================================

async function seedEncuestasControladasAreasReales(
  areasMap: Map<string, { id: number; nombre: string; slug: string }>,
) {
  console.log('Recreando encuestas controladas para áreas reales...');

  const areaIds = Array.from(areasMap.values()).map((area) => area.id);

  const encuestasControladasExistentes = await prisma.encuesta.findMany({
    where: {
      areaId: {
        in: areaIds,
      },
      ipAddress: {
        startsWith: CONTROLLED_SEED_IP_PREFIX,
      },
    },
    select: {
      id: true,
    },
  });

  await deleteEncuestasByIds(encuestasControladasExistentes.map((encuesta) => encuesta.id));

  const cachePorArea = new Map<
    string,
    {
      preguntas: Awaited<ReturnType<typeof getPreguntasActivasPorArea>>;
      colaboradores: Awaited<ReturnType<typeof getColaboradoresActivosMap>>;
    }
  >();

  for (const encuestaSeed of encuestasControladasAreasRealesSeed) {
    const area = areasMap.get(encuestaSeed.areaSlug);

    if (!area) {
      throw new Error(`No existe el área con slug ${encuestaSeed.areaSlug}`);
    }

    if (!cachePorArea.has(encuestaSeed.areaSlug)) {
      cachePorArea.set(encuestaSeed.areaSlug, {
        preguntas: await getPreguntasActivasPorArea(area.id),
        colaboradores: await getColaboradoresActivosMap(area.id),
      });
    }

    const cache = cachePorArea.get(encuestaSeed.areaSlug);

    if (!cache) {
      throw new Error(`No se pudo cargar cache del área ${encuestaSeed.areaSlug}`);
    }

    const colaborador = cache.colaboradores.get(encuestaSeed.colaborador);

    if (!colaborador) {
      throw new Error(
        `No existe colaborador "${encuestaSeed.colaborador}" en el área ${area.nombre}`,
      );
    }

    await createEncuestaConRespuestas({
      areaId: area.id,
      colaboradorId: colaborador.id,
      nombreSocio: encuestaSeed.nombreSocio,
      ipAddress: encuestaSeed.ipAddress,
      fechaEnvio: encuestaSeed.fechaEnvio,
      fechaDia: encuestaSeed.fechaDia,
      preguntas: cache.preguntas,
      respuestas: encuestaSeed.respuestas,
    });
  }

  console.log(
    `Encuestas controladas de áreas reales creadas: ${encuestasControladasAreasRealesSeed.length}`,
  );
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
      imagenUrl: areaPruebasReportesSeed.imagenUrl,
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
      normalizeFullName(colaborador.nombre, colaborador.apellido),
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
// MAIN
// =======================================================

async function main() {
  console.log('Iniciando seed controlado...');

  const areasMap = await seedAreas();

  await seedColaboradores(areasMap);
  await seedPreguntas(areasMap);
  await seedUsuarios();

  await seedEncuestasControladasAreasReales(areasMap);
  await seedAreaPruebasReportes();

  console.log('Seed controlado ejecutado correctamente.');
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

1. Guarda este archivo como tu seed principal, por ejemplo:
   prisma/seed.ts

2. Ejecuta:
   npm run seed

3. Revisa en Prisma Studio:
   npx prisma studio

4. Levanta backend:
   npm run start:dev

5. Rango total del dataset controlado:
   fechaDesde=2026-04-01
   fechaHasta=2026-05-13

6. Todas las encuestas controladas tienen fechaDia <= 2026-05-13.

7. Para obtener el id actual de "Pruebas Reportes":
   GET /api/areas/pruebas-reportes

=======================================================
NOTAS IMPORTANTES
=======================================================

- Las áreas reales se mantienen con upsert.
- Las preguntas genéricas se mantienen por área y por orden.
- Las encuestas controladas de áreas reales se eliminan/recrean por IP con prefijo 172.20.*.
- El área "Pruebas Reportes" se elimina y recrea completa cada vez que corres el seed.
- fechaEnvio es el timestamp técnico.
- fechaDia es la fecha de negocio usada para filtros, reportes y rate limit.
- %Satisfacción esperado aquí se calcula como:
  respuestas SI / total de respuestas SI_NO del filtro.

=======================================================
RESUMEN ESPERADO DEL DATASET CONTROLADO

Regla usada:
- Promedio escala = promedio de respuestas ESCALA_1_10.
- Promotores = escala 9-10; Pasivos = 7-8; Detractores = 0-6.
- NPS = %Promotores - %Detractores.
- %Satisfacción = Sí / (Sí + No) usando todas las preguntas SI_NO del filtro.

Por área:
| Filtro | Encuestas | Promedio escala | Promotores | Pasivos | Detractores | NPS | Sí | No | %Satisfacción |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Alimentos y Bebidas | 6 | 7.5 | 2 | 2 | 2 | 0 | 17 | 7 | 70.83% |
| Área Comercial | 8 | 7.88 | 4 | 2 | 2 | 25 | 21 | 11 | 65.62% |
| Área de Socios | 5 | 7.8 | 2 | 2 | 1 | 20 | 15 | 5 | 75% |
| Áreas Húmedas | 5 | 8 | 2 | 2 | 1 | 20 | 16 | 4 | 80% |
| Cafetería | 8 | 8.38 | 4 | 3 | 1 | 37.5 | 26 | 6 | 81.25% |
| Pruebas Reportes | 16 | 7.81 | 7 | 5 | 4 | 18.75 | 48 | 16 | 75% |

Por colaborador:
| Filtro | Encuestas | Promedio escala | Promotores | Pasivos | Detractores | NPS | Sí | No | %Satisfacción |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Aracely Frias | 6 | 7.5 | 2 | 2 | 2 | 0 | 17 | 7 | 70.83% |
| Silvia Medina | 4 | 8.25 | 2 | 1 | 1 | 25 | 11 | 5 | 68.75% |
| Viviana Anrango | 4 | 7.5 | 2 | 1 | 1 | 25 | 10 | 6 | 62.5% |
| Michelle Donoso | 5 | 7.8 | 2 | 2 | 1 | 20 | 15 | 5 | 75% |
| Lorena Peralta | 5 | 8 | 2 | 2 | 1 | 20 | 16 | 4 | 80% |
| Juan Carlos | 8 | 8.38 | 4 | 3 | 1 | 37.5 | 26 | 6 | 81.25% |
| Ana Reporter | 4 | 7.5 | 2 | 1 | 1 | 25 | 11 | 5 | 68.75% |
| Luis Filtro | 4 | 8.25 | 2 | 1 | 1 | 25 | 12 | 4 | 75% |
| Carla Excel | 4 | 7.25 | 1 | 2 | 1 | 0 | 11 | 5 | 68.75% |
| Diego Validacion | 4 | 8.25 | 2 | 1 | 1 | 25 | 14 | 2 | 87.5% |

Filtros útiles de comparación:
| Filtro | Encuestas | Promedio escala | Promotores | Pasivos | Detractores | NPS | Sí | No | %Satisfacción |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| General 2026-04-01 a 2026-05-13 | 48 | 7.9 | 21 | 16 | 11 | 20.83 | 143 | 49 | 74.48% |
| Solo abril 2026-04-01 a 2026-04-30 | 27 | 8.04 | 11 | 12 | 4 | 25.93 | 86 | 22 | 79.63% |
| Solo mayo 2026-05-01 a 2026-05-13 | 21 | 7.71 | 10 | 4 | 7 | 14.29 | 57 | 27 | 67.86% |
| Socio Carlos Andrade | 6 | 8.67 | 4 | 1 | 1 | 50 | 21 | 3 | 87.5% |
| Socio María López | 6 | 8.17 | 2 | 4 | 0 | 33.33 | 20 | 4 | 83.33% |
| Socio Jorge Cevallos | 5 | 7 | 1 | 2 | 2 | -20 | 13 | 7 | 65% |
=======================================================
*/
