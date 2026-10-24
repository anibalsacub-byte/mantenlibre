// Vistas: cada función devuelve el HTML de una pantalla a partir del estado actual.

const filtros = {
  ot: { estado: 'abiertas', tipo: '', activo: '', q: '' },
  seg: { resp: '', tipo: '' },
  sol: { estado: 'pendiente' },
  act: { q: '', ubic: '' },
  inv: { q: '', bajo: '' },
  cal: { mes: '' },
  rep: { dias: '90', eje: 'modoFalla' },
};

// ---------- Piezas comunes ----------

const cabecera = (titulo, sub = '', botones = '') => `
  <header class="cabecera">
    <div><h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    <div class="botones noimprimir">${botones}</div>
  </header>`;

const badge = (txt, cls = '') => `<span class="badge ${cls}">${esc(txt)}</span>`;
const badgeEstado = (o) => badge(ESTADOS[o.estado], 'e-' + o.estado);
const badgePrioridad = (o) => badge(PRIORIDADES[o.prioridad], 'p-' + o.prioridad);
const btn = (acc, txt, id = '', cls = '') =>
  `<button type="button" class="${cls}" data-acc="${acc}"${id ? ` data-id="${esc(id)}"` : ''}>${txt}</button>`;
const enlaceActivo = (id) => (porId('activos', id) ? `<a href="#/activo/${id}">${esc(etiquetaActivo(id))}</a>` : '—');

function relativo(fecha) {
  const d = difDias(hoy(), fecha);
  if (d === 0) return 'hoy';
  return d > 0 ? `en ${d} d` : `hace ${-d} d`;
}
function fechaLimiteHTML(o) {
  if (!o.fechaLimite) return '—';
  const extra = abierta(o) ? ` <small>(${relativo(o.fechaLimite)})</small>` : '';
  return `<span class="${vencida(o) ? 'txt-mal' : ''}">${fFecha(o.fechaLimite)}${extra}</span>`;
}

function tabla(cabeceras, filas, vacio = 'Sin registros.') {
  if (!filas.length) return `<p class="vacio">${vacio}</p>`;
  return `<div class="tabla-envoltura"><table>
    <thead><tr>${cabeceras.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${filas.join('')}</tbody></table></div>`;
}

const progreso = (r) => `<div class="progreso" role="progressbar" aria-valuenow="${Math.round(r * 100)}" aria-valuemin="0"
  aria-valuemax="100"><span style="width:${r * 100}%"></span></div>`;

const kpi = (titulo, valor, detalle = '', cls = '') =>
  `<div class="kpi ${cls}"><span>${titulo}</span><strong>${valor}</strong><small>${detalle}</small></div>`;

function selFiltro(clave, opciones, valor, etiqueta) {
  return `<label class="filtro"><span>${etiqueta}</span><select data-filtro="${clave}">
    ${opciones.map(([v, l]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(l)}</option>`).join('')}
  </select></label>`;
}
const buscador = (clave, valor, ph) =>
  `<label class="filtro buscar"><span>Buscar</span><input type="search" data-filtro="${clave}" value="${esc(valor)}" placeholder="${ph}"></label>`;

const opcActivos = () => [...state.activos].sort((a, b) => (a.codigo || a.nombre).localeCompare(b.codigo || b.nombre))
  .map((a) => [a.id, etiquetaActivo(a.id)]);
const opcPersonal = () => state.personal.map((p) => [p.id, p.nombre]);
const opcUbicaciones = () => state.ubicaciones.map((u) => [u.id, u.nombre]);

const noEncontrado = (que) => cabecera('No encontrado', `No existe esa ${que}. Puede que se haya eliminado.`);

const ordenOT = (a, b) => abierta(b) - abierta(a) ||
  (abierta(a) ? (a.fechaLimite || '9999').localeCompare(b.fechaLimite || '9999') : (b.cerrada || '').localeCompare(a.cerrada || ''));

function filaOT(o, cols = 'completa') {
  const base = `<td><strong>${esc(o.num)}</strong></td><td>${esc(o.titulo)}</td>`;
  if (cols === 'corta') {
    return `<tr class="clic" data-ir="#/ot/${o.id}">${base}<td>${esc(etiquetaActivo(o.activoId))}</td><td>${fechaLimiteHTML(o)}</td></tr>`;
  }
  return `<tr class="clic" data-ir="#/ot/${o.id}">${base}
    <td>${esc(etiquetaActivo(o.activoId))}</td><td>${TIPOS_CORTOS[o.tipo]}</td><td>${badgePrioridad(o)}</td>
    <td>${badgeEstado(o)}</td><td>${esc(nombreDe('personal', o.asignadoId))}</td>
    <td>${o.estado === 'completada' ? fFecha(o.cerrada) : fechaLimiteHTML(o)}</td></tr>`;
}
const CAB_OT = ['Nº', 'Título', 'Activo', 'Tipo', 'Prioridad', 'Estado', 'Responsable', 'Fecha límite / cierre'];

// ---------- Panel ----------

// Puesta en marcha en el orden que recomiendan las guías de implantación de un CMMS:
// estructura (ubicaciones y activos críticos) → recursos → preventivos → ciclo completo de una OT.
function pasosPuestaEnMarcha() {
  return [
    { ok: state.config.empresa !== 'Mi empresa', t: 'Datos de la empresa', d: 'Nombre y horizonte de programación de preventivos.', acc: 'editarConfig', b: 'Configurar' },
    { ok: state.ubicaciones.length > 0, t: 'Ubicaciones técnicas', d: 'Sede, planta, áreas o líneas (niveles 3–4 de ISO 14224).', acc: 'nuevaUbicacion', b: 'Agregar ubicación' },
    { ok: state.activos.length > 0, t: 'Activos críticos', d: 'Empieza por los equipos cuya falla para la producción o afecta la seguridad.', acc: 'nuevoActivo', b: 'Agregar activo' },
    { ok: state.personal.length > 0, t: 'Personal técnico', d: 'Técnicos y su costo por hora para costear la mano de obra.', acc: 'nuevaPersona', b: 'Agregar persona' },
    { ok: state.repuestos.length > 0, t: 'Repuestos críticos', d: 'Repuestos de los equipos críticos con su stock mínimo.', acc: 'nuevoRepuesto', b: 'Agregar repuesto' },
    { ok: state.planes.length > 0, t: 'Planes preventivos', d: 'Rutinas por calendario u horómetro, primero para los equipos críticos.', acc: 'nuevoPlan', b: 'Crear plan' },
    { ok: state.ordenes.some((o) => o.estado === 'completada'), t: 'Primera orden cerrada', d: 'Crea, ejecuta y cierra una OT para validar el ciclo completo.', acc: 'nuevaOT', b: 'Crear OT' },
  ];
}

function tarjetaPuestaEnMarcha(compacta) {
  const pasos = pasosPuestaEnMarcha();
  const hechos = pasos.filter((p) => p.ok).length;
  const siguiente = pasos.find((p) => !p.ok);
  return `<section class="tarjeta puesta">
    <header class="puesta-cab">
      <div><h2>Puesta en marcha · ${hechos} de ${pasos.length}</h2>
        <p class="sub">Configura MantenLibre para tu empresa en este orden.</p></div>
      ${compacta ? btn('ocultarPuesta', 'Ocultar', '', 'mini-btn noimprimir') : ''}
    </header>
    ${progreso(hechos / pasos.length)}
    <ol class="pasos">${pasos.map((p) => `<li class="${p.ok ? 'hecho' : p === siguiente ? 'actual' : ''}">
      <span class="marca-paso" aria-hidden="true">${p.ok ? '✓' : ''}</span>
      <div><strong>${p.t}</strong><small>${p.d}</small></div>
      ${p.ok ? '' : btn(p.acc, p.b, '', p === siguiente ? 'prim mini-btn' : 'mini-btn')}</li>`).join('')}</ol>
  </section>`;
}

function inicioVacio() {
  return `${cabecera('Bienvenido a MantenLibre', 'Software libre de gestión del mantenimiento para pequeñas y medianas empresas')}
  ${tarjetaPuestaEnMarcha(false)}
  <p class="sub">Los datos se guardan en este navegador; exporta copias de seguridad desde «Datos y configuración».
  ¿Quieres explorar antes con datos de ejemplo? Están en <a href="#/guia">Guía y ejercicios</a>.</p>`;
}

function vistaPanel() {
  if (!hayDatos()) return inicioVacio();
  const t = hoy();
  const abiertas = state.ordenes.filter(abierta);
  const venc = abiertas.filter(vencida).sort(ordenOT);
  const proximas = abiertas.filter((o) => o.fechaLimite >= t && o.fechaLimite <= sumarDias(t, 7)).sort(ordenOT);
  const cumpl = cumplimientoPM(90);
  const mt = mttrGlobal(90);
  const back = backlog();
  const bajo = state.repuestos.filter(stockBajo);
  const mes = t.slice(0, 7);
  const costoMes = state.ordenes.filter((o) => o.estado === 'completada' && o.cerrada?.startsWith(mes))
    .reduce((s, o) => s + costoOT(o).total, 0);
  const mezcla = mezclaTrabajo(90);
  const pendientes = state.solicitudes.filter((s) => s.estado === 'pendiente');

  return `${cabecera('Panel', esc(state.config.empresa) + ' · ' + fFecha(t),
    '<a class="boton" href="#/seguimiento">Ver seguimiento</a>' + btn('nuevaSolicitud', '+ Solicitud') +
    btn('nuevaOT', '+ Orden de trabajo', '', 'prim'))}
  ${!state.config.ocultarPuesta && pasosPuestaEnMarcha().some((p) => !p.ok) ? tarjetaPuestaEnMarcha(true) : ''}
  <section class="kpis">
    ${kpi('OT abiertas', abiertas.length, `${venc.length} vencidas`, venc.length ? 'mal' : '')}
    ${kpi('Cumplimiento preventivo', fPct(cumpl.ratio), `${cumpl.cumplidas} de ${cumpl.total} a tiempo · 90 días`,
      cumpl.ratio == null ? '' : cumpl.ratio < 0.8 ? 'mal' : 'bien')}
    ${kpi('MTTR', mt.mttr == null ? '—' : fNum(mt.mttr) + ' h', `${mt.fallas} fallas reparadas · 90 días`)}
    ${kpi('Backlog', fNum(back.horas) + ' h', back.dias == null ? 'registra técnicos para estimarlo' : `≈ ${fNum(back.dias)} días de la plantilla`)}
    ${kpi('Costo del mes', fDinero(costoMes), 'OT cerradas este mes')}
    ${kpi('Repuestos bajo mínimo', bajo.length, bajo.length ? 'hay que reponer' : 'todo en orden', bajo.length ? 'mal' : 'bien')}
  </section>
  <section class="rejilla2">
    <div class="tarjeta">
      <h2>Vencidas</h2>
      ${tabla(['Nº', 'Título', 'Activo', 'Límite'], venc.map((o) => filaOT(o, 'corta')), 'No hay órdenes vencidas. ¡Bien!')}
      <h2>Próximos 7 días</h2>
      ${tabla(['Nº', 'Título', 'Activo', 'Límite'], proximas.map((o) => filaOT(o, 'corta')), 'Nada programado para esta semana.')}
    </div>
    <div class="columna">
      <div class="tarjeta">
        <h2>Trabajo planificado vs correctivo</h2>
        ${mezcla.total ? `
          <div class="mezcla" role="img" aria-label="Planificado ${fPct(mezcla.ratio)}">
            <span class="plan" style="width:${mezcla.ratio * 100}%"></span><span class="corr"></span>
          </div>
          <p class="leyenda"><span class="punto plan"></span>Planificado ${fNum(mezcla.planificado)} h (${fPct(mezcla.ratio)})
          <span class="punto corr"></span>Correctivo ${fNum(mezcla.correctivo)} h</p>
          <p class="sub">Horas de mano de obra de los últimos 90 días. Una referencia habitual es ≥ 80 % planificado.</p>`
        : '<p class="vacio">Aún no hay horas de mano de obra registradas.</p>'}
      </div>
      <div class="tarjeta">
        <h2>Solicitudes pendientes</h2>
        ${pendientes.length ? `<ul class="lista">${pendientes.map((s) => `<li><a href="#/solicitudes"><strong>${esc(s.num)}</strong>
          ${esc(s.descripcion)}</a><small>${esc(s.solicitante)} · ${esc(etiquetaActivo(s.activoId))}</small></li>`).join('')}</ul>`
        : '<p class="vacio">Sin solicitudes por revisar.</p>'}
      </div>
      <div class="tarjeta">
        <h2>Stock bajo mínimo</h2>
        ${bajo.length ? `<ul class="lista">${bajo.map((r) => `<li><a href="#/inventario"><strong>${esc(r.codigo)}</strong> ${esc(r.nombre)}</a>
          <small>Stock ${fNum(r.stock)} ${esc(r.unidad)} · mínimo ${fNum(r.minimo)}</small></li>`).join('')}</ul>`
        : '<p class="vacio">Todos los repuestos por encima del mínimo.</p>'}
      </div>
    </div>
  </section>`;
}

// ---------- Órdenes de trabajo ----------

function vistaOrdenes() {
  const f = filtros.ot;
  const q = f.q.toLowerCase();
  const lista = state.ordenes.filter((o) => {
    if (f.estado === 'abiertas' && !abierta(o)) return false;
    if (f.estado === 'vencidas' && !vencida(o)) return false;
    if (ESTADOS[f.estado] && o.estado !== f.estado) return false;
    if (f.tipo && o.tipo !== f.tipo) return false;
    if (f.activo && o.activoId !== f.activo) return false;
    const texto = `${o.num} ${o.titulo} ${o.descripcion} ${etiquetaActivo(o.activoId)}`.toLowerCase();
    return !q || texto.includes(q);
  }).sort(ordenOT);

  return `${cabecera('Órdenes de trabajo', `${lista.length} de ${state.ordenes.length} órdenes`,
    btn('exportarCSV', 'Exportar CSV') + btn('nuevaOT', '+ Nueva orden', '', 'prim'))}
  <div class="filtros">
    ${selFiltro('ot.estado', [['abiertas', 'Abiertas'], ['vencidas', 'Vencidas'], ['', 'Todas'], ...Object.entries(ESTADOS)], f.estado, 'Estado')}
    ${selFiltro('ot.tipo', [['', 'Todos'], ...Object.entries(TIPOS)], f.tipo, 'Tipo')}
    ${selFiltro('ot.activo', [['', 'Todos'], ...opcActivos()], f.activo, 'Activo')}
    ${buscador('ot.q', f.q, 'Nº, título, equipo…')}
  </div>
  <section class="tarjeta">${tabla(CAB_OT, lista.map((o) => filaOT(o)), 'No hay órdenes con estos filtros.')}</section>`;
}

function fichaOT(o) {
  const hechas = o.checklist.filter((x) => x.ok).length;
  const ultimo = o.historial[o.historial.length - 1];
  const botones = {
    abierta: btn('iniciarOT', 'Iniciar', o.id, 'mini-btn prim'),
    progreso: btn('esperaOT', 'En espera', o.id, 'mini-btn') + btn('completarOT', 'Completar', o.id, 'mini-btn prim'),
    espera: btn('iniciarOT', 'Reanudar', o.id, 'mini-btn prim'),
  }[o.estado] || '';
  return `<article class="ficha clic borde-${o.prioridad}${vencida(o) ? ' venc' : ''}" data-ir="#/ot/${o.id}">
    <header><strong>${esc(o.num)}</strong>${badgePrioridad(o)}</header>
    <p class="titulo-ficha">${esc(o.titulo)}</p>
    <small class="bloque">${esc(etiquetaActivo(o.activoId))}</small>
    <div class="meta"><span>${esc(nombreDe('personal', o.asignadoId))}</span>
      <span>${o.estado === 'completada' ? 'Cerrada ' + fFecha(o.cerrada) : fechaLimiteHTML(o)}</span></div>
    ${o.checklist.length ? `<div class="avance">${progreso(hechas / o.checklist.length)}<small>${hechas}/${o.checklist.length}</small></div>` : ''}
    ${o.estado === 'espera' && o.motivoEspera ? `<p class="alerta">${esc(o.motivoEspera)}</p>` : ''}
    ${ultimo && o.estado !== 'completada' ? `<small class="bloque ultimo">Último: ${esc(ultimo.texto)}</small>` : ''}
    ${botones ? `<div class="acciones-ficha">${botones}</div>` : ''}
  </article>`;
}

function vistaSeguimiento() {
  const f = filtros.seg;
  const desde = sumarDias(hoy(), -7);
  const visibles = state.ordenes.filter((o) => (!f.resp || (f.resp === '-' ? !o.asignadoId : o.asignadoId === f.resp)) &&
    (!f.tipo || o.tipo === f.tipo));
  const columnas = [
    ['abierta', 'Por hacer', visibles.filter((o) => o.estado === 'abierta')],
    ['progreso', 'En progreso', visibles.filter((o) => o.estado === 'progreso')],
    ['espera', 'En espera', visibles.filter((o) => o.estado === 'espera')],
    ['completada', 'Completadas (7 días)', visibles.filter((o) => o.estado === 'completada' && o.cerrada >= desde)],
  ];
  const venc = visibles.filter(vencida).length;
  return `${cabecera('Seguimiento de órdenes de trabajo',
    `${visibles.filter(abierta).length} órdenes en curso · ${venc ? `<span class="txt-mal">${venc} vencidas</span>` : 'ninguna vencida'}`,
    btn('revisarPlanes', 'Generar preventivos') + btn('nuevaOT', '+ Nueva orden', '', 'prim'))}
  <div class="filtros">
    ${selFiltro('seg.resp', [['', 'Todos'], ['-', 'Sin asignar'], ...opcPersonal()], f.resp, 'Responsable')}
    ${selFiltro('seg.tipo', [['', 'Todos'], ...Object.entries(TIPOS)], f.tipo, 'Tipo')}
  </div>
  <section class="tablero">${columnas.map(([estado, titulo, lista]) => {
    const horas = lista.reduce((s, o) => s + (+o.estimadoH || 0), 0);
    return `<div class="columna-k k-${estado}">
      <h2>${titulo} <span class="cuenta">${lista.length}</span>${estado !== 'completada' && horas ? `<small>${fNum(horas)} h est.</small>` : ''}</h2>
      ${lista.sort(ordenOT).map(fichaOT).join('') || '<p class="vacio">Sin órdenes.</p>'}
    </div>`;
  }).join('')}</section>`;
}

function vistaOT(id) {
  const o = porId('ordenes', id);
  if (!o) return noEncontrado('orden de trabajo');
  const c = costoOT(o);
  const plan = porId('planes', o.planId);
  const sol = porId('solicitudes', o.solicitudId);
  const ab = abierta(o);
  const hechas = o.checklist.filter((x) => x.ok).length;
  const origen = plan ? `Plan: <a href="#/planes">${esc(plan.nombre)}</a>` : sol ? `Solicitud ${esc(sol.num)} de ${esc(sol.solicitante)}` : 'Manual';

  const botones = [
    ab && o.estado !== 'progreso' ? btn('iniciarOT', 'Iniciar', o.id) : '',
    ab && o.estado !== 'espera' ? btn('esperaOT', 'Poner en espera', o.id) : '',
    ab ? btn('completarOT', 'Completar', o.id, 'prim') : '',
    ab ? btn('cancelarOT', 'Cancelar', o.id) : btn('reabrirOT', 'Reabrir', o.id),
    btn('editarOT', 'Editar', o.id),
    btn('imprimir', 'Imprimir'),
  ].join('');

  return `<div class="solo-imprimir membrete"><strong>${esc(state.config.empresa)}</strong><span>Orden de trabajo</span></div>
  ${cabecera(`${o.num} · ${o.titulo}`, `${badgeEstado(o)} ${badgePrioridad(o)} ${badge(TIPOS[o.tipo] + (o.tipo === 'correctiva' && o.modalidad ? ' ' + o.modalidad : ''), 'neutro')}`, botones)}
  <section class="rejilla2">
    <div class="tarjeta">
      <h2>Datos</h2>
      <dl class="datos">
        <dt>Activo</dt><dd>${enlaceActivo(o.activoId)}</dd>
        <dt>Responsable</dt><dd>${esc(nombreDe('personal', o.asignadoId))}</dd>
        <dt>Creada</dt><dd>${fFecha(o.creada)}</dd>
        <dt>Fecha límite</dt><dd>${fechaLimiteHTML(o)}</dd>
        <dt>Cerrada</dt><dd>${fFecha(o.cerrada)}</dd>
        <dt>Inicio real</dt><dd>${fFechaHora(o.inicioReal)}</dd>
        <dt>Fin real</dt><dd>${fFechaHora(o.finReal)}</dd>
        <dt>Horas estimadas / reales</dt><dd>${fNum(o.estimadoH)} / ${fNum(horasMano(o), 2)}</dd>
        <dt>Origen</dt><dd>${origen}</dd>
      </dl>
      ${o.estado === 'espera' && o.motivoEspera ? `<p class="alerta">En espera · ${esc(o.motivoEspera)}</p>` : ''}
      ${o.descripcion ? `<h3>Descripción</h3><p class="texto">${esc(o.descripcion)}</p>` : ''}
      ${o.notas ? `<h3>Notas</h3><p class="texto">${esc(o.notas)}</p>` : ''}
    </div>
    <div class="tarjeta">
      <h2>Lista de tareas <small>${hechas}/${o.checklist.length}</small></h2>
      ${o.checklist.length ? progreso(hechas / o.checklist.length) : ''}
      ${o.checklist.length ? `<ul class="checklist">${o.checklist.map((x, i) => `<li>
        <label><input type="checkbox" data-check="${o.id}" data-i="${i}"${x.ok ? ' checked' : ''}> <span>${esc(x.t)}</span></label>
        <button type="button" class="mini noimprimir" data-acc="quitarTarea" data-id="${o.id}:${i}" aria-label="Quitar tarea">×</button></li>`).join('')}</ul>`
      : '<p class="vacio">Sin tareas. Añade los pasos que debe seguir el técnico.</p>'}
      <div class="fila-form noimprimir">
        <input id="nuevaTarea" placeholder="Nueva tarea…" aria-label="Nueva tarea">${btn('agregarTarea', 'Añadir', o.id)}
      </div>
    </div>
  </section>

  <section class="tarjeta">
    <h2>Repuestos utilizados</h2>
    ${tabla(['Código', 'Repuesto', 'Cantidad', 'Costo unit.', 'Subtotal', ''], o.repuestos.map((r, i) => {
      const rep = porId('repuestos', r.repuestoId);
      return `<tr><td>${esc(rep?.codigo ?? '—')}</td><td>${esc(rep?.nombre ?? 'Repuesto eliminado')}</td>
        <td>${fNum(r.cant, 2)} ${esc(rep?.unidad ?? '')}</td><td>${fDinero(r.costoU)}</td><td>${fDinero(r.cant * r.costoU)}</td>
        <td class="noimprimir"><button type="button" class="mini" data-acc="quitarRepuesto" data-id="${o.id}:${i}" aria-label="Quitar">×</button></td></tr>`;
    }), 'Sin repuestos.')}
    <div class="fila-form noimprimir">
      <select id="selRep" aria-label="Repuesto"><option value="">Elegir repuesto…</option>
        ${state.repuestos.map((r) => `<option value="${r.id}">${esc(r.codigo)} · ${esc(r.nombre)} (stock ${fNum(r.stock)})</option>`).join('')}
      </select>
      <input id="cantRep" type="number" min="0" step="any" value="1" aria-label="Cantidad" class="corto">
      ${btn('agregarRepuesto', 'Añadir y descontar stock', o.id)}
    </div>
  </section>

  <section class="tarjeta">
    <h2>Mano de obra</h2>
    ${tabla(['Fecha', 'Técnico', 'Horas', 'Costo/h', 'Subtotal', ''], o.mano.map((m, i) => `<tr>
      <td>${fFecha(m.fecha)}</td><td>${esc(nombreDe('personal', m.personaId))}</td><td>${fNum(m.horas, 2)}</td>
      <td>${fDinero(m.costoH)}</td><td>${fDinero(m.horas * m.costoH)}</td>
      <td class="noimprimir"><button type="button" class="mini" data-acc="quitarMano" data-id="${o.id}:${i}" aria-label="Quitar">×</button></td></tr>`),
      'Sin horas registradas.')}
    <div class="fila-form noimprimir">
      <select id="selPer" aria-label="Técnico"><option value="">Elegir técnico…</option>
        ${state.personal.map((p) => `<option value="${p.id}"${p.id === o.asignadoId ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}
      </select>
      <input id="horasPer" type="number" min="0" step="0.25" placeholder="Horas" aria-label="Horas" class="corto">
      <input id="fechaPer" type="date" value="${hoy()}" aria-label="Fecha">
      ${btn('agregarMano', 'Registrar horas', o.id)}
    </div>
  </section>

  <section class="rejilla2">
    <div class="tarjeta">
      <h2>Cierre técnico <small>ISO 14224</small></h2>
      ${o.estado === 'completada' ? `<dl class="datos">
        <dt>Actividad</dt><dd>${esc(o.actividad || '—')}</dd>
        <dt>Tiempo de parada</dt><dd>${o.paradaH == null ? '—' : fNum(o.paradaH, 2) + ' h'}</dd>
        <dt>Modo de falla</dt><dd>${esc(o.modoFalla || '—')}</dd>
        <dt>Severidad</dt><dd>${esc(SEVERIDAD[o.severidad] || '—')}</dd>
        <dt>Mecanismo</dt><dd>${esc(o.mecanismo || '—')}</dd>
        <dt>Causa</dt><dd>${esc(o.causaCat || '—')}</dd>
        <dt>Detección</dt><dd>${esc(o.deteccion || '—')}</dd>
        <dt>Causa raíz y hallazgos</dt><dd>${esc(o.causa || '—')}</dd>
        <dt>Lectura de horómetro</dt><dd>${o.lecturaCierre == null ? '—' : fNum(o.lecturaCierre, 0) + ' h'}</dd>
      </dl>` : '<p class="vacio">Se completa al cerrar la orden: actividad, parada y, si hubo falla, modo, mecanismo, causa y método de detección.</p>'}
    </div>
    <div class="tarjeta">
      <h2>Costos</h2>
      <dl class="datos">
        <dt>Repuestos</dt><dd>${fDinero(c.repuestos)}</dd>
        <dt>Mano de obra (${fNum(horasMano(o), 2)} h)</dt><dd>${fDinero(c.mano)}</dd>
        <dt>Otros (servicios externos…)</dt><dd>${fDinero(c.otros)}</dd>
        <dt><strong>Total</strong></dt><dd><strong>${fDinero(c.total)}</strong></dd>
      </dl>
    </div>
  </section>
  <section class="tarjeta">
    <h2>Seguimiento</h2>
    <div class="fila-form noimprimir arriba">
      <input id="nuevoComentario" placeholder="Anotar avance, hallazgo o comentario…" aria-label="Comentario">
      ${btn('comentarOT', 'Anotar', o.id, 'prim')}
    </div>
    <ol class="linea-tiempo">${[...o.historial].reverse().map((h) => `<li class="h-${h.tipo}">
      <time>${fFechaHora(h.fecha)}</time><span>${esc(h.texto)}</span></li>`).join('')}</ol>
  </section>
  <section class="solo-imprimir firmas"><div>Ejecutado por</div><div>Recibido por (producción)</div><div>Aprobado por</div></section>`;
}

// ---------- Solicitudes ----------

function vistaSolicitudes() {
  const f = filtros.sol;
  const lista = state.solicitudes.filter((s) => !f.estado || s.estado === f.estado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const estadosSol = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };
  return `${cabecera('Solicitudes de trabajo', 'Cualquier persona reporta un problema; mantenimiento lo revisa y lo convierte en orden.',
    btn('nuevaSolicitud', '+ Nueva solicitud', '', 'prim'))}
  <div class="filtros">${selFiltro('sol.estado', [['', 'Todas'], ...Object.entries(estadosSol)], f.estado, 'Estado')}</div>
  <section class="tarjeta">${tabla(['Nº', 'Fecha', 'Solicitante', 'Activo', 'Descripción', 'Prioridad', 'Estado', ''],
    lista.map((s) => {
      const ot = porId('ordenes', s.otId);
      const acciones = s.estado === 'pendiente'
        ? btn('aprobarSolicitud', 'Crear OT', s.id, 'prim mini-btn') + btn('rechazarSolicitud', 'Rechazar', s.id, 'mini-btn') + btn('editarSolicitud', 'Editar', s.id, 'mini-btn')
        : ot ? `<a href="#/ot/${ot.id}">${esc(ot.num)}</a>` : '';
      return `<tr><td><strong>${esc(s.num)}</strong></td><td>${fFecha(s.fecha)}</td><td>${esc(s.solicitante)}</td>
        <td>${esc(etiquetaActivo(s.activoId))}</td><td>${esc(s.descripcion)}</td><td>${badgePrioridad(s)}</td>
        <td>${badge(estadosSol[s.estado], 's-' + s.estado)}</td><td class="acciones">${acciones}</td></tr>`;
    }), 'No hay solicitudes.')}</section>`;
}

// ---------- Planes preventivos ----------

function situacionPlan(p) {
  if (!p.activo) return badge('Pausado', 'neutro');
  const ot = otAbiertaDePlan(p);
  if (ot) return `<a href="#/ot/${ot.id}">${badge(ot.num + (vencida(ot) ? ' · vencida' : ' · generada'), vencida(ot) ? 'mal' : 'info')}</a>`;
  if (p.disparo === 'medidor') {
    const a = porId('activos', p.activoId);
    if (a?.horometro == null) return badge('Sin lectura de horómetro', 'mal');
    return badge(`Faltan ${fNum(proximaLectura(p) - a.horometro, 0)} h`, 'bien');
  }
  return badge(relativo(proximaFecha(p)), 'bien');
}

function vistaPlanes() {
  const lista = [...state.planes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  return `${cabecera('Planes preventivos',
    `Las órdenes se generan solas ${state.config.anticipacion} días antes del vencimiento (o al acercarse a las horas de uso).`,
    btn('revisarPlanes', 'Revisar vencimientos') + btn('nuevoPlan', '+ Nuevo plan', '', 'prim'))}
  <section class="tarjeta">${tabla(['Plan', 'Activo', 'Tipo', 'Frecuencia', 'Próximo', 'Situación', 'Responsable', ''],
    lista.map((p) => {
      const proximo = p.disparo === 'medidor' ? `${fNum(proximaLectura(p), 0)} h` : fFecha(proximaFecha(p));
      return `<tr class="clic" data-acc="editarPlan" data-id="${p.id}"><td><strong>${esc(p.nombre)}</strong>
        <small class="bloque">${p.checklist.length} tareas · ${fNum(p.estimadoH)} h estimadas</small></td>
        <td>${esc(etiquetaActivo(p.activoId))}</td><td>${TIPOS_CORTOS[p.tipo]}</td><td>${frecuenciaTexto(p)}
        ${p.disparo === 'tiempo' ? `<small class="bloque">${p.base === 'cierre' ? 'flotante' : 'fecha fija'}</small>` : ''}</td>
        <td>${proximo}</td><td>${situacionPlan(p)}</td><td>${esc(nombreDe('personal', p.responsableId))}</td>
        <td class="acciones">${btn('generarAhora', 'Generar OT ahora', p.id, 'mini-btn')}</td></tr>`;
    }), 'Aún no hay planes. Crea uno para cada rutina: lubricación, inspección, cambio de filtros…')}</section>`;
}

// ---------- Calendario ----------

function vistaCalendario() {
  const mes = filtros.cal.mes || hoy().slice(0, 7);
  const [anio, m] = mes.split('-').map(Number);
  const primero = `${mes}-01`;
  const diasMes = new Date(anio, m, 0).getDate();
  const huecos = (deISO(primero).getDay() + 6) % 7; // la semana empieza en lunes
  const desde = sumarDias(primero, -huecos);
  const celdas = Math.ceil((huecos + diasMes) / 7) * 7;
  const hasta = sumarDias(desde, celdas - 1);
  const t = hoy();

  const eventos = {};
  const agregar = (f, ev) => (eventos[f] ??= []).push(ev);
  for (const o of state.ordenes) {
    const f = o.estado === 'completada' ? o.cerrada : o.fechaLimite;
    if (!f || f < desde || f > hasta || o.estado === 'cancelada') continue;
    agregar(f, { html: `<a class="chip t-${o.tipo}${vencida(o) ? ' venc' : ''}${abierta(o) ? '' : ' hecha'}" href="#/ot/${o.id}"
      title="${esc(o.num + ' · ' + o.titulo)}">${esc(o.num)} ${esc(o.titulo)}</a>`, texto: `${o.num} · ${o.titulo}`, o });
  }
  for (const p of state.planes) {
    for (const f of proyecciones(p, t > desde ? t : desde, hasta)) {
      agregar(f, { html: `<a class="chip previsto" href="#/planes" title="Previsto: ${esc(p.nombre)}">${esc(p.nombre)}</a>`,
        texto: `Previsto · ${p.nombre}` });
    }
  }

  let dias = '';
  for (let i = 0; i < celdas; i++) {
    const f = sumarDias(desde, i);
    const cls = [f.slice(0, 7) !== mes ? 'fuera' : '', f === t ? 'hoy' : ''].join(' ');
    dias += `<div class="dia ${cls}"><span class="num">${deISO(f).getDate()}</span>${(eventos[f] || []).map((e) => e.html).join('')}</div>`;
  }
  const agenda = Object.keys(eventos).filter((f) => f.startsWith(mes)).sort()
    .map((f) => `<li><strong>${fFecha(f)}</strong><span>${eventos[f].map((e) => e.o
      ? `<a href="#/ot/${e.o.id}">${esc(e.texto)}</a>` : `<em>${esc(e.texto)}</em>`).join('<br>')}</span></li>`).join('');
  const nombreMes = deISO(primero).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  const titulo = nombreMes[0].toUpperCase() + nombreMes.slice(1);

  return `${cabecera('Calendario', 'Órdenes por fecha límite (o de cierre) y preventivos previstos a futuro.',
    btn('mesAnterior', '‹ Anterior') + btn('mesHoy', 'Hoy') + btn('mesSiguiente', 'Siguiente ›'))}
  <section class="tarjeta">
    <h2 class="mes">${esc(titulo)}</h2>
    <div class="calendario">
      ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="dsem">${d}</div>`).join('')}
      ${dias}
    </div>
    <p class="leyenda"><span class="punto t-correctiva"></span>Correctiva <span class="punto t-preventiva"></span>Preventiva / inspección
      <span class="punto t-mejora"></span>Mejora <span class="punto previsto"></span>Previsto <span class="punto venc"></span>Vencida</p>
  </section>
  <section class="tarjeta"><h2>Agenda del mes</h2>${agenda ? `<ul class="agenda">${agenda}</ul>` : '<p class="vacio">Nada este mes.</p>'}</section>`;
}

// ---------- Activos ----------

function vistaActivos() {
  const f = filtros.act;
  const q = f.q.toLowerCase();
  const lista = state.activos.filter((a) => (!f.ubic || a.ubicacionId === f.ubic) &&
    (!q || `${a.codigo} ${a.nombre} ${a.categoria} ${a.fabricante} ${a.modelo}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.codigo || a.nombre).localeCompare(b.codigo || b.nombre));
  return `${cabecera('Activos', 'Jerarquía de equipos según la taxonomía ISO 14224 (sistema → equipo → subunidad → ítem mantenible).', btn('nuevoActivo', '+ Nuevo activo', '', 'prim'))}
  <div class="filtros">
    ${selFiltro('act.ubic', [['', 'Todas'], ...opcUbicaciones()], f.ubic, 'Ubicación técnica')}
    ${buscador('act.q', f.q, 'Código, nombre, modelo…')}
  </div>
  <section class="tarjeta">${tabla(['Código', 'Nombre', 'Ubicación técnica', 'Clase de equipo', 'Criticidad', 'Estado', 'Horómetro', 'OT abiertas'],
    lista.map((a) => {
      const padre = porId('activos', a.padreId);
      const nAb = state.ordenes.filter((o) => o.activoId === a.id && abierta(o)).length;
      return `<tr class="clic" data-ir="#/activo/${a.id}"><td><strong>${esc(a.codigo || '—')}</strong></td>
        <td>${esc(a.nombre)}${padre ? `<small class="bloque">parte de ${esc(padre.nombre)}</small>` : ''}</td>
        <td>${esc(nombreDe('ubicaciones', a.ubicacionId))}</td><td>${esc(a.categoria || '—')}</td>
        <td>${badge(a.criticidad, 'c-' + a.criticidad)}</td><td>${badge(ESTADOS_ACTIVO[a.estado], 'a-' + a.estado)}</td>
        <td>${a.horometro == null ? '—' : fNum(a.horometro, 0) + ' h'}</td><td>${nAb || ''}</td></tr>`;
    }), 'No hay activos registrados.')}</section>`;
}

function vistaActivo(id) {
  const a = porId('activos', id);
  if (!a) return noEncontrado('ficha de activo');
  const k = indicadoresActivo(a, 365);
  const planes = state.planes.filter((p) => p.activoId === a.id);
  const ots = state.ordenes.filter((o) => o.activoId === a.id).sort(ordenOT);
  const hijos = state.activos.filter((x) => x.padreId === a.id);
  const padre = porId('activos', a.padreId);

  return `${cabecera(`${a.codigo ? a.codigo + ' · ' : ''}${a.nombre}`,
    `${badge(ESTADOS_ACTIVO[a.estado], 'a-' + a.estado)} ${badge('Criticidad ' + CRITICIDAD[a.criticidad], 'c-' + a.criticidad)}`,
    btn('lecturaActivo', 'Registrar horómetro', a.id) + btn('editarActivo', 'Editar', a.id) + btn('nuevaOT', '+ Orden de trabajo', a.id, 'prim'))}
  <section class="kpis">
    ${kpi('Fallas (12 meses)', k.fallas, `${fNum(k.parada)} h de parada`)}
    ${kpi('MTBF', k.mtbf == null ? '—' : fNum(k.mtbf, 0) + ' h', 'tiempo medio entre fallas')}
    ${kpi('MTTR', k.mttr == null ? '—' : fNum(k.mttr) + ' h', 'tiempo medio de reparación')}
    ${kpi('Disponibilidad', fPct(k.disponibilidad, 1), `sobre ${fNum(a.horasDia || 24)} h/día`)}
    ${kpi('Costo (12 meses)', fDinero(k.costo), `${k.ots} órdenes cerradas`)}
  </section>
  <section class="rejilla2">
    <div class="tarjeta"><h2>Ficha técnica</h2>
      <dl class="datos">
        <dt>Ubicación técnica</dt><dd>${esc(nombreDe('ubicaciones', a.ubicacionId))}</dd>
        <dt>Forma parte de</dt><dd>${padre ? `<a href="#/activo/${padre.id}">${esc(etiquetaActivo(padre.id))}</a>` : '—'}</dd>
        <dt>Clase de equipo</dt><dd>${esc(a.categoria || '—')}</dd>
        <dt>Nivel taxonómico</dt><dd>${esc(NIVELES[a.nivel] || '—')}</dd>
        <dt>Fabricante / modelo</dt><dd>${esc([a.fabricante, a.modelo].filter(Boolean).join(' · ') || '—')}</dd>
        <dt>Nº de serie</dt><dd>${esc(a.serie || '—')}</dd>
        <dt>Instalación</dt><dd>${fFecha(a.instalacion)}</dd>
        <dt>Horómetro</dt><dd>${a.horometro == null ? 'sin medidor' : fNum(a.horometro, 0) + ' h'}</dd>
      </dl>
      ${a.notas ? `<h3>Notas</h3><p class="texto">${esc(a.notas)}</p>` : ''}
      ${hijos.length ? `<h3>Componentes</h3><ul class="lista">${hijos.map((h) => `<li><a href="#/activo/${h.id}">${esc(etiquetaActivo(h.id))}</a></li>`).join('')}</ul>` : ''}
    </div>
    <div class="tarjeta"><h2>Planes preventivos</h2>
      ${tabla(['Plan', 'Frecuencia', 'Situación'], planes.map((p) => `<tr class="clic" data-acc="editarPlan" data-id="${p.id}">
        <td>${esc(p.nombre)}</td><td>${frecuenciaTexto(p)}</td><td>${situacionPlan(p)}</td></tr>`), 'Este activo no tiene planes preventivos.')}
      <div class="noimprimir">${btn('nuevoPlan', '+ Plan para este activo', a.id)}</div>
    </div>
  </section>
  <section class="tarjeta"><h2>Historial de órdenes</h2>${tabla(CAB_OT, ots.map((o) => filaOT(o)), 'Sin órdenes de trabajo.')}</section>`;
}

// ---------- Inventario ----------

function vistaInventario() {
  const f = filtros.inv;
  const q = f.q.toLowerCase();
  const desde = sumarDias(hoy(), -90);
  const consumo = {};
  for (const o of state.ordenes) {
    if (!enPeriodo(o.creada, desde)) continue;
    for (const r of o.repuestos) consumo[r.repuestoId] = (consumo[r.repuestoId] || 0) + +r.cant;
  }
  const lista = state.repuestos.filter((r) => (!f.bajo || stockBajo(r)) && (!q || `${r.codigo} ${r.nombre}`.toLowerCase().includes(q)))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  const valor = state.repuestos.reduce((s, r) => s + r.stock * r.costo, 0);
  return `${cabecera('Inventario de repuestos', `Valor total en almacén: ${fDinero(valor)}`, btn('nuevoRepuesto', '+ Nuevo repuesto', '', 'prim'))}
  <div class="filtros">
    ${selFiltro('inv.bajo', [['', 'Todos'], ['1', 'Solo bajo mínimo']], f.bajo, 'Mostrar')}
    ${buscador('inv.q', f.q, 'Código o nombre…')}
  </div>
  <section class="tarjeta">${tabla(['Código', 'Repuesto', 'Stock', 'Mínimo', 'Costo unit.', 'Valor', 'Ubicación', 'Consumo 90 d', ''],
    lista.map((r) => `<tr class="clic" data-acc="editarRepuesto" data-id="${r.id}"><td><strong>${esc(r.codigo)}</strong></td><td>${esc(r.nombre)}</td>
      <td>${stockBajo(r) ? badge(fNum(r.stock, 2) + ' ' + r.unidad, 'mal') : fNum(r.stock, 2) + ' ' + esc(r.unidad)}</td>
      <td>${fNum(r.minimo, 2)}</td><td>${fDinero(r.costo)}</td><td>${fDinero(r.stock * r.costo)}</td><td>${esc(r.ubicacion || '—')}</td>
      <td>${fNum(consumo[r.id] || 0, 2)}</td><td class="acciones">${btn('entradaRepuesto', '+ Entrada', r.id, 'mini-btn')}</td></tr>`),
    'No hay repuestos con estos filtros.')}</section>`;
}

// ---------- Personal y ubicaciones ----------

function vistaPersonal() {
  const desde = sumarDias(hoy(), -90);
  return `${cabecera('Personal', 'Técnicos y su costo por hora (para calcular el costo de la mano de obra).',
    btn('nuevaPersona', '+ Nueva persona', '', 'prim'))}
  <section class="tarjeta">${tabla(['Nombre', 'Especialidad', 'Costo/h', 'Contacto / turno', 'OT abiertas asignadas', 'Horas 90 d'],
    state.personal.map((p) => {
      const nAb = state.ordenes.filter((o) => o.asignadoId === p.id && abierta(o)).length;
      const horas = state.ordenes.flatMap((o) => o.mano).filter((m) => m.personaId === p.id && enPeriodo(m.fecha, desde))
        .reduce((s, m) => s + +m.horas, 0);
      return `<tr class="clic" data-acc="editarPersona" data-id="${p.id}"><td><strong>${esc(p.nombre)}</strong></td>
        <td>${esc(p.especialidad || '—')}</td><td>${fDinero(p.costoH)}</td><td>${esc(p.contacto || '—')}</td><td>${nAb}</td><td>${fNum(horas)}</td></tr>`;
    }), 'Aún no hay personal registrado.')}</section>`;
}

function vistaUbicaciones() {
  const niveles = { instalacion: 'Instalación / sede', planta: 'Planta / área / línea' };
  return `${cabecera('Ubicaciones técnicas', 'Sede, plantas, áreas o líneas donde están los activos (niveles 3–4 de ISO 14224).',
    btn('nuevaUbicacion', '+ Nueva ubicación', '', 'prim'))}
  <section class="tarjeta">${tabla(['Nombre', 'Nivel', 'Descripción', 'Activos'], state.ubicaciones.map((u) =>
    `<tr class="clic" data-acc="editarUbicacion" data-id="${u.id}"><td><strong>${esc(u.nombre)}</strong></td>
      <td>${esc(niveles[u.nivel] || '—')}</td><td>${esc(u.descripcion || '—')}</td>
      <td>${state.activos.filter((a) => a.ubicacionId === u.id).length}</td></tr>`), 'Aún no hay ubicaciones.')}</section>`;
}

// ---------- Reportes ----------

function vistaReportes() {
  const dias = +filtros.rep.dias;
  const desde = sumarDias(hoy(), -dias);
  const filasActivos = state.activos.map((a) => ({ a, k: indicadoresActivo(a, dias) }))
    .sort((x, y) => y.k.costo - x.k.costo || y.k.fallas - x.k.fallas);

  const fallas = fallasCerradas(desde);
  const ejes = { modoFalla: 'Modo de falla', mecanismo: 'Mecanismo de falla', causaCat: 'Causa de la falla', deteccion: 'Método de detección' };
  const eje = filtros.rep.eje;
  const modos = {};
  for (const o of fallas) {
    const m = o[eje] || 'Sin clasificar';
    modos[m] ??= { n: 0, h: 0 };
    modos[m].n += 1;
    modos[m].h += +o.paradaH || 0;
  }
  const pareto = Object.entries(modos).sort((a, b) => b[1].h - a[1].h || b[1].n - a[1].n);
  const totalH = pareto.reduce((s, [, v]) => s + v.h, 0);
  let acumulado = 0;

  const porTipo = {};
  for (const o of state.ordenes) {
    if (o.estado !== 'completada' || !enPeriodo(o.cerrada, desde)) continue;
    const c = costoOT(o);
    porTipo[o.tipo] ??= { n: 0, mano: 0, repuestos: 0, otros: 0, total: 0 };
    const t = porTipo[o.tipo];
    t.n += 1; t.mano += c.mano; t.repuestos += c.repuestos; t.otros += c.otros; t.total += c.total;
  }
  const maxCosto = Math.max(1, ...Object.values(porTipo).map((t) => t.total));

  return `${cabecera('Reportes e indicadores', 'Indicadores clásicos de gestión del mantenimiento.', btn('imprimir', 'Imprimir'))}
  <div class="filtros">${selFiltro('rep.dias', [['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['180', 'Últimos 180 días'], ['365', 'Últimos 12 meses']], filtros.rep.dias, 'Periodo')}</div>
  <section class="tarjeta"><h2>Indicadores por activo</h2>
    ${tabla(['Activo', 'Criticidad', 'Fallas', 'Parada (h)', 'MTBF (h)', 'MTTR (h)', 'Disponibilidad', 'OT cerradas', 'Costo'],
      filasActivos.map(({ a, k }) => `<tr class="clic" data-ir="#/activo/${a.id}"><td>${esc(etiquetaActivo(a.id))}</td>
        <td>${badge(a.criticidad, 'c-' + a.criticidad)}</td><td>${k.fallas}</td><td>${fNum(k.parada)}</td><td>${fNum(k.mtbf, 0)}</td>
        <td>${fNum(k.mttr)}</td><td>${fPct(k.disponibilidad, 1)}</td><td>${k.ots}</td><td>${fDinero(k.costo)}</td></tr>`), 'No hay activos.')}
  </section>
  <section class="rejilla2">
    <div class="tarjeta"><h2>Pareto de fallas (ISO 14224)</h2>
      <div class="filtros">${selFiltro('rep.eje', Object.entries(ejes), eje, 'Agrupar por')}</div>
      ${tabla([ejes[eje], 'Fallas', 'Parada (h)', '% acumulado'], pareto.map(([m, v]) => {
        acumulado += v.h;
        const pct = totalH ? v.h / totalH : 0;
        return `<tr><td>${esc(m)}</td><td>${v.n}</td><td><div class="barra"><span style="width:${pct * 100}%"></span>${fNum(v.h)}</div></td>
          <td>${totalH ? fPct(acumulado / totalH) : '—'}</td></tr>`;
      }), 'No hay fallas cerradas en el periodo.')}
      <p class="sub">Ordenado por horas de parada: las primeras filas suelen explicar ~80 % del problema.</p>
    </div>
    <div class="tarjeta"><h2>Costos por tipo de trabajo</h2>
      ${tabla(['Tipo', 'OT', 'Mano de obra', 'Repuestos', 'Otros', 'Total'], Object.entries(porTipo).sort((a, b) => b[1].total - a[1].total)
        .map(([tipo, t]) => `<tr><td>${TIPOS[tipo]}</td><td>${t.n}</td><td>${fDinero(t.mano)}</td><td>${fDinero(t.repuestos)}</td>
          <td>${fDinero(t.otros)}</td><td><div class="barra"><span style="width:${(t.total / maxCosto) * 100}%"></span>${fDinero(t.total)}</div></td></tr>`),
      'No hay órdenes cerradas en el periodo.')}
    </div>
  </section>
  <section class="tarjeta formulas"><h2>Cómo se calculan</h2>
    <p class="sub">Definiciones alineadas con ISO 14224 (datos de falla y mantenimiento) y EN 15341 (indicadores de mantenimiento).</p>
    <dl>
      <dt>MTBF (tiempo medio entre fallas)</dt><dd>(tiempo planificado − tiempo de parada) ÷ nº de fallas. El tiempo planificado
        es días del periodo × horas de operación por día del activo.</dd>
      <dt>MTTR (tiempo medio de reparación)</dt><dd>tiempo total de parada por fallas ÷ nº de fallas.</dd>
      <dt>Disponibilidad</dt><dd>(tiempo planificado − parada) ÷ tiempo planificado ≈ MTBF ÷ (MTBF + MTTR).</dd>
      <dt>Cumplimiento preventivo</dt><dd>OT de planes completadas en o antes de su fecha límite ÷ OT de planes que vencieron en el periodo.</dd>
      <dt>Backlog</dt><dd>suma de horas estimadas de las OT abiertas ÷ (técnicos × horas de jornada).</dd>
    </dl>
    <p class="sub">Solo cuentan como fallas las órdenes <em>correctivas completadas</em>; registra siempre el tiempo de parada al cerrarlas.</p>
  </section>`;
}

// ---------- Datos y configuración ----------

function vistaDatos() {
  const c = state.config;
  return `${cabecera('Datos y configuración', 'Tus datos viven solo en este navegador. Exporta copias con frecuencia.')}
  <section class="rejilla2">
    <div class="tarjeta"><h2>Configuración</h2>
      <dl class="datos">
        <dt>Empresa</dt><dd>${esc(c.empresa)}</dd>
        <dt>Moneda</dt><dd>Soles (PEN)</dd>
        <dt>Generar preventivos con</dt><dd>${c.anticipacion} días de anticipación</dd>
        <dt>Jornada por técnico</dt><dd>${fNum(c.jornadaH)} h/día</dd>
      </dl>
      ${btn('editarConfig', 'Editar configuración')}
    </div>
    <div class="tarjeta"><h2>Copia de seguridad</h2>
      <p>Guarda un archivo <code>.json</code> con todo (activos, órdenes, planes…). Sirve como respaldo y para pasar los
      datos a otro equipo o navegador.</p>
      <div class="botones">${btn('exportarJSON', 'Exportar copia (.json)', '', 'prim')}
        <label class="boton">Importar copia… <input type="file" id="archivoImportar" accept=".json,application/json" hidden></label>
        ${btn('exportarCSV', 'Órdenes en CSV (Excel)')}</div>
    </div>
  </section>
  <section class="tarjeta peligro-zona"><h2>Borrar todo</h2>
    <p>Elimina todos los datos de este navegador. Exporta antes una copia si quieres conservarlos.</p>
    ${btn('borrarTodo', 'Borrar todos los datos', '', 'peligro')}
  </section>
  <section class="tarjeta"><h2>Acerca de MantenLibre</h2>
    <p>© 2026 Ricardo Anibal Sánchez Cuba.</p>
    <p>Software libre publicado con
    <a href="https://github.com/anibalsacub-byte/mantenlibre/blob/main/LICENSE" target="_blank" rel="noopener">licencia MIT</a>:
    puede usarse, copiarse, modificarse y distribuirse libremente, también con fines comerciales, manteniendo este aviso
    de autoría y de licencia. Código fuente en
    <a href="https://github.com/anibalsacub-byte/mantenlibre" target="_blank" rel="noopener">GitHub</a>.</p>
  </section>`;
}

function vistaGuia() {
  return `${cabecera('Guía y ejercicios', 'Cómo trabajar con MantenLibre, terminología normalizada y material de formación.')}
  <section class="tarjeta texto-largo">
    <h2>Flujo de trabajo</h2>
    <ol>
      <li><strong>Ubicaciones técnicas y activos.</strong> Registra la sede y sus áreas, y dentro de ellas cada equipo con su clase,
        criticidad (A, B, C), horas de operación por día y, si tiene, su horómetro. Un activo puede formar parte de otro
        (sistema → equipo → subunidad → ítem mantenible).</li>
      <li><strong>Planes preventivos.</strong> Define rutinas por calendario (cada N días, semanas o meses) o por uso (cada N horas
        de horómetro), con su lista de tareas. <em>Fecha fija</em> mantiene el calendario aunque se atrase una ejecución;
        <em>flotante</em> cuenta desde el último cierre.</li>
      <li><strong>Generación automática.</strong> Al abrir la aplicación (o con «Revisar vencimientos») se crean las órdenes
        preventivas que vencen dentro del horizonte configurado.</li>
      <li><strong>Solicitudes.</strong> Operadores reportan problemas; mantenimiento las aprueba y se convierten en órdenes correctivas.</li>
      <li><strong>Ejecución.</strong> En cada orden se marcan las tareas, se descuentan repuestos del inventario y se registran
        horas de mano de obra. Al completarla se registran la actividad, el tiempo de parada y, si hubo falla, sus datos ISO 14224.</li>
      <li><strong>Análisis.</strong> El panel y los reportes calculan MTBF, MTTR, disponibilidad, cumplimiento, backlog y costos.</li>
    </ol>
  </section>
  <section class="tarjeta texto-largo formulas">
    <h2>Terminología (ISO 14224 y EN 13306)</h2>
    <dl>
      <dt>Tipos de mantenimiento</dt><dd><strong>Correctivo</strong> (después de la falla; <em>inmediato</em> o <em>diferido</em>)
        y <strong>preventivo</strong> (antes de la falla): <em>predeterminado</em>, a intervalos fijos de tiempo o uso, o
        <em>basado en condición</em>, según inspecciones o mediciones (el predictivo es una forma de este). Las
        <em>modificaciones</em> cambian el diseño o la función del activo.</dd>
      <dt>Taxonomía</dt><dd>Ubicación técnica (instalación y planta, niveles 3–4) → sistema (5) → unidad de equipo (6) →
        subunidad (7) → ítem mantenible (8). Los indicadores se reportan normalmente a nivel de unidad de equipo.</dd>
      <dt>Modo de falla</dt><dd>El efecto observado: lo que el operador ve (p. ej. «Fuga externa», «Vibración», «Falla al arrancar»).</dd>
      <dt>Mecanismo de falla</dt><dd>El proceso físico, químico o de otro tipo que produjo la falla (p. ej. desgaste, corrosión, fatiga).</dd>
      <dt>Causa de la falla</dt><dd>Por qué ocurrió: origen en el diseño, la fabricación o instalación, la operación o el mantenimiento, o la gestión.</dd>
      <dt>Método de detección</dt><dd>Cómo se descubrió la falla: inspección, prueba funcional, monitoreo de condición, interferencia con la producción…</dd>
      <dt>Severidad</dt><dd><em>Crítica</em> (pérdida inmediata de la función), <em>degradada</em> (función reducida) o
        <em>incipiente</em> (sin efecto inmediato, pero empeorará si no se atiende).</dd>
    </dl>
  </section>
  <section class="tarjeta">
    <h2>Explorar con datos de ejemplo</h2>
    <p>Carga una planta de envasado de ejemplo con equipos, historial de fallas, planes, repuestos y órdenes en curso.
    <strong>Reemplaza todos los datos de este navegador</strong>: exporta antes una copia si tienes datos reales.</p>
    ${btn('cargarDemo', 'Cargar datos de ejemplo')}
  </section>
  <section class="tarjeta texto-largo">
    <h2>Ejercicios con los datos de ejemplo</h2>
    <ol>
      <li>En <a href="#/panel">Panel</a>, identifica qué órdenes están vencidas y por qué el cumplimiento preventivo no es 100 %.</li>
      <li>El compresor CMP-01 marca 13 820 h. Registra una lectura de <strong>13 950 h</strong> en su ficha y observa qué orden
        se genera. ¿Hay stock del filtro necesario? ¿Qué harías?</li>
      <li>Aprueba la solicitud de la llenadora, asígnala a Luis, registra 1,5 h de trabajo y ciérrala con 1 h de parada,
        modo «Lectura anormal de instrumento (AIR)» y mecanismo «Eléctrico · Circuito abierto». ¿Cómo cambian MTBF y MTTR de LL-01?</li>
      <li>En <a href="#/reportes">Reportes</a>, usa el Pareto agrupando por modo, mecanismo y causa: ¿qué explica más horas
        de parada? Propón un plan preventivo que lo ataque y créalo.</li>
      <li>Calcula a mano la disponibilidad de la bomba BC-01 en 90 días y compárala con la de la aplicación.</li>
      <li>Cambia el plan de la llenadora de <em>flotante</em> a <em>fecha fija</em> y explica qué diferencia habría si una
        ejecución se atrasa 3 días.</li>
      <li>Imprime una orden de trabajo preventiva y úsala como formato en papel para una práctica en taller.</li>
    </ol>
    <p class="sub">Docentes: preparen un escenario, expórtenlo como <code>.json</code> y repártanlo; cada alumno lo importa en
    «Datos» y trabaja en su propio navegador.</p>
  </section>
  ${practicaQuince()}`;
}

// Práctica guiada: el alumno arma desde cero el plan de un mes con 15 órdenes de trabajo.
function practicaQuince() {
  const filas = (datos) => datos.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`);
  const activos = [
    ['GE-01', 'Grupo electrógeno diésel 100 kVA', 'Sala de máquinas', 'A', '12', '1 240 h'],
    ['CMP-01', 'Compresor de pistón 10 HP', 'Sala de máquinas', 'B', '10', '3 480 h'],
    ['BOM-01', 'Bomba centrífuga 5 HP de cisterna', 'Sala de máquinas', 'A', '16', '—'],
    ['TE-01', 'Tablero eléctrico general 380 V', 'Sala de máquinas', 'A', '24', '—'],
    ['CF-01', 'Cámara de frío 3 t (−18 °C)', 'Área de producción', 'A', '24', '—'],
    ['FT-01', 'Faja transportadora con motorreductor 2 HP', 'Área de producción', 'B', '10', '—'],
    ['MON-01', 'Montacargas a GLP 2,5 t', 'Almacén', 'B', '8', '5 840 h'],
    ['AA-01', 'Aire acondicionado split 24 000 BTU', 'Oficinas', 'C', '10', '—'],
  ];
  const personal = [
    ['Técnico mecánico', 'Mecánica', 'S/ 28'],
    ['Técnico electricista', 'Electricidad', 'S/ 30'],
    ['Técnico de refrigeración', 'Refrigeración y climatización', 'S/ 32'],
  ];
  const repuestos = [
    ['AC-15W40', 'Aceite 15W-40', 'galón', '6', '2', 'S/ 75'],
    ['FA-GE', 'Filtro de aceite de grupo electrógeno', 'ud', '2', '1', 'S/ 65'],
    ['FC-GE', 'Filtro de combustible de grupo electrógeno', 'ud', '1', '1', 'S/ 55'],
    ['AC-CMP', 'Aceite para compresor', 'L', '4', '2', 'S/ 40'],
    ['GR-EP2', 'Grasa de litio EP2', 'kg', '3', '1', 'S/ 35'],
    ['SM-1', 'Sello mecánico 1"', 'ud', '1', '1', 'S/ 280'],
    ['FV-A42', 'Faja en V A-42', 'ud', '2', '1', 'S/ 30'],
    ['FA-MON', 'Filtro de aceite de montacargas', 'ud', '1', '1', 'S/ 60'],
    ['LS-1', 'Limpiador de serpentines', 'galón', '2', '1', 'S/ 45'],
    ['R404A', 'Refrigerante R-404A', 'kg', '5', '2', 'S/ 90'],
  ];
  const ordenes = [
    ['1', 'Plan', 'GE-01', 'Cambio de aceite y filtros', 'Cada 250 h · último servicio 1 000 h', 'Preventivo predeterminado · 3 h · aceite ×3, FA-GE, FC-GE'],
    ['2', 'Plan', 'GE-01', 'Prueba en vacío del grupo electrógeno', 'Cada 1 semana', 'Inspección · 0,5 h'],
    ['3', 'Plan', 'CMP-01', 'Cambio de aceite del compresor', 'Cada 500 h · último servicio 3 000 h', 'Preventivo predeterminado · 1 h · AC-CMP ×2'],
    ['4', 'Plan', 'CMP-01', 'Purga del tanque y revisión de fajas', 'Cada 2 semanas', 'Preventivo predeterminado · 0,5 h'],
    ['5', 'Plan', 'BOM-01', 'Inspección de bomba (vibración, ruido, sello, presión)', 'Cada 1 mes', 'Inspección · 1 h'],
    ['6', 'Plan', 'TE-01', 'Termografía y reajuste de bornes', 'Cada 3 meses', 'Basado en condición · 2 h · electricista'],
    ['7', 'Plan', 'CF-01', 'Limpieza de condensador y evaporador', 'Cada 1 mes', 'Preventivo predeterminado · 2 h · LS-1 ×1'],
    ['8', 'Plan', 'FT-01', 'Lubricación de chumaceras y revisión de faja', 'Cada 2 semanas', 'Preventivo predeterminado · 0,5 h · GR-EP2 ×0,2'],
    ['9', 'Plan', 'MON-01', 'Servicio de 250 h del montacargas', 'Cada 250 h · último servicio 5 600 h', 'Preventivo predeterminado · 2 h · FA-MON, aceite ×1'],
    ['10', 'Plan', 'AA-01', 'Limpieza de filtros del split', 'Cada 1 mes', 'Preventivo predeterminado · 0,5 h'],
    ['11', 'Solicitud', 'CF-01', '«La cámara no baja de −10 °C»', 'Urgencia alta', 'Correctivo · revisar carga de R-404A'],
    ['12', 'Solicitud', 'FT-01', '«La faja se desvía hacia un lado»', 'Urgencia media', 'Correctivo · alineación'],
    ['13', 'Solicitud', 'BOM-01', '«Gotea agua por el sello de la bomba»', 'Urgencia media', 'Correctivo · SM-1 ×1'],
    ['14', 'Manual', 'BOM-01', 'Instalar guarda de protección en el acople', 'Fecha límite: en 3 semanas', 'Modificación · 3 h'],
    ['15', 'Manual', 'TE-01', 'Medición de resistencia de puesta a tierra', 'Fecha límite: fin de mes', 'Inspección · 1 h · electricista'],
  ];
  return `<section class="tarjeta texto-largo">
    <h2>Práctica: plan de mantenimiento de un mes (15 órdenes)</h2>
    <p>Escenario: <strong>pequeña planta de alimentos congelados</strong>. Partiendo de datos vacíos («Datos → Borrar todo»),
    el alumno registra la planta y programa el mantenimiento del próximo mes.</p>
    <ol>
      <li>En «Datos → Editar configuración» pon el nombre de la empresa y <strong>30 días de anticipación</strong>
        para que se generen todas las órdenes del mes.</li>
      <li>Crea las ubicaciones (Sala de máquinas, Área de producción, Almacén, Oficinas), el personal, los repuestos y los activos.</li>
      <li>Crea los 10 planes preventivos. En los de calendario pon una «Última ejecución» de modo que el próximo vencimiento
        caiga dentro del mes; en los de horas usa la lectura del último servicio indicada.</li>
      <li>Registra las 3 solicitudes (como si fueras el operador) y apruébalas; crea a mano las 2 órdenes restantes.</li>
      <li>Asigna responsable y fecha a todas. Revisa el «Calendario» y el «Backlog»: ¿alcanza la plantilla?</li>
      <li>Ejecuta y cierra al menos 5 órdenes registrando tareas, repuestos, horas y, en las correctivas, la parada y el modo de falla.
        Luego analiza el panel y los reportes.</li>
    </ol>
    <h3>Activos</h3>
    ${tabla(['Código', 'Nombre', 'Ubicación técnica', 'Criticidad', 'Horas/día', 'Horómetro'], filas(activos))}
    <h3>Personal</h3>
    ${tabla(['Nombre (inventado)', 'Especialidad', 'Costo/h'], filas(personal))}
    <h3>Repuestos</h3>
    ${tabla(['Código', 'Nombre', 'Unidad', 'Stock', 'Mínimo', 'Costo'], filas(repuestos))}
    <h3>Las 15 órdenes</h3>
    ${tabla(['#', 'Origen', 'Activo', 'Trabajo', 'Frecuencia / urgencia', 'Detalle'], filas(ordenes))}
    <p class="sub">Para evaluar: exporta la copia (.json) al terminar. El docente la importa en su navegador y revisa
    planes, órdenes, bitácoras e indicadores del alumno.</p>
  </section>`;
}
