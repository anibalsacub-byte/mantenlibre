// Modelo de datos, persistencia en el navegador y reglas de mantenimiento.

const CLAVE = 'mantenlibre:v1';

const TIPOS = { correctiva: 'Correctiva', preventiva: 'Preventiva', predictiva: 'Predictiva', inspeccion: 'Inspección', mejora: 'Mejora' };
const PRIORIDADES = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
const ESTADOS = { abierta: 'Abierta', progreso: 'En progreso', espera: 'En espera', completada: 'Completada', cancelada: 'Cancelada' };
const CRITICIDAD = { A: 'A · Crítico', B: 'B · Importante', C: 'C · Secundario' };
const ESTADOS_ACTIVO = { operativo: 'Operativo', parado: 'Fuera de servicio', baja: 'Dado de baja' };
const UNIDADES = { dias: 'días', semanas: 'semanas', meses: 'meses' };
const MODOS_FALLA = [
  'Desgaste', 'Lubricación deficiente', 'Desalineación / desbalanceo', 'Sobrecarga', 'Falla eléctrica',
  'Contaminación / suciedad', 'Corrosión', 'Fatiga', 'Error de operación', 'Falla de diseño', 'Otro',
];
const TIPOS_PLANIFICADOS = ['preventiva', 'predictiva', 'inspeccion'];

let state;

function estadoVacio() {
  return {
    version: 1,
    config: { empresa: 'Mi empresa', anticipacion: 7, jornadaH: 8 },
    seq: { ot: 0, sol: 0 },
    ubicaciones: [], activos: [], personal: [], repuestos: [], planes: [], ordenes: [], solicitudes: [],
  };
}

function normalizar(s) {
  const base = estadoVacio();
  for (const k of Object.keys(base)) if (s[k] == null) s[k] = base[k];
  s.config = { ...base.config, ...s.config };
  s.seq = { ...base.seq, ...s.seq };
  for (const o of s.ordenes) o.historial ||= [];
  return s;
}

function cargar() {
  try {
    const texto = localStorage.getItem(CLAVE);
    state = texto ? normalizar(JSON.parse(texto)) : estadoVacio();
  } catch {
    state = estadoVacio();
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(state));
  } catch {
    aviso('No se pudo guardar en este navegador. Exporta una copia desde «Datos».', 'error');
  }
}

const hayDatos = () => ['activos', 'ordenes', 'planes', 'repuestos', 'personal'].some((k) => state[k].length);
const porId = (col, id) => (id ? state[col].find((x) => x.id === id) : undefined);
const nombreDe = (col, id, campo = 'nombre') => porId(col, id)?.[campo] ?? '—';
const etiquetaActivo = (id) => {
  const a = porId('activos', id);
  return a ? `${a.codigo ? a.codigo + ' · ' : ''}${a.nombre}` : '—';
};

// ---------- Órdenes de trabajo ----------

const abierta = (o) => o.estado !== 'completada' && o.estado !== 'cancelada';
const vencida = (o) => abierta(o) && o.fechaLimite && o.fechaLimite < hoy();

function crearOT(datos) {
  state.seq.ot += 1;
  const o = {
    id: uid(),
    num: 'OT-' + String(state.seq.ot).padStart(4, '0'),
    titulo: '', descripcion: '', tipo: 'correctiva', prioridad: 'media', estado: 'abierta',
    activoId: '', asignadoId: '', creada: hoy(), fechaLimite: '', cerrada: '', estimadoH: null,
    checklist: [], repuestos: [], mano: [], otrosCostos: 0, paradaH: null, modoFalla: '', causa: '',
    notas: '', planId: '', solicitudId: '', lecturaCierre: null, inicioReal: '', finReal: '', motivoEspera: '',
    historial: [],
    ...datos,
  };
  if (!o.historial.length) {
    const origen = o.planId ? 'Generada por plan preventivo' : o.solicitudId ? 'Creada desde una solicitud' : 'Orden creada';
    o.historial.push({ fecha: o.creada === hoy() ? ahora() : o.creada + 'T08:00', texto: origen, tipo: 'estado' });
    if (o.estado === 'completada') o.historial.push({ fecha: o.cerrada + 'T17:00', texto: 'Completada', tipo: 'estado' });
  }
  state.ordenes.push(o);
  return o;
}

// Anota un evento en la bitácora de seguimiento de la orden.
function registrar(o, texto, tipo = 'nota') {
  (o.historial ||= []).push({ fecha: ahora(), texto, tipo });
}

function costoOT(o) {
  const repuestos = o.repuestos.reduce((s, r) => s + r.cant * r.costoU, 0);
  const mano = o.mano.reduce((s, m) => s + m.horas * m.costoH, 0);
  const otros = +o.otrosCostos || 0;
  return { repuestos, mano, otros, total: repuestos + mano + otros };
}
const horasMano = (o) => o.mano.reduce((s, m) => s + +m.horas, 0);

// Cierra o cancela una OT y, si viene de un plan preventivo, programa el siguiente ciclo.
function cerrarOT(o, nuevoEstado, fechaCierre = hoy()) {
  const estabaAbierta = abierta(o);
  o.estado = nuevoEstado;
  o.cerrada = fechaCierre;
  if (!estabaAbierta) return;
  const p = porId('planes', o.planId);
  if (!p) return;
  if (p.disparo === 'medidor') {
    const a = porId('activos', p.activoId);
    p.ultimaLectura = o.lecturaCierre ?? a?.horometro ?? p.ultimaLectura;
  } else {
    p.ultima = p.base === 'cierre' ? fechaCierre : o.fechaLimite || fechaCierre;
  }
}

// ---------- Planes preventivos ----------

function avanzar(fecha, p) {
  const n = +p.cada || 1;
  if (p.unidad === 'meses') return sumarMeses(fecha, n);
  return sumarDias(fecha, p.unidad === 'semanas' ? 7 * n : n);
}
const proximaFecha = (p) => (p.disparo !== 'tiempo' ? null : p.ultima ? avanzar(p.ultima, p) : p.inicio || hoy());
const proximaLectura = (p) => (+p.ultimaLectura || 0) + (+p.cadaH || 0);
const otAbiertaDePlan = (p) => state.ordenes.find((o) => o.planId === p.id && abierta(o));

function frecuenciaTexto(p) {
  if (p.disparo === 'medidor') return `cada ${fNum(p.cadaH, 0)} h de uso`;
  return `cada ${p.cada} ${UNIDADES[p.unidad]}`;
}

function crearOTdePlan(p, fechaLimite) {
  return crearOT({
    titulo: p.nombre,
    descripcion: p.descripcion || '',
    tipo: p.tipo || 'preventiva',
    prioridad: p.prioridad || 'media',
    activoId: p.activoId,
    asignadoId: p.responsableId || '',
    fechaLimite,
    estimadoH: p.estimadoH ?? null,
    checklist: (p.checklist || []).map((t) => ({ t, ok: false })),
    planId: p.id,
  });
}

// Genera una OT por cada plan que vence dentro del horizonte de anticipación y no tiene ya una abierta.
function generarPreventivos() {
  const t = hoy();
  const horizonte = +state.config.anticipacion || 0;
  const creadas = [];
  for (const p of state.planes) {
    if (!p.activo || otAbiertaDePlan(p)) continue;
    if (p.disparo === 'tiempo') {
      const f = proximaFecha(p);
      if (f && difDias(t, f) <= horizonte) creadas.push(crearOTdePlan(p, f));
    } else {
      const a = porId('activos', p.activoId);
      if (!a || !(+p.cadaH > 0)) continue;
      // Margen del 5 % del intervalo para avisar antes de llegar a la lectura objetivo.
      if (+a.horometro >= proximaLectura(p) - 0.05 * p.cadaH) creadas.push(crearOTdePlan(p, t));
    }
  }
  if (creadas.length) guardar();
  return creadas;
}

// Fechas futuras previstas de un plan por tiempo (para el calendario).
function proyecciones(p, desde, hasta) {
  if (p.disparo !== 'tiempo' || !p.activo) return [];
  const pendiente = otAbiertaDePlan(p);
  let f = pendiente ? avanzar(pendiente.fechaLimite || hoy(), p) : proximaFecha(p);
  const fechas = [];
  for (let i = 0; f <= hasta && i < 500; i++) {
    if (f >= desde) fechas.push(f);
    f = avanzar(f, p);
  }
  return fechas;
}

// ---------- Inventario ----------

const stockBajo = (r) => +r.stock <= +r.minimo;

// ---------- Indicadores ----------

const enPeriodo = (fecha, desde) => fecha && fecha >= desde && fecha <= hoy();
const fallasCerradas = (desde, activoId) =>
  state.ordenes.filter((o) => o.tipo === 'correctiva' && o.estado === 'completada' &&
    enPeriodo(o.cerrada, desde) && (!activoId || o.activoId === activoId));

function indicadoresActivo(a, dias) {
  const desde = sumarDias(hoy(), -dias);
  const fallas = fallasCerradas(desde, a.id);
  const parada = fallas.reduce((s, o) => s + (+o.paradaH || 0), 0);
  const tiempoPlan = dias * (+a.horasDia || 24);
  const ots = state.ordenes.filter((o) => o.activoId === a.id && o.estado === 'completada' && enPeriodo(o.cerrada, desde));
  return {
    fallas: fallas.length,
    parada,
    mttr: fallas.length ? parada / fallas.length : null,
    mtbf: fallas.length ? (tiempoPlan - parada) / fallas.length : null,
    disponibilidad: tiempoPlan ? (tiempoPlan - parada) / tiempoPlan : null,
    costo: ots.reduce((s, o) => s + costoOT(o).total, 0),
    ots: ots.length,
  };
}

function mttrGlobal(dias) {
  const fallas = fallasCerradas(sumarDias(hoy(), -dias));
  const parada = fallas.reduce((s, o) => s + (+o.paradaH || 0), 0);
  return { fallas: fallas.length, mttr: fallas.length ? parada / fallas.length : null };
}

// Porcentaje de OT de planes que vencieron en el periodo y se completaron a tiempo.
function cumplimientoPM(dias) {
  const t = hoy();
  const desde = sumarDias(t, -dias);
  const debidas = state.ordenes.filter((o) => o.planId && o.fechaLimite >= desde && o.fechaLimite <= t &&
    !(abierta(o) && o.fechaLimite === t));
  const cumplidas = debidas.filter((o) => o.estado === 'completada' && o.cerrada <= o.fechaLimite).length;
  return { total: debidas.length, cumplidas, ratio: debidas.length ? cumplidas / debidas.length : null };
}

// Horas de mano de obra planificada (preventiva, predictiva, inspección, mejora) frente a correctiva.
function mezclaTrabajo(dias) {
  const desde = sumarDias(hoy(), -dias);
  let planificado = 0, correctivo = 0;
  for (const o of state.ordenes) {
    if (!enPeriodo(o.creada, desde)) continue;
    const h = horasMano(o);
    if (o.tipo === 'correctiva') correctivo += h; else planificado += h;
  }
  const total = planificado + correctivo;
  return { planificado, correctivo, total, ratio: total ? planificado / total : null };
}

function backlog() {
  const horas = state.ordenes.filter(abierta).reduce((s, o) => s + (+o.estimadoH || 1), 0);
  const capacidad = state.personal.length * (+state.config.jornadaH || 8);
  return { horas, dias: capacidad ? horas / capacidad : null };
}
