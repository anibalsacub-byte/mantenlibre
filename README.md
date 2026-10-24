# MantenLibre

Software de gestión del mantenimiento (CMMS) **libre y gratuito** para **pequeñas y medianas empresas** que quieren
dejar el papel y las hojas de cálculo sueltas. Usa la terminología de **ISO 14224** y **EN 13306** (taxonomía de equipos,
tipos de mantenimiento y datos de falla), lo que también lo hace útil como herramienta de formación.

Es una página web estática: no necesita servidor, base de datos, cuentas ni instalación. Los datos se guardan
**en el navegador de cada persona** y se pueden exportar e importar como archivo `.json`.

## Funciones

| Módulo | Qué hace |
| --- | --- |
| Panel | Puesta en marcha guiada para empresas nuevas; OT abiertas y vencidas, cumplimiento preventivo, MTTR, backlog, costo del mes, stock bajo, planificado vs correctivo |
| Seguimiento de OT | Tablero por estado (por hacer, en progreso, en espera, completadas) con avance de tareas, motivo de espera y botones para iniciar, pausar, reanudar y completar |
| Órdenes de trabajo | Correctivo (inmediato o diferido), preventivo predeterminado, preventivo basado en condición, inspección / prueba funcional y modificación; prioridad, responsable, lista de tareas, repuestos (descuentan stock), horas de mano de obra, costos en soles (PEN), cierre técnico ISO 14224 (actividad, parada, modo, severidad, mecanismo, causa y método de detección de la falla), bitácora con fecha y hora de cada evento; impresión con firmas |
| Solicitudes | Cualquier persona reporta un problema; mantenimiento lo aprueba y se convierte en OT |
| Planes preventivos | Por calendario (días, semanas, meses; fecha fija o flotante) o por horas de uso (horómetro). Generan OT automáticamente al acercarse el vencimiento |
| Calendario | Órdenes por fecha y preventivos previstos a futuro |
| Activos | Taxonomía ISO 14224 (sistema → unidad de equipo → subunidad → ítem mantenible), clase de equipo, ubicación técnica, criticidad A/B/C, ficha técnica, horómetro, historial, MTBF/MTTR/disponibilidad por equipo |
| Inventario | Stock, mínimos, costo, valor del almacén, consumo de 90 días, entradas |
| Personal y ubicaciones técnicas | Técnicos con costo por hora; sede, plantas y áreas (niveles 3–4 de ISO 14224) |
| Reportes | Indicadores por activo, Pareto de fallas por modo, mecanismo, causa o método de detección, costos por tipo de trabajo y explicación de cada fórmula |
| Datos | Copia de seguridad JSON, exportación de OT a CSV (Excel), configuración |
| Guía y ejercicios | Flujo de trabajo, glosario ISO 14224 / EN 13306, datos de ejemplo y prácticas de formación |

Para formación, la sección **Guía y ejercicios** incluye una planta de ejemplo con historial de fallas y una práctica
guiada para armar el plan de mantenimiento de un mes (15 órdenes).

## Cómo usarla

- **Sin instalar nada:** descarga la carpeta y abre `index.html` con doble clic.
- **Con servidor local (opcional):** `node servir.js` y abre <http://localhost:8080>.
- **En internet gratis (GitHub Pages):** sube la carpeta a un repositorio y activa
  *Settings → Pages → Deploy from a branch → main / (root)*. Quedará en `https://<usuario>.github.io/<repositorio>/`.

> Cada navegador guarda sus propios datos. Para trabajar en otro equipo, o para que un docente reparta el mismo
> escenario a todo el curso, usa **Datos → Exportar copia** e **Importar copia**.

## Estructura

```
index.html          estructura y menú
css/estilos.css     estilos (claro/oscuro, móvil, impresión)
js/utilidades.js    fechas, formato, avisos
js/datos.js         modelo, guardado, planes preventivos e indicadores
js/demo.js          escenario de ejemplo
js/vistas.js        pantallas
js/app.js           navegación, formularios y acciones
servir.js           servidor local opcional (Node.js)
```

JavaScript sin dependencias ni compilación: fácil de leer, modificar y usar como ejemplo en clase.

## Referencias

Las funciones se inspiran en CMMS de código abierto como [Atlas CMMS (grashjs/cmms)](https://github.com/grashjs/cmms)
y [Maintenance_App](https://github.com/pomochieng/Maintenance_App). MantenLibre no reutiliza su código.

## Licencia

[MIT](LICENSE): úsala, cópiala, modifícala y compártela libremente, también con fines comerciales.
