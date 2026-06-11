// Helpers compartidos entre el servicio de encuestas y los scripts de
// reparación para identificar el nombre del socio aunque llegue mal etiquetado.

/** Normaliza para comparación: sin tildes, minúsculas, sin espacios extremos. */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Vacío o "Anónimo" (con o sin tilde, cualquier capitalización) no identifica al socio. */
export function esNombreAnonimo(nombre: string | null | undefined): boolean {
  const normalizado = normalizarTexto(nombre ?? '');
  return normalizado === '' || normalizado === 'anonimo';
}

/**
 * Detecta si el enunciado de una pregunta pide el nombre del socio aunque el
 * admin la haya creado con tipo DESCRIPCION en lugar de NOMBRE_SOCIO.
 * Mismo criterio que aplica el frontend (utils/preguntaNombre.ts).
 */
export function esTextoPreguntaNombreSocio(texto: string): boolean {
  const t = normalizarTexto(texto);
  if (!t.includes('nombre')) return false;
  // Preguntas sobre el nombre del colaborador/empleado no identifican al socio.
  if (t.includes('colaborador') || t.includes('empleado')) return false;
  return (
    t.includes('socio') ||
    t.includes('apellido') ||
    t.includes('nombre completo')
  );
}
