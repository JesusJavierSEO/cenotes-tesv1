/* ═══════════════════════════════════════════════════════════
   Cenotes Homún — checkout.js
   Reservas por WhatsApp y cálculo de totales
═══════════════════════════════════════════════════════════ */

const TOUR_PRECIOS = {
  'cenote-santa-barbara':                         { precio: 575,  precio_nino: 575,  nombre: 'Cenote Santa Bárbara Básico' },
  'cenote-santa-rosa':                            { precio: 315,  precio_nino: null, nombre: 'Cenote Santa Rosa' },
  'cenotes-santa-cruz':                           { precio: 600,  precio_nino: 600,  nombre: 'Cenotes Santa Cruz — Paquete Hacienda' },
  'cenote-santa-cruz-cuatrimotos':                { precio: 900,  precio_nino: null, nombre: 'Cenote Santa Cruz + Cuatrimotos' },
  'cenotes-casa-tortuga':                         { precio: 750,  precio_nino: null, nombre: 'Cenotes Casa Tortuga' },
  'casa-tortuga-silver':                          { precio: 1000, precio_nino: null, nombre: 'Casa Tortuga — Paquete Silver' },
  'cenotes-casa-tortuga-gold':                    { precio: 1650, precio_nino: null, nombre: 'Casa Tortuga — Paquete GOLD' },
  'off-road-casa-tortugas':                       { precio: 1750, precio_nino: null, nombre: 'Off Road Casa Tortugas' },
  'isla-mujeres-catamaran':                       { precio: 1590, precio_nino: 750,  nombre: 'Isla Mujeres Catamarán All Inclusive' },
  'atvs-off-road-shared-puerto-morelos':          { precio: 1290, precio_nino: null, nombre: 'ATVs Off Road Compartido — Puerto Morelos' },
  'atvs-off-road-single-caballos-puerto-morelos': { precio: 1730, precio_nino: null, nombre: 'ATVs Off Road Individual + Caballos' },
};

// ── DETECTAR TOUR ACTUAL ────────────────────────────────────
function getTourSlug() {
  var match = window.location.pathname.match(/tours\/([^\/]+?)(-en)?\.html/);
  return match ? match[1] : null;
}

function getTourData() {
  var slug = getTourSlug();
  return slug ? TOUR_PRECIOS[slug] : null;
}

// ── ACTUALIZAR TOTAL EN TIEMPO REAL ────────────────────────
function actualizarTotal() {
  var tour = getTourData();
  if (!tour) return;

  var adultos = parseInt(document.getElementById('r-adultos') && document.getElementById('r-adultos').value) || 0;
  var ninos   = parseInt(document.getElementById('r-ninos')   && document.getElementById('r-ninos').value)   || 0;
  var total   = (adultos * tour.precio) + (ninos * (tour.precio_nino || 0));

  var totalEl   = document.getElementById('checkout-total');
  var detalleEl = document.getElementById('checkout-detalle');

  if (totalEl) totalEl.textContent = total > 0 ? '$' + total.toLocaleString('es-MX') + ' MXN' : '—';

  if (detalleEl && total > 0) {
    var parts = [];
    if (adultos > 0) parts.push(adultos + (adultos === 1 ? ' adulto' : ' adultos') + ' × $' + tour.precio.toLocaleString('es-MX'));
    if (ninos   > 0 && tour.precio_nino) parts.push(ninos + (ninos === 1 ? ' niño' : ' niños') + ' × $' + tour.precio_nino.toLocaleString('es-MX'));
    detalleEl.textContent = parts.join(' + ');
  }
}

// ── WHATSAPP — funciona con cualquier nombre que llame el onclick ──────
function reservarWA(tourNombre) { _abrirWA(tourNombre, 'es'); }
function bookWA(tourNombre)     { _abrirWA(tourNombre, 'en'); }
// Compatibilidad con nombre viejo por si acaso
function reservarWhatsApp(tourNombre) { _abrirWA(tourNombre, 'es'); }

function _abrirWA(tourNombre, lang) {
  var nombre  = (document.getElementById('r-nombre')  || {}).value || '';
  // email ya fue validado arriba
  var telefono = ((document.getElementById('r-telefono') || {}).value || '').trim();
  var fecha   = (document.getElementById('r-fecha')   || {}).value || '';
  var adultos = (document.getElementById('r-adultos') || {}).value || '';
  var ninos   = (document.getElementById('r-ninos')   || {}).value || '';

  var saludo = lang === 'en' ? 'Hi' : 'Hola';
  var msg    = saludo + ', me interesa el tour "' + tourNombre + '".';
  if (nombre)  msg += ' Mi nombre es ' + nombre + '.';
  if (fecha)   msg += ' Fecha: ' + fecha + '.';
  if (adultos && adultos !== '0') msg += ' Adultos: ' + adultos + '.';
  if (ninos   && ninos   !== '0') msg += ' Niños: '   + ninos   + '.';

  window.open('https://wa.me/529994105737?text=' + encodeURIComponent(msg), '_blank');
}
