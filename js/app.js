// Navegación, formularios y acciones del usuario.

const RUTAS = {
  panel: vistaPanel, seguimiento: vistaSeguimiento, ordenes: vistaOrdenes, ot: vistaOT, solicitudes: vistaSolicitudes, planes: vistaPlanes,
  calendario: vistaCalendario, activos: vistaActivos, activo: vistaActivo, inventario: vistaInventario,
  personal: vistaPersonal, ubicaciones: vistaUbicaciones, reportes: vistaReportes, datos: vistaDatos, guia: vistaGuia,
};
const MENU_DE = { ot: 'ordenes', activo: 'activos' };
let rutaAnterior = '';

function render() {
  const [ruta = 'panel', id] = location.hash.replace(/^#\/?/, '').split('/');
  const r = RUTAS[ruta] ? ruta : 'panel';
  const foco = document.activeElement?.dataset?.filtro;
  $('#vista').innerHTML = RUTAS[r](id && decodeURIComponent(id));
  $$('#menu a').forEach((a) => a.classList.toggle('activo', a.dataset.ruta === (MENU_DE[r] || r)));
  $('#nombreEmpresa').textContent = state.config.empresa;
  const nVenc = state.ordenes.filter(vencida).length;
  const nSol = state.solicitudes.filter((s) => s.estado === 'pendiente').length;
  $('#cnt-ordenes').textContent = nVenc || '';
  $('#cnt-solicitudes').textContent = nSol || '';
  if (foco) {
    const el = $(`[data-filtro="${foco}"]`);
    if (el) {
      el.focus();
      if (el.type === 'search') el.setSelectionRange(el.value.length, el.value.length);
    }
  }
  const actual = r + '/' + (id || '');
  if (actual !== rutaAnterior) window.scrollTo(0, 0);
  rutaAnterior = actual;
  document.body.classList.remove('menu-abierto');
}

const refrescar = () => { guardar(); render(); };

// ---------- Formularios en ventana modal ----------

function campoHTML(c, obj) {
  const v = obj[c.k] == null || obj[c.k] === '' ? c.def ?? '' : obj[c.k];
  const id = 'f_' + c.k;
  const req = c.req ? ' required' : '';
  let control;
  if (c.type === 'select') {
    const ops = typeof c.options === 'function' ? c.options() : c.options;
    const lista = Array.isArray(ops) ? ops.map((o) => (Array.isArray(o) ? o : [o, o])) : Object.entries(ops);
    control = `<select id="${id}" name="${c.k}"${req}>${c.vacio != null ? `<option value="">${esc(c.vacio)}</option>` : ''}
      ${lista.map(([val, lab]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  } else if (c.type === 'textarea') {
    control = `<textarea id="${id}" name="${c.k}" rows="${c.rows || 3}"${req}>${esc(v)}</textarea>`;
  } else if (c.type === 'checkbox') {
    control = `<input type="checkbox" id="${id}" name="${c.k}"${v ? ' checked' : ''}>`;
  } else {
    control = `<input id="${id}" name="${c.k}" type="${c.type || 'text'}" value="${esc(v)}"${req}
      ${c.step ? ` step="${c.step}"` : ''}${c.min != null ? ` min="${c.min}"` : ''}${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}>`;
  }
  return `<label class="campo${c.full ? ' full' : ''}${c.type === 'checkbox' ? ' chk' : ''}"${c.si ? ` data-si="${c.si}"` : ''}>
    <span>${esc(c.label)}${c.req ? ' *' : ''}</span>${control}${c.ayuda ? `<small>${esc(c.ayuda)}</small>` : ''}</label>`;
}

function leerCampos(campos, form) {
  const datos = {};
  for (const c of campos) {
    const el = form.elements[c.k];
    if (!el) continue;
    if (c.type === 'checkbox') datos[c.k] = el.checked;
    else if (c.type === 'number') datos[c.k] = el.value === '' ? null : parseFloat(el.value);
    else datos[c.k] = el.value.trim();
  }
  return datos;
}

function abrirFormulario({ titulo, campos, obj = {}, textoGuardar = 'Guardar', alGuardar, alEliminar, intro = '' }) {
  const dlg = $('#modal');
  const f = $('#modalForm');
  f.innerHTML = `<header><h2>${esc(titulo)}</h2><button type="button" class="x" data-cerrar aria-label="Cerrar">×</button></header>
    ${intro ? `<p class="intro">${intro}</p>` : ''}
    <div class="campos">${campos.map((c) => campoHTML(c, obj)).join('')}</div>
    <footer>${alEliminar ? '<button type="button" class="peligro" data-eliminar>Eliminar</button>' : ''}<span class="sep"></span>
      <button type="button" data-cerrar>Cancelar</button><button type="submit" class="prim">${esc(textoGuardar)}</button></footer>`;
  const visibles = () => $$('[data-si]', f).forEach((l) => {
    const [k, val] = l.dataset.si.split('=');
    l.hidden = f.elements[k]?.value !== val;
    $$('input,select,textarea', l).forEach((i) => (i.disabled = l.hidden));
  });
  visibles();
  f.onchange = visibles;
  f.onsubmit = (ev) => {
    ev.preventDefault();
    if (alGuardar(leerCampos(campos, f)) === false) return;
    dlg.close();
    refrescar();
  };
  $$('[data-cerrar]', f).forEach((b) => (b.onclick = () => dlg.close()));
  const del = $('[data-eliminar]', f);
  if (del) del.onclick = () => {
    if (!confirm('¿Eliminar definitivamente? Esta acción no se puede deshacer.')) return;
    alEliminar();
    dlg.close();
    refrescar();
  };
  dlg.showModal();
  $('input:not([type=checkbox]),select,textarea', f)?.focus();
}

const lineas = (texto) => (texto || '').split('\n').map((t) => t.trim()).filter(Boolean);

const camposOT = (nueva) => [
  { k: 'titulo', label: 'Título', req: true, full: true, ph: 'Ej.: Cambiar rodamiento lado acople' },
  { k: 'tipo', label: 'Tipo', type: 'select', options: TIPOS },
  { k: 'prioridad', label: 'Prioridad', type: 'select', options: PRIORIDADES },
  { k: 'activoId', label: 'Activo', type: 'select', options: opcActivos, vacio: 'Sin activo' },
  { k: 'asignadoId', label: 'Responsable', type: 'select', options: opcPersonal, vacio: 'Sin asignar' },
  { k: 'fechaLimite', label: 'Fecha límite', type: 'date' },
  { k: 'estimadoH', label: 'Horas estimadas', type: 'number', step: 0.25, min: 0 },
  { k: 'descripcion', label: 'Descripción del trabajo', type: 'textarea', full: true },
  nueva
    ? { k: 'checklistTxt', label: 'Lista de tareas (una por línea)', type: 'textarea', full: true, rows: 4 }
    : { k: 'otrosCostos', label: 'Otros costos (servicios externos, etc.)', type: 'number', step: 0.01, min: 0 },
  ...(nueva ? [] : [{ k: 'notas', label: 'Notas', type: 'textarea', full: true }]),
];

const camposActivo = (actual) => [
  { k: 'codigo', label: 'Código', ph: 'Ej.: BC-02' },
  { k: 'nombre', label: 'Nombre', req: true },
  { k: 'ubicacionId', label: 'Ubicación', type: 'select', options: opcUbicaciones, vacio: 'Sin ubicación' },
  { k: 'padreId', label: 'Forma parte de', type: 'select', vacio: 'Ninguno (activo principal)',
    options: () => opcActivos().filter(([id]) => id !== actual?.id) },
  { k: 'categoria', label: 'Categoría', ph: 'Motores, bombeo, HVAC…' },
  { k: 'criticidad', label: 'Criticidad', type: 'select', options: CRITICIDAD, def: 'B' },
  { k: 'estado', label: 'Estado', type: 'select', options: ESTADOS_ACTIVO },
  { k: 'fabricante', label: 'Fabricante' },
  { k: 'modelo', label: 'Modelo' },
  { k: 'serie', label: 'Nº de serie' },
  { k: 'instalacion', label: 'Fecha de instalación', type: 'date' },
  { k: 'horasDia', label: 'Horas de operación por día', type: 'number', step: 0.5, min: 0, def: 8,
    ayuda: 'Se usa para MTBF y disponibilidad.' },
  { k: 'horometro', label: 'Horómetro actual (h)', type: 'number', step: 1, min: 0,
    ayuda: 'Vacío si el equipo no tiene contador de horas.' },
  { k: 'notas', label: 'Notas', type: 'textarea', full: true },
];

const camposPlan = () => [
  { k: 'nombre', label: 'Nombre del plan', req: true, full: true, ph: 'Ej.: Lubricación semanal de rodamientos' },
  { k: 'activoId', label: 'Activo', type: 'select', options: opcActivos, req: true, vacio: 'Elegir…' },
  { k: 'tipo', label: 'Tipo', type: 'select', options: { preventiva: 'Preventiva', predictiva: 'Predictiva', inspeccion: 'Inspección' } },
  { k: 'disparo', label: 'Se programa', type: 'select', options: { tiempo: 'Por calendario', medidor: 'Por horas de uso (horómetro)' } },
  { k: 'prioridad', label: 'Prioridad', type: 'select', options: PRIORIDADES, def: 'media' },
  { k: 'cada', label: 'Cada', type: 'number', min: 1, step: 1, def: 1, si: 'disparo=tiempo', req: true },
  { k: 'unidad', label: 'Unidad', type: 'select', options: UNIDADES, def: 'meses', si: 'disparo=tiempo' },
  { k: 'base', label: 'Siguiente fecha', type: 'select', si: 'disparo=tiempo',
    options: { fija: 'Fecha fija (calendario)', cierre: 'Flotante (desde el último cierre)' } },
  { k: 'ultima', label: 'Última ejecución', type: 'date', si: 'disparo=tiempo', ayuda: 'Vacío si nunca se ha hecho.' },
  { k: 'inicio', label: 'Primera fecha (si nunca se hizo)', type: 'date', def: hoy(), si: 'disparo=tiempo' },
  { k: 'cadaH', label: 'Cada (horas de uso)', type: 'number', min: 1, step: 1, si: 'disparo=medidor', req: true },
  { k: 'ultimaLectura', label: 'Horómetro en el último servicio', type: 'number', min: 0, step: 1, si: 'disparo=medidor' },
  { k: 'responsableId', label: 'Responsable', type: 'select', options: opcPersonal, vacio: 'Sin asignar' },
  { k: 'estimadoH', label: 'Horas estimadas', type: 'number', step: 0.25, min: 0 },
  { k: 'descripcion', label: 'Descripción / seguridad', type: 'textarea', full: true, rows: 2 },
  { k: 'checklistTxt', label: 'Lista de tareas (una por línea)', type: 'textarea', full: true, rows: 5 },
  { k: 'activo', label: 'Plan activo', type: 'checkbox', def: true },
];

const camposRepuesto = [
  { k: 'codigo', label: 'Código', req: true },
  { k: 'nombre', label: 'Nombre', req: true },
  { k: 'unidad', label: 'Unidad', def: 'ud', ph: 'ud, L, kg, m…' },
  { k: 'ubicacion', label: 'Ubicación en almacén' },
  { k: 'stock', label: 'Stock actual', type: 'number', step: 'any', min: 0, def: 0, req: true },
  { k: 'minimo', label: 'Stock mínimo', type: 'number', step: 'any', min: 0, def: 0, req: true },
  { k: 'costo', label: 'Costo unitario', type: 'number', step: 0.01, min: 0, def: 0, req: true },
];
const camposPersona = [
  { k: 'nombre', label: 'Nombre', req: true },
  { k: 'especialidad', label: 'Especialidad', ph: 'Mecánica, electricidad…' },
  { k: 'costoH', label: 'Costo por hora', type: 'number', step: 0.01, min: 0, def: 0, req: true },
  { k: 'contacto', label: 'Contacto / turno' },
];
const camposUbicacion = [
  { k: 'nombre', label: 'Nombre', req: true },
  { k: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
];
const camposSolicitud = [
  { k: 'solicitante', label: 'Quién lo reporta', req: true },
  { k: 'fecha', label: 'Fecha', type: 'date', def: hoy(), req: true },
  { k: 'activoId', label: 'Activo', type: 'select', options: opcActivos, vacio: 'No sé / otro' },
  { k: 'prioridad', label: 'Urgencia', type: 'select', options: PRIORIDADES, def: 'media' },
  { k: 'descripcion', label: '¿Qué ocurre?', type: 'textarea', req: true, full: true },
];

// ---------- Acciones ----------

const partes = (v) => {
  const [id, i] = v.split(':');
  return [porId('ordenes', id), +i];
};

const acciones = {
  // Órdenes de trabajo
  nuevaOT(activoId) {
    abrirFormulario({
      titulo: 'Nueva orden de trabajo', campos: camposOT(true), obj: { activoId: activoId || '', prioridad: 'media' },
      textoGuardar: 'Crear orden',
      alGuardar(d) {
        const { checklistTxt, ...resto } = d;
        const o = crearOT({ ...resto, checklist: lineas(checklistTxt).map((t) => ({ t, ok: false })) });
        location.hash = '#/ot/' + o.id;
      },
    });
  },
  editarOT(id) {
    const o = porId('ordenes', id);
    abrirFormulario({
      titulo: 'Editar ' + o.num, campos: camposOT(false), obj: o,
      alGuardar(d) {
        if (d.asignadoId !== o.asignadoId) registrar(o, d.asignadoId ? 'Asignada a ' + nombreDe('personal', d.asignadoId) : 'Sin responsable asignado', 'estado');
        if (d.fechaLimite !== o.fechaLimite) registrar(o, 'Fecha límite cambiada a ' + fFecha(d.fechaLimite), 'estado');
        if (d.prioridad !== o.prioridad) registrar(o, 'Prioridad cambiada a ' + PRIORIDADES[d.prioridad], 'estado');
        Object.assign(o, d);
      },
      alEliminar() {
        for (const r of o.repuestos) {
          const rep = porId('repuestos', r.repuestoId);
          if (rep) rep.stock += r.cant;
        }
        state.ordenes = state.ordenes.filter((x) => x !== o);
        location.hash = '#/ordenes';
      },
    });
  },
  iniciarOT(id) {
    const o = porId('ordenes', id);
    registrar(o, o.estado === 'espera' ? 'Trabajo reanudado' : 'Trabajo iniciado', 'estado');
    o.estado = 'progreso';
    o.inicioReal ||= ahora();
    o.motivoEspera = '';
    refrescar();
  },
  esperaOT(id) {
    const o = porId('ordenes', id);
    abrirFormulario({
      titulo: `Poner ${o.num} en espera`, textoGuardar: 'Poner en espera',
      campos: [{ k: 'motivo', label: 'Motivo', type: 'select', req: true, vacio: 'Elegir…',
        options: ['Falta de repuestos', 'Equipo no disponible (producción)', 'Falta de personal', 'Espera de servicio externo',
          'Espera de aprobación', 'Falta de herramienta', 'Otro'] },
        { k: 'detalle', label: 'Detalle', type: 'textarea', full: true, rows: 2 }],
      alGuardar(d) {
        o.estado = 'espera';
        o.motivoEspera = d.motivo + (d.detalle ? ': ' + d.detalle : '');
        registrar(o, 'En espera · ' + o.motivoEspera, 'espera');
      },
    });
  },
  cancelarOT(id) {
    const o = porId('ordenes', id);
    abrirFormulario({
      titulo: `Cancelar ${o.num}`, textoGuardar: 'Cancelar orden',
      intro: o.planId ? 'Viene de un plan preventivo: el plan pasará al siguiente ciclo.' : '',
      campos: [{ k: 'motivo', label: 'Motivo de la cancelación', type: 'textarea', req: true, full: true, rows: 2 }],
      alGuardar(d) {
        registrar(o, 'Cancelada · ' + d.motivo, 'estado');
        cerrarOT(o, 'cancelada');
        generarPreventivos();
      },
    });
  },
  reabrirOT(id) {
    const o = porId('ordenes', id);
    o.estado = 'abierta';
    o.cerrada = '';
    o.finReal = '';
    registrar(o, 'Orden reabierta', 'estado');
    if (o.planId) aviso('El plan ya avanzó al siguiente ciclo; revísalo si hace falta.', 'info');
    refrescar();
  },
  comentarOT(id) {
    const texto = $('#nuevoComentario').value.trim();
    if (!texto) return;
    registrar(porId('ordenes', id), texto, 'nota');
    refrescar();
  },
  completarOT(id) {
    const o = porId('ordenes', id);
    const pendientes = o.checklist.filter((x) => !x.ok).length;
    if (pendientes && !confirm(`Quedan ${pendientes} tareas sin marcar. ¿Completar de todas formas?`)) return;
    const a = porId('activos', o.activoId);
    const campos = [
      { k: 'cerrada', label: 'Fecha de cierre', type: 'date', def: hoy(), req: true },
      { k: 'paradaH', label: 'Tiempo de parada del equipo (h)', type: 'number', step: 0.25, min: 0,
        ayuda: 'Horas que el equipo no pudo operar por este trabajo. Clave para MTTR y disponibilidad.' },
      { k: 'modoFalla', label: 'Modo de falla', type: 'select', options: MODOS_FALLA, vacio: o.tipo === 'correctiva' ? 'Elegir…' : 'No aplica' },
      ...(a && a.horometro != null ? [{ k: 'lecturaCierre', label: 'Lectura del horómetro (h)', type: 'number', min: 0, step: 1, def: a.horometro }] : []),
      { k: 'causa', label: 'Causa raíz / hallazgos', type: 'textarea', full: true },
      { k: 'notas', label: 'Notas de cierre', type: 'textarea', full: true },
    ];
    abrirFormulario({
      titulo: 'Completar ' + o.num, campos, obj: o, textoGuardar: 'Completar orden',
      intro: o.mano.length ? '' : 'Consejo: registra las horas de mano de obra antes de cerrar para que el costo quede completo.',
      alGuardar(d) {
        const { cerrada, ...resto } = d;
        Object.assign(o, resto);
        if (a && d.lecturaCierre != null && d.lecturaCierre > (a.horometro ?? 0)) a.horometro = d.lecturaCierre;
        o.finReal = ahora();
        registrar(o, 'Completada' + (d.paradaH ? ` · ${fNum(d.paradaH, 2)} h de parada` : '') + (d.modoFalla ? ' · ' + d.modoFalla : ''), 'fin');
        cerrarOT(o, 'completada', cerrada);
        const nuevas = generarPreventivos();
        if (nuevas.length) aviso(`Se generó ${nuevas.map((x) => x.num).join(', ')} para el siguiente ciclo.`, 'info');
        aviso(o.num + ' completada.');
      },
    });
  },
  imprimir() { window.print(); },
  agregarTarea(id) {
    const t = $('#nuevaTarea').value.trim();
    if (!t) return;
    porId('ordenes', id).checklist.push({ t, ok: false });
    refrescar();
    $('#nuevaTarea').focus();
  },
  quitarTarea(v) { const [o, i] = partes(v); o.checklist.splice(i, 1); refrescar(); },
  agregarRepuesto(id) {
    const rep = porId('repuestos', $('#selRep').value);
    const cant = parseFloat($('#cantRep').value);
    if (!rep || !(cant > 0)) return aviso('Elige un repuesto y una cantidad mayor que cero.', 'error');
    if (cant > rep.stock && !confirm(`Solo hay ${fNum(rep.stock)} ${rep.unidad} en stock. ¿Registrar igualmente?`)) return;
    const o = porId('ordenes', id);
    o.repuestos.push({ repuestoId: rep.id, cant, costoU: rep.costo });
    registrar(o, `Repuesto usado: ${fNum(cant, 2)} ${rep.unidad} de ${rep.codigo} · ${rep.nombre}`, 'recurso');
    rep.stock = Math.round((rep.stock - cant) * 1000) / 1000;
    if (stockBajo(rep)) aviso(`${rep.codigo} quedó en ${fNum(rep.stock)} ${rep.unidad}: bajo el mínimo.`, 'info');
    refrescar();
  },
  quitarRepuesto(v) {
    const [o, i] = partes(v);
    const [r] = o.repuestos.splice(i, 1);
    const rep = porId('repuestos', r.repuestoId);
    if (rep) rep.stock += r.cant;
    registrar(o, `Repuesto devuelto al almacén: ${fNum(r.cant, 2)} de ${rep?.codigo ?? 'repuesto eliminado'}`, 'recurso');
    refrescar();
  },
  agregarMano(id) {
    const p = porId('personal', $('#selPer').value);
    const horas = parseFloat($('#horasPer').value);
    if (!p || !(horas > 0)) return aviso('Elige un técnico y las horas trabajadas.', 'error');
    const o = porId('ordenes', id);
    o.mano.push({ personaId: p.id, horas, costoH: +p.costoH || 0, fecha: $('#fechaPer').value || hoy() });
    registrar(o, `${p.nombre} registró ${fNum(horas, 2)} h de trabajo`, 'recurso');
    refrescar();
  },
  quitarMano(v) { const [o, i] = partes(v); o.mano.splice(i, 1); refrescar(); },

  // Solicitudes
  nuevaSolicitud() {
    abrirFormulario({
      titulo: 'Nueva solicitud de trabajo', campos: camposSolicitud, textoGuardar: 'Enviar solicitud',
      alGuardar(d) {
        state.seq.sol += 1;
        state.solicitudes.push({ id: uid(), num: 'SOL-' + String(state.seq.sol).padStart(4, '0'), estado: 'pendiente', otId: '', ...d });
        aviso('Solicitud registrada.');
        location.hash = '#/solicitudes';
      },
    });
  },
  editarSolicitud(id) {
    const s = porId('solicitudes', id);
    abrirFormulario({ titulo: 'Editar ' + s.num, campos: camposSolicitud, obj: s, alGuardar: (d) => Object.assign(s, d),
      alEliminar: () => (state.solicitudes = state.solicitudes.filter((x) => x !== s)) });
  },
  aprobarSolicitud(id) {
    const s = porId('solicitudes', id);
    const o = crearOT({
      titulo: s.descripcion.length > 70 ? s.descripcion.slice(0, 67) + '…' : s.descripcion, descripcion: s.descripcion,
      tipo: 'correctiva', prioridad: s.prioridad, activoId: s.activoId, solicitudId: s.id,
      fechaLimite: sumarDias(hoy(), { urgente: 0, alta: 1, media: 3, baja: 7 }[s.prioridad] ?? 3),
    });
    s.estado = 'aprobada';
    s.otId = o.id;
    guardar();
    aviso(`Se creó ${o.num}. Asígnale un responsable.`);
    location.hash = '#/ot/' + o.id;
  },
  rechazarSolicitud(id) {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    porId('solicitudes', id).estado = 'rechazada';
    refrescar();
  },

  // Planes
  nuevoPlan(activoId) { editarPlan(null, activoId); },
  editarPlan(id) { editarPlan(porId('planes', id)); },
  generarAhora(id) {
    const p = porId('planes', id);
    const pendiente = otAbiertaDePlan(p);
    if (pendiente) return aviso(`Ya existe ${pendiente.num} abierta para este plan.`, 'info');
    const o = crearOTdePlan(p, p.disparo === 'tiempo' ? proximaFecha(p) : hoy());
    guardar();
    location.hash = '#/ot/' + o.id;
  },
  revisarPlanes() {
    const nuevas = generarPreventivos();
    aviso(nuevas.length ? `Se generaron ${nuevas.length} órdenes: ${nuevas.map((o) => o.num).join(', ')}.` : 'No hay planes por vencer.', 'info');
    render();
  },

  // Activos
  nuevoActivo() {
    abrirFormulario({
      titulo: 'Nuevo activo', campos: camposActivo(), obj: { estado: 'operativo' },
      alGuardar(d) {
        const a = { id: uid(), ...d };
        state.activos.push(a);
        location.hash = '#/activo/' + a.id;
      },
    });
  },
  editarActivo(id) {
    const a = porId('activos', id);
    abrirFormulario({
      titulo: 'Editar activo', campos: camposActivo(a), obj: a, alGuardar: (d) => Object.assign(a, d),
      alEliminar() {
        const n = state.ordenes.filter((o) => o.activoId === a.id).length;
        state.activos = state.activos.filter((x) => x !== a);
        state.planes = state.planes.filter((p) => p.activoId !== a.id);
        for (const x of state.activos) if (x.padreId === a.id) x.padreId = '';
        if (n) aviso(`Sus ${n} órdenes se conservan en el historial sin activo.`, 'info');
        location.hash = '#/activos';
      },
    });
  },
  lecturaActivo(id) {
    const a = porId('activos', id);
    abrirFormulario({
      titulo: 'Registrar horómetro · ' + (a.codigo || a.nombre), textoGuardar: 'Registrar',
      intro: a.horometro == null ? 'Este activo aún no tiene lectura.' : `Última lectura: ${fNum(a.horometro, 0)} h.`,
      campos: [{ k: 'horometro', label: 'Lectura actual (h)', type: 'number', min: a.horometro ?? 0, step: 1, req: true }],
      obj: {},
      alGuardar(d) {
        a.horometro = d.horometro;
        const nuevas = generarPreventivos();
        if (nuevas.length) aviso(`La lectura disparó ${nuevas.map((o) => `${o.num} (${o.titulo})`).join(', ')}.`, 'info');
        else aviso('Lectura registrada.');
      },
    });
  },

  // Inventario, personal y ubicaciones
  nuevoRepuesto() {
    abrirFormulario({ titulo: 'Nuevo repuesto', campos: camposRepuesto, alGuardar: (d) => state.repuestos.push({ id: uid(), ...d }) });
  },
  editarRepuesto(id) {
    const r = porId('repuestos', id);
    abrirFormulario({ titulo: 'Editar repuesto', campos: camposRepuesto, obj: r, alGuardar: (d) => Object.assign(r, d),
      alEliminar: () => (state.repuestos = state.repuestos.filter((x) => x !== r)) });
  },
  entradaRepuesto(id) {
    const r = porId('repuestos', id);
    abrirFormulario({
      titulo: `Entrada de ${r.codigo}`, textoGuardar: 'Sumar al stock', intro: `Stock actual: ${fNum(r.stock, 2)} ${esc(r.unidad)}.`,
      campos: [
        { k: 'cant', label: 'Cantidad recibida', type: 'number', min: 0, step: 'any', req: true },
        { k: 'costo', label: 'Costo unitario', type: 'number', min: 0, step: 0.01, def: r.costo, ayuda: 'Actualiza el costo para próximos consumos.' },
      ],
      alGuardar(d) {
        r.stock = Math.round((r.stock + d.cant) * 1000) / 1000;
        if (d.costo != null) r.costo = d.costo;
      },
    });
  },
  nuevaPersona() {
    abrirFormulario({ titulo: 'Nueva persona', campos: camposPersona, alGuardar: (d) => state.personal.push({ id: uid(), ...d }) });
  },
  editarPersona(id) {
    const p = porId('personal', id);
    abrirFormulario({ titulo: 'Editar persona', campos: camposPersona, obj: p, alGuardar: (d) => Object.assign(p, d),
      alEliminar: () => (state.personal = state.personal.filter((x) => x !== p)) });
  },
  nuevaUbicacion() {
    abrirFormulario({ titulo: 'Nueva ubicación', campos: camposUbicacion, alGuardar: (d) => state.ubicaciones.push({ id: uid(), ...d }) });
  },
  editarUbicacion(id) {
    const u = porId('ubicaciones', id);
    abrirFormulario({ titulo: 'Editar ubicación', campos: camposUbicacion, obj: u, alGuardar: (d) => Object.assign(u, d),
      alEliminar: () => (state.ubicaciones = state.ubicaciones.filter((x) => x !== u)) });
  },

  // Calendario
  mesAnterior() { moverMes(-1); },
  mesSiguiente() { moverMes(1); },
  mesHoy() { filtros.cal.mes = ''; render(); },

  // Datos
  cargarDemo() {
    if (hayDatos() && !confirm('Se reemplazarán todos los datos actuales por el ejemplo. ¿Continuar?')) return;
    cargarDemo();
    aviso('Datos de ejemplo cargados.');
    location.hash = '#/panel';
    render();
  },
  exportarJSON() {
    descargar(`mantenlibre-${hoy()}.json`, JSON.stringify(state, null, 2), 'application/json');
  },
  exportarCSV() {
    const cab = ['Nº', 'Título', 'Tipo', 'Prioridad', 'Estado', 'Activo', 'Responsable', 'Creada', 'Fecha límite', 'Cerrada',
      'Horas estimadas', 'Horas reales', 'Parada (h)', 'Modo de falla', 'Costo repuestos', 'Costo mano de obra', 'Otros', 'Total'];
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = state.ordenes.map((o) => {
      const c = costoOT(o);
      return [o.num, o.titulo, TIPOS[o.tipo], PRIORIDADES[o.prioridad], ESTADOS[o.estado], etiquetaActivo(o.activoId),
        nombreDe('personal', o.asignadoId), o.creada, o.fechaLimite, o.cerrada, o.estimadoH, horasMano(o), o.paradaH, o.modoFalla,
        c.repuestos.toFixed(2), c.mano.toFixed(2), c.otros.toFixed(2), c.total.toFixed(2)].map(celda).join(';');
    });
    descargar(`ordenes-${hoy()}.csv`, '﻿' + [cab.map(celda).join(';'), ...filas].join('\r\n'), 'text/csv;charset=utf-8');
  },
  borrarTodo() {
    if (!confirm('¿Borrar TODOS los datos de este navegador? Exporta una copia antes si quieres conservarlos.')) return;
    state = estadoVacio();
    refrescar();
    aviso('Datos borrados.');
  },
  editarConfig() {
    abrirFormulario({
      titulo: 'Configuración', obj: state.config,
      campos: [
        { k: 'empresa', label: 'Nombre de la empresa o curso', req: true, full: true },
        { k: 'anticipacion', label: 'Días de anticipación para preventivos', type: 'number', min: 0, step: 1, req: true },
        { k: 'jornadaH', label: 'Horas de jornada por técnico', type: 'number', min: 1, step: 0.5, req: true },
      ],
      alGuardar(d) {
        Object.assign(state.config, d);
        generarPreventivos();
      },
    });
  },
};

function editarPlan(p, activoId) {
  const obj = p ? { ...p, checklistTxt: p.checklist.join('\n') }
    : { activoId: activoId || '', disparo: 'tiempo', base: 'fija', tipo: 'preventiva', activo: true };
  if (!p && activoId) obj.ultimaLectura = porId('activos', activoId)?.horometro ?? 0;
  abrirFormulario({
    titulo: p ? 'Editar plan preventivo' : 'Nuevo plan preventivo', campos: camposPlan(), obj,
    textoGuardar: p ? 'Guardar' : 'Crear plan',
    alGuardar(d) {
      const { checklistTxt, ...resto } = d;
      const datos = { ...resto, checklist: lineas(checklistTxt) };
      const destino = p || { id: uid(), ultima: '', ultimaLectura: 0 };
      Object.assign(destino, datos);
      if (!p) state.planes.push(destino);
      const a = porId('activos', destino.activoId);
      if (destino.disparo === 'medidor') {
        // Sin lectura del último servicio, se cuenta el intervalo desde la lectura actual.
        if (destino.ultimaLectura == null) destino.ultimaLectura = a?.horometro ?? 0;
        if (a?.horometro == null) aviso('Ese activo no tiene horómetro: registra una lectura en su ficha para que el plan funcione.', 'error');
      }
      const nuevas = generarPreventivos();
      if (nuevas.length) aviso(`Se generó ${nuevas.map((o) => o.num).join(', ')} porque el plan ya vence.`, 'info');
    },
    alEliminar: p ? () => (state.planes = state.planes.filter((x) => x !== p)) : null,
  });
}

function moverMes(n) {
  const base = (filtros.cal.mes || hoy().slice(0, 7)) + '-01';
  filtros.cal.mes = sumarMeses(base, n).slice(0, 7);
  render();
}

function importar(archivo) {
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);
      if (!Array.isArray(datos.ordenes) || !Array.isArray(datos.activos)) throw new Error('formato');
      if (!confirm('Se reemplazarán los datos actuales por los del archivo. ¿Continuar?')) return;
      state = normalizar(datos);
      generarPreventivos();
      refrescar();
      aviso('Copia importada correctamente.');
    } catch {
      aviso('El archivo no es una copia válida de MantenLibre.', 'error');
    }
  };
  lector.readAsText(archivo);
}

// ---------- Eventos globales ----------

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acc]');
  if (el) {
    e.preventDefault();
    acciones[el.dataset.acc]?.(el.dataset.id, el);
    return;
  }
  const fila = e.target.closest('[data-ir]');
  if (fila && !e.target.closest('a,button,input,select,label')) location.hash = fila.dataset.ir;
  if (e.target.closest('#botonMenu')) document.body.classList.toggle('menu-abierto');
});

function fijarFiltro(clave, valor) {
  const [grupo, campo] = clave.split('.');
  filtros[grupo][campo] = valor;
  render();
}
document.addEventListener('input', (e) => {
  if (e.target.type === 'search' && e.target.dataset.filtro) fijarFiltro(e.target.dataset.filtro, e.target.value);
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.filtro && t.type !== 'search') fijarFiltro(t.dataset.filtro, t.value);
  if (t.dataset.check) {
    const o = porId('ordenes', t.dataset.check);
    const tarea = o.checklist[+t.dataset.i];
    tarea.ok = t.checked;
    registrar(o, (t.checked ? 'Tarea hecha: ' : 'Tarea desmarcada: ') + tarea.t, 'tarea');
    refrescar();
  }
  if (t.id === 'archivoImportar') {
    importar(t.files[0]);
    t.value = '';
  }
});
document.addEventListener('keydown', (e) => {
  const boton = { nuevaTarea: 'agregarTarea', nuevoComentario: 'comentarOT' }[e.target.id];
  if (e.key === 'Enter' && boton) {
    e.preventDefault();
    $(`[data-acc="${boton}"]`).click();
  }
});
window.addEventListener('hashchange', render);

// ---------- Inicio ----------

cargar();
const generadasAlAbrir = generarPreventivos();
render();
if (generadasAlAbrir.length) {
  aviso(`Se generaron ${generadasAlAbrir.length} órdenes preventivas que vencen pronto.`, 'info');
}
