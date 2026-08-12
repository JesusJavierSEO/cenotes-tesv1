/* ═══════════════════════════════════════════════════════════
   Cenotes Homún — checkout.js
   Reservas por WhatsApp y cálculo de totales
═══════════════════════════════════════════════════════════ */

const TOUR_PRECIOS = {
  'cenote-santa-barbara':                         { precio: 575,  precio_nino: 575,  precio_usd: 35, precio_nino_usd: 35, nombre: 'Cenote Santa Bárbara Básico' },
  'cenote-santa-rosa':                            { precio: 315,  precio_nino: null, precio_usd: 19, precio_nino_usd: null, nombre: 'Cenote Santa Rosa' },
  'cenotes-santa-cruz':                           { precio: 600,  precio_nino: 600,  precio_usd: 36, precio_nino_usd: 36, nombre: 'Cenotes Santa Cruz — Paquete Hacienda' },
  'cenote-santa-cruz-cuatrimotos':                { precio: 900,  precio_nino: null, precio_usd: 55, precio_nino_usd: null, nombre: 'Cenote Santa Cruz + Cuatrimotos' },
  'cenotes-casa-tortuga':                         { precio: 750,  precio_nino: null, precio_usd: 45, precio_nino_usd: null, nombre: 'Cenotes Casa Tortuga' },
  'casa-tortuga-silver':                          { precio: 1000, precio_nino: null, precio_usd: 59, precio_nino_usd: null, nombre: 'Casa Tortuga — Paquete Silver' },
  'cenotes-casa-tortuga-gold':                    { precio: 1650, precio_nino: null, precio_usd: 99, precio_nino_usd: null, nombre: 'Casa Tortuga — Paquete GOLD' },
  'off-road-casa-tortugas':                       { precio: 1750, precio_nino: null, precio_usd: 105, precio_nino_usd: null, nombre: 'Off Road Casa Tortugas' },
  'isla-mujeres-catamaran':                       { precio: 1590, precio_nino: 750,  precio_usd: 95, precio_nino_usd: 45, nombre: 'Isla Mujeres Catamarán All Inclusive' },
  'atvs-off-road-shared-puerto-morelos':          { precio: 1290, precio_nino: null, precio_usd: 79, precio_nino_usd: null, nombre: 'ATVs Off Road Compartido — Puerto Morelos' },
  'atvs-off-road-single-caballos-puerto-morelos': { precio: 1730, precio_nino: null, precio_usd: 105, precio_nino_usd: null, nombre: 'ATVs Off Road Individual + Caballos' },
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
function isEN() {
  return document.documentElement.lang === 'en';
}

function actualizarTotal() {
  var tour = getTourData();
  if (!tour) return;

  var en      = isEN();
  var pAd     = en ? tour.precio_usd      : tour.precio;
  var pNi     = en ? tour.precio_nino_usd : tour.precio_nino;
  var cur     = en ? ' USD' : ' MXN';
  var loc     = en ? 'en-US' : 'es-MX';

  var adultos = parseInt(document.getElementById('r-adultos') && document.getElementById('r-adultos').value) || 0;
  var ninos   = parseInt(document.getElementById('r-ninos')   && document.getElementById('r-ninos').value)   || 0;
  var total   = (adultos * pAd) + (ninos * (pNi || 0));

  var totalEl   = document.getElementById('checkout-total');
  var detalleEl = document.getElementById('checkout-detalle');

  if (totalEl) totalEl.textContent = total > 0 ? '$' + total.toLocaleString(loc) + cur : '—';

  if (detalleEl && total > 0) {
    var parts = [];
    if (adultos > 0) {
      parts.push(adultos + (en ? (adultos === 1 ? ' adult' : ' adults')
                               : (adultos === 1 ? ' adulto' : ' adultos'))
                 + ' × $' + pAd.toLocaleString(loc));
    }
    if (ninos > 0 && pNi) {
      parts.push(ninos + (en ? (ninos === 1 ? ' child' : ' children')
                             : (ninos === 1 ? ' niño' : ' niños'))
                 + ' × $' + pNi.toLocaleString(loc));
    }
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
  var fecha   = (document.getElementById('r-fecha')   || {}).value || '';
  var adultos = (document.getElementById('r-adultos') || {}).value || '';
  var ninos   = (document.getElementById('r-ninos')   || {}).value || '';
  var msg;

  if (lang === 'en') {
    msg = 'Hi! I\'d like to book the "' + tourNombre + '" tour.';
    if (nombre)  msg += ' My name is ' + nombre + '.';
    if (fecha)   msg += ' Preferred date: ' + fecha + '.';
    if (adultos && adultos !== '0') msg += ' Adults: ' + adultos + '.';
    if (ninos   && ninos   !== '0') msg += ' Children: ' + ninos + '.';
  } else {
    msg = 'Hola, me interesa el tour "' + tourNombre + '".';
    if (nombre)  msg += ' Mi nombre es ' + nombre + '.';
    if (fecha)   msg += ' Fecha: ' + fecha + '.';
    if (adultos && adultos !== '0') msg += ' Adultos: ' + adultos + '.';
    if (ninos   && ninos   !== '0') msg += ' Niños: ' + ninos + '.';
  }

  window.open('https://wa.me/529994105737?text=' + encodeURIComponent(msg), '_blank');
}
