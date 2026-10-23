# MantenLibre

Planificador de mantenimiento (CMMS ligero) **libre y gratuito**, pensado para:

- **pequeñas empresas** que quieren dejar el papel y las hojas de cálculo sueltas;
- **docentes y estudiantes** que practican gestión del mantenimiento con un escenario realista.

Es una página web estática: no necesita servidor, base de datos, cuentas ni instalación. Los datos se guardan
**en el navegador de cada persona** y se pueden exportar e importar como archivo `.json`.

## Funciones

| Módulo | Qué hace |
| --- | --- |
| Panel | OT abiertas y vencidas, cumplimiento preventivo, MTTR, backlog, costo del mes, stock bajo, planificado vs correctivo |
| Seguimiento de OT | Tablero por estado (por hacer, en progreso, en espera, completadas) con avance de tareas, motivo de espera y botones para iniciar, pausar, reanudar y completar |
| Órdenes de trabajo | Correctivas, preventivas, predictivas, inspecciones y mejoras; prioridad, responsable, lista de tareas, repuestos (descuentan stock), horas de mano de obra, costos en soles (PEN), cierre técnico (parada, modo de falla, causa raíz), bitácora con fecha y hora de cada evento y comentario; impresión con firmas |
| Solicitudes | Cualquier persona reporta un problema; mantenimiento lo aprueba y se convierte en OT |
| Planes preventivos | Por calendario (días, semanas, meses; fecha fija o flotante) o por horas de uso (horómetro). Generan OT automáticamente al acercarse el vencimiento |
| Calendario | Órdenes por fecha y preventivos previstos a futuro |
| Activos | Jerarquía (equipo → componente), ubicación, criticidad A/B/C, ficha técnica, horómetro, historial, MTBF/MTTR/disponibilidad por equipo |
| Inventario | Stock, mínimos, costo, valor del almacén, consumo de 90 días, entradas |
| Personal y ubicaciones | Técnicos con costo por hora; áreas de la planta |
| Reportes | Indicadores por activo, Pareto de modos de falla, costos por tipo de trabajo y explicación de cada fórmula |
| Datos | Copia de seguridad JSON, exportación de OT a CSV (Excel), datos de ejemplo, configuración |

Incluye una **planta didáctica de ejemplo** (compresor, bomba, línea de envasado, caldera, montacargas…) con historial
de fallas y una sección **Guía y ejercicios** con prácticas para clase.

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
