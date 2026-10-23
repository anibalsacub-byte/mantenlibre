// Datos de ejemplo: una pequeña planta de envasado con historial, para practicar.
// Las fechas se calculan respecto a hoy para que el escenario siempre esté vigente.

function cargarDemo() {
  state = estadoVacio();
  state.config.empresa = 'Planta didáctica (ejemplo)';
  const d = (n) => sumarDias(hoy(), n);

  const ubic = (nombre, descripcion) => {
    const u = { id: uid(), nombre, descripcion };
    state.ubicaciones.push(u);
    return u.id;
  };
  const uCmp = ubic('Sala de compresores', 'Aire comprimido y servicios generales');
  const uLin = ubic('Línea de envasado 1', 'Área de producción');
  const uCal = ubic('Sala de calderas', 'Generación de vapor');
  const uAlm = ubic('Almacén y logística', 'Recepción y despacho');

  const activo = (datos) => {
    const a = {
      id: uid(), codigo: '', nombre: '', ubicacionId: '', padreId: '', categoria: '', criticidad: 'B',
      estado: 'operativo', fabricante: '', modelo: '', serie: '', instalacion: '', horasDia: 16,
      horometro: null, notas: '', ...datos,
    };
    state.activos.push(a);
    return a.id;
  };
  const cmp = activo({ codigo: 'CMP-01', nombre: 'Compresor de tornillo 30 kW', ubicacionId: uCmp, categoria: 'Neumática',
    criticidad: 'A', fabricante: 'Genérico', modelo: 'GT-30', serie: 'C30-1187', instalacion: '2019-03-12', horometro: 13820,
    notas: 'Alimenta toda la red de aire de la planta. Sin equipo de respaldo.' });
  const bom = activo({ codigo: 'BC-01', nombre: 'Bomba centrífuga de agua de proceso', ubicacionId: uLin, categoria: 'Bombeo',
    criticidad: 'A', fabricante: 'Genérico', modelo: 'CP 50-200', serie: 'B-55021', instalacion: '2020-07-01' });
  const lin = activo({ codigo: 'LIN-01', nombre: 'Línea de envasado 1', ubicacionId: uLin, categoria: 'Línea de producción',
    criticidad: 'A', instalacion: '2018-11-20' });
  const mot = activo({ codigo: 'MT-01', nombre: 'Motor de transportador 5,5 kW', ubicacionId: uLin, padreId: lin,
    categoria: 'Motores eléctricos', criticidad: 'B', fabricante: 'Genérico', modelo: 'IE3 132S', serie: 'M-77310' });
  const ll = activo({ codigo: 'LL-01', nombre: 'Llenadora rotativa 12 válvulas', ubicacionId: uLin, padreId: lin,
    categoria: 'Envasado', criticidad: 'A', modelo: 'LR-12' });
  const cal = activo({ codigo: 'CAL-01', nombre: 'Caldera pirotubular 500 kg/h', ubicacionId: uCal, categoria: 'Vapor',
    criticidad: 'A', horasDia: 12, notas: 'Revisión anual obligatoria por normativa.' });
  const mon = activo({ codigo: 'MON-01', nombre: 'Montacargas eléctrico 2,5 t', ubicacionId: uAlm, categoria: 'Logística',
    criticidad: 'C', horasDia: 8, horometro: 3260 });

  const persona = (nombre, especialidad, costoH, contacto) => {
    const p = { id: uid(), nombre, especialidad, costoH, contacto };
    state.personal.push(p);
    return p.id;
  };
  const ana = persona('Ana Torres', 'Mecánica', 28, 'Turno mañana');
  const luis = persona('Luis Pérez', 'Electricidad', 30, 'Turno mañana');
  const carla = persona('Carla Gómez', 'Lubricación e instrumentación', 25, 'Turno tarde');

  const repuesto = (codigo, nombre, unidad, stock, minimo, costo, ubicacion) => {
    const r = { id: uid(), codigo, nombre, unidad, stock, minimo, costo, ubicacion };
    state.repuestos.push(r);
    return r;
  };
  const rod = repuesto('RD-6205', 'Rodamiento 6205-2RS', 'ud', 6, 4, 28, 'Estante A1');
  const filtro = repuesto('FL-CMP', 'Filtro de aire de compresor', 'ud', 1, 2, 180, 'Estante B2');
  repuesto('AC-46', 'Aceite hidráulico ISO VG 46', 'L', 40, 20, 18, 'Bodega de lubricantes');
  const correa = repuesto('CR-B52', 'Correa en V B52', 'ud', 3, 2, 45, 'Estante A3');
  const sello = repuesto('SM-BC', 'Sello mecánico de bomba 35 mm', 'ud', 1, 1, 450, 'Estante C1');
  const grasa = repuesto('GR-EP2', 'Grasa de litio EP2', 'kg', 5, 2, 35, 'Bodega de lubricantes');
  repuesto('FL-MON', 'Filtro de aceite de montacargas', 'ud', 2, 1, 60, 'Estante B4');

  const plan = (datos) => {
    const p = {
      id: uid(), nombre: '', descripcion: '', activoId: '', tipo: 'preventiva', prioridad: 'media', disparo: 'tiempo',
      cada: 1, unidad: 'meses', cadaH: null, base: 'fija', inicio: hoy(), ultima: '', ultimaLectura: 0,
      checklist: [], estimadoH: 1, responsableId: '', activo: true, ...datos,
    };
    state.planes.push(p);
    return p;
  };
  const pLub = plan({ nombre: 'Lubricación de rodamientos del motor de transportador', activoId: mot, cada: 2, unidad: 'semanas',
    ultima: d(-12), responsableId: carla, estimadoH: 0.5,
    checklist: ['Limpiar graseras', 'Aplicar 10 g de grasa EP2 por rodamiento', 'Verificar temperatura < 70 °C', 'Registrar ruido anormal'] });
  plan({ nombre: 'Cambio de filtro de aire del compresor', activoId: cmp, disparo: 'medidor', cadaH: 2000, ultimaLectura: 12000,
    responsableId: ana, estimadoH: 1, prioridad: 'alta',
    checklist: ['Bloquear y etiquetar (LOTO)', 'Retirar filtro usado', 'Limpiar alojamiento', 'Instalar filtro nuevo FL-CMP', 'Probar y registrar horómetro'] });
  const pBom = plan({ nombre: 'Inspección mensual de bomba centrífuga', activoId: bom, tipo: 'inspeccion', cada: 1, unidad: 'meses',
    ultima: d(-40), responsableId: ana, estimadoH: 1,
    checklist: ['Medir vibración en apoyos (mm/s)', 'Medir temperatura de rodamientos', 'Revisar fugas en sello', 'Verificar presión de descarga'] });
  plan({ nombre: 'Servicio de 250 h del montacargas', activoId: mon, disparo: 'medidor', cadaH: 250, ultimaLectura: 3000,
    responsableId: luis, estimadoH: 2,
    checklist: ['Revisar nivel y bornes de baterías', 'Cambiar filtro de aceite hidráulico', 'Revisar frenos y bocina', 'Engrasar mástil'] });
  plan({ nombre: 'Revisión trimestral de caldera', activoId: cal, cada: 3, unidad: 'meses', ultima: d(-60), responsableId: luis,
    estimadoH: 4, prioridad: 'alta',
    checklist: ['Probar válvulas de seguridad', 'Purgar fondo', 'Revisar quemador y fotocelda', 'Análisis de agua de alimentación'] });
  plan({ nombre: 'Limpieza y ajuste de llenadora', activoId: ll, cada: 1, unidad: 'semanas', base: 'cierre', ultima: d(-5),
    responsableId: carla, estimadoH: 1.5,
    checklist: ['Limpiar válvulas de llenado', 'Ajustar guías de botella', 'Verificar sensor de nivel'] });

  // Historial: fallas cerradas (para MTBF/MTTR) y preventivos ya ejecutados (para cumplimiento).
  const mano = (personaId, horas, fecha) => ({ personaId, horas, costoH: porId('personal', personaId).costoH, fecha });
  const usar = (r, cant) => ({ repuestoId: r.id, cant, costoU: r.costo });
  const historia = (datos) => crearOT({ estado: 'completada', prioridad: 'alta', ...datos });

  historia({ titulo: 'Fuga por sello mecánico', activoId: bom, creada: d(-75), fechaLimite: d(-74), cerrada: d(-74),
    asignadoId: ana, paradaH: 6, modoFalla: 'Desgaste', causa: 'Sello al final de su vida útil; caras con rayado.',
    repuestos: [usar(sello, 1)], mano: [mano(ana, 5, d(-74))] });
  historia({ titulo: 'Rodamiento ruidoso lado acople', activoId: mot, creada: d(-50), fechaLimite: d(-49), cerrada: d(-49),
    asignadoId: ana, paradaH: 3, modoFalla: 'Lubricación deficiente', causa: 'Grasa endurecida, intervalo de lubricación no respetado.',
    repuestos: [usar(rod, 2), usar(grasa, 0.2)], mano: [mano(ana, 3, d(-49))] });
  historia({ titulo: 'Disparo por alta temperatura', activoId: cmp, creada: d(-35), fechaLimite: d(-35), cerrada: d(-35),
    asignadoId: luis, paradaH: 4, modoFalla: 'Contaminación / suciedad', causa: 'Radiador de aceite obstruido por polvo.',
    mano: [mano(luis, 2, d(-35)), mano(carla, 2, d(-35))], prioridad: 'urgente' });
  historia({ titulo: 'Atasco en estrella de llenado', activoId: ll, creada: d(-20), fechaLimite: d(-20), cerrada: d(-20),
    asignadoId: carla, paradaH: 1.5, modoFalla: 'Error de operación', causa: 'Formato de botella cambiado sin ajustar guías.',
    mano: [mano(carla, 1.5, d(-20))] });
  historia({ titulo: 'Correa del transportador patinando', activoId: mot, creada: d(-15), fechaLimite: d(-14), cerrada: d(-14),
    asignadoId: ana, paradaH: 1, modoFalla: 'Desgaste', causa: 'Correa estirada y cristalizada.',
    repuestos: [usar(correa, 1)], mano: [mano(ana, 1, d(-14))], prioridad: 'media' });
  historia({ titulo: 'Sensor de nivel no detecta', activoId: ll, creada: d(-8), fechaLimite: d(-8), cerrada: d(-8),
    asignadoId: luis, paradaH: 2, modoFalla: 'Falla eléctrica', causa: 'Conector del sensor sulfatado.',
    mano: [mano(luis, 2, d(-8))] });

  const prevHecha = (p, limite, cierre, persona, horas) => crearOT({
    titulo: p.nombre, tipo: p.tipo, activoId: p.activoId, planId: p.id, creada: sumarDias(limite, -7), fechaLimite: limite,
    cerrada: cierre, estado: 'completada', asignadoId: persona, estimadoH: p.estimadoH,
    checklist: p.checklist.map((t) => ({ t, ok: true })), mano: [mano(persona, horas, cierre)],
  });
  prevHecha(pLub, d(-40), d(-38), carla, 0.5);
  prevHecha(pLub, d(-26), d(-26), carla, 0.5);
  prevHecha(pLub, d(-12), d(-12), carla, 0.5);
  prevHecha(pBom, d(-70), d(-71), ana, 1);
  prevHecha(pBom, d(-40), d(-37), ana, 1.5);

  const enCurso = crearOT({ titulo: 'Ruido anormal en reductor del transportador', tipo: 'correctiva', prioridad: 'alta',
    estado: 'progreso', activoId: mot, asignadoId: ana, creada: d(-2), fechaLimite: d(1), estimadoH: 3, inicioReal: d(-1) + 'T09:15',
    descripcion: 'El operador reporta golpeteo intermitente al arrancar la línea.',
    checklist: [{ t: 'Bloquear y etiquetar (LOTO)', ok: true }, { t: 'Revisar nivel y estado del aceite', ok: true },
      { t: 'Medir vibración en el reductor', ok: false }, { t: 'Inspeccionar engranajes por la tapa de registro', ok: false }],
    mano: [mano(ana, 1.5, d(-1))] });
  enCurso.historial.push(
    { fecha: d(-2) + 'T10:30', texto: 'Asignada a Ana Torres', tipo: 'estado' },
    { fecha: d(-1) + 'T09:15', texto: 'Trabajo iniciado', tipo: 'estado' },
    { fecha: d(-1) + 'T10:40', texto: 'Aceite oscuro con partículas metálicas. Se toma muestra.', tipo: 'nota' },
    { fecha: d(-1) + 'T10:45', texto: 'Ana Torres registró 1,5 h de trabajo', tipo: 'recurso' });
  const enEspera = crearOT({ titulo: 'Instalar guarda de protección en acople de bomba', tipo: 'mejora', prioridad: 'media',
    estado: 'espera', activoId: bom, asignadoId: ana, creada: d(-6), fechaLimite: d(10), estimadoH: 4,
    motivoEspera: 'Falta de repuestos: lámina perforada solicitada a compras' });
  enEspera.historial.push({ fecha: d(-5) + 'T11:00', texto: 'En espera · ' + enEspera.motivoEspera, tipo: 'espera' });

  const solicitud = (datos) => {
    state.seq.sol += 1;
    state.solicitudes.push({ id: uid(), num: 'SOL-' + String(state.seq.sol).padStart(4, '0'), estado: 'pendiente', otId: '', ...datos });
  };
  solicitud({ fecha: d(-1), solicitante: 'Operador turno noche', activoId: mon, prioridad: 'media',
    descripcion: 'Gotea aceite bajo el montacargas al final del turno.' });
  solicitud({ fecha: d(0), solicitante: 'Supervisora de línea', activoId: ll, prioridad: 'alta',
    descripcion: 'Luz de alarma intermitente en el panel de la llenadora.' });

  generarPreventivos();
  guardar();
}
