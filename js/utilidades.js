// Utilidades generales: DOM, fechas, formato y avisos.

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Fechas como texto ISO "AAAA-MM-DD" en hora local: se comparan como cadenas.
function aISO(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function deISO(s) {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}
const hoy = () => aISO(new Date());
function sumarDias(s, n) {
  const d = deISO(s);
  d.setDate(d.getDate() + n);
  return aISO(d);
}
function sumarMeses(s, n) {
  const d = deISO(s);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return aISO(d);
}
const difDias = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000);

// Fecha y hora local como "AAAA-MM-DDTHH:MM", para la bitácora de las órdenes.
const ahora = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const LOCALE = 'es-PE';
function fFecha(s) {
  if (!s) return '—';
  return deISO(s.slice(0, 10)).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}
function fFechaHora(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fNum(n, dec = 1) {
  if (n == null || Number.isNaN(+n)) return '—';
  return Number(n).toLocaleString(LOCALE, { maximumFractionDigits: dec });
}
const fPct = (r, dec = 0) => (r == null ? '—' : fNum(r * 100, dec) + ' %');
const formatoSoles = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'PEN' });
const fDinero = (n) => formatoSoles.format(n || 0);

function aviso(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = 'aviso ' + tipo;
  el.textContent = texto;
  $('#avisos').append(el);
  setTimeout(() => el.remove(), 4500);
}

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
