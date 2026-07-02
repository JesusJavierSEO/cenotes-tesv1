/* ═══════════════════════════════════════════════════════════
   Cenotes Homún — checkout.js
   Funciones de pago, WhatsApp y cálculo de totales
═══════════════════════════════════════════════════════════ */

const CHECKOUT_CONFIG = {
  apiUrl:     '/api/checkout',
  successUrl: 'https://cenoteshomun.com/gracias.html',
};

const TOUR_PRECIOS = {
  'cenote-santa-barbara':                         { precio: 575,  precio_nino: 575,  nombre: 'Cenote Santa Bárbara Básico' },
  'cenote-santa-rosa':                            { precio: 315,  precio_nino: null, nombre: 'Cenote Santa Rosa' },
  'cenotes-santa-cruz':                           { precio: 600,  precio_nino: 450,  nombre: 'Cenotes Santa Cruz — Paquete Hacienda' },
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
  var btnEl     = document.getElementById('btn-pagar');

  if (totalEl) totalEl.textContent = total > 0 ? '$' + total.toLocaleString('es-MX') + ' MXN' : '—';

  if (detalleEl && total > 0) {
    var parts = [];
    if (adultos > 0) parts.push(adultos + (adultos === 1 ? ' adulto' : ' adultos') + ' × $' + tour.precio.toLocaleString('es-MX'));
    if (ninos   > 0 && tour.precio_nino) parts.push(ninos + (ninos === 1 ? ' niño' : ' niños') + ' × $' + tour.precio_nino.toLocaleString('es-MX'));
    detalleEl.textContent = parts.join(' + ');
  }

  if (btnEl) btnEl.disabled = (total === 0);
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

// ── PAGO CON TARJETA ────────────────────────────────────────
async function iniciarPago() {
  var tour    = getTourData();
  var slug    = getTourSlug();
  if (!tour || !slug) {
    alert('Error al detectar el tour. Por favor intenta de nuevo.');
    return;
  }

  var adultos = parseInt((document.getElementById('r-adultos') || {}).value) || 0;
  var ninos   = parseInt((document.getElementById('r-ninos')   || {}).value) || 0;
  var nombre  = ((document.getElementById('r-nombre') || {}).value || '').trim();
  var fecha   = ((document.getElementById('r-fecha')  || {}).value || '').trim();

  if (adultos + ninos === 0) {
    alert('Por favor indica el número de personas.');
    return;
  }

  // Validar email obligatorio
  var email = ((document.getElementById('r-email') || {}).value || '').trim();
  if (!email || !email.includes('@')) {
    alert('Por favor ingresa tu correo electrónico para enviarte la confirmación de reserva.');
    var emailEl = document.getElementById('r-email');
    if (emailEl) { emailEl.focus(); emailEl.style.borderColor = '#e53e3e'; }
    return;
  }

  var btn = document.getElementById('btn-pagar');
  var labelOriginal = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

  var lineItems = [];
  if (adultos > 0) {
    lineItems.push({ nombre: tour.nombre + ' — Adulto', precio_unitario: tour.precio, cantidad: adultos });
  }
  if (ninos > 0 && tour.precio_nino) {
    lineItems.push({ nombre: tour.nombre + ' — Niño', precio_unitario: tour.precio_nino, cantidad: ninos });
  }

  try {
    var res = await fetch(CHECKOUT_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tour_slug:   slug,
        tour_nombre: tour.nombre,
        line_items:  lineItems,
        cliente:     nombre,
        email:       email,
        telefono:    telefono,
        fecha:       fecha,
        success_url: CHECKOUT_CONFIG.successUrl + '?tour=' + encodeURIComponent(tour.nombre),
        cancel_url:  window.location.href,
        lang:        document.documentElement.lang || 'es',
      }),
    });

    if (!res.ok) {
      var errData = await res.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Error del servidor: ' + res.status);
    }

    var data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No se recibió URL de pago.');
    }

  } catch (err) {
    console.error('Checkout error:', err);
    if (btn) { btn.disabled = false; btn.textContent = labelOriginal; }
    alert('No se pudo procesar el pago: ' + err.message + '\n\nPor favor reserva por WhatsApp.');
  }
}

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var tour = getTourData();
  if (!tour) return;

  // Cambiar campo fecha a tipo date
  var fechaEl = document.getElementById('r-fecha');
  if (fechaEl) {
    fechaEl.type = 'date';
    fechaEl.placeholder = '';
    // Fecha mínima = hoy
    var hoy = new Date();
    var yyyy = hoy.getFullYear();
    var mm   = String(hoy.getMonth() + 1).padStart(2, '0');
    var dd   = String(hoy.getDate()).padStart(2, '0');
    fechaEl.min = yyyy + '-' + mm + '-' + dd;
  }

  // Ocultar campo niños si no hay precio diferenciado
  if (!tour.precio_nino) {
    var ninosGroup = document.getElementById('r-ninos-group');
    if (ninosGroup) ninosGroup.style.display = 'none';
  }

  // Escuchar cambios
  ['r-adultos', 'r-ninos'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', actualizarTotal);
  });

  // Calcular total inicial (1 adulto por defecto)
  actualizarTotal();
});
