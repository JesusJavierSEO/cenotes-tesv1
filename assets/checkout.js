/* ═══════════════════════════════════════════════════════════
   Cenotes Homún — checkout.js
   Integración Stripe via Pipedream
   La clave secreta NUNCA está aquí — vive en Pipedream
═══════════════════════════════════════════════════════════ */

// ── CONFIGURACIÓN ──────────────────────────────────────────
const CHECKOUT_CONFIG = {
  // URL del webhook de Pipedream — se actualiza cuando crees el workflow
  pipedreamUrl: 'PIPEDREAM_URL_AQUI',

  // Clave publicable de Stripe (segura en frontend)
  stripePublicKey: 'pk_live_51TVv1jBQ45qWttXtswzYH58XgcQeljXezt4nY1pAubVHvrbfJRD6sOzAPgAYTzDoyls5ykbsD5BVTSQd4elogRhk00YXKohj0T',

  // URLs de retorno
  successUrl: 'https://cenoteshomun.com/gracias.html',
  // cancelUrl se genera dinámicamente por página
};

// ── CATÁLOGO DE PRECIOS ─────────────────────────────────────
// Precio por persona en MXN para cada tour
const TOUR_PRECIOS = {
  'cenote-santa-barbara':                    { precio: 575,  precio_nino: 490,  nombre: 'Cenote Santa Bárbara Básico' },
  'cenote-santa-rosa':                       { precio: 315,  precio_nino: 315,  nombre: 'Cenote Santa Rosa' },
  'cenotes-santa-cruz':                      { precio: 600,  precio_nino: 450,  nombre: 'Cenotes Santa Cruz — Paquete Hacienda' },
  'cenote-santa-cruz-cuatrimotos':           { precio: 900,  precio_nino: null, nombre: 'Cenote Santa Cruz + Cuatrimotos' },
  'cenotes-casa-tortuga':                    { precio: 750,  precio_nino: null, nombre: 'Cenotes Casa Tortuga' },
  'casa-tortuga-silver':                     { precio: 1000, precio_nino: null, nombre: 'Casa Tortuga — Paquete Silver' },
  'cenotes-casa-tortuga-gold':               { precio: 1650, precio_nino: null, nombre: 'Casa Tortuga — Paquete GOLD' },
  'off-road-casa-tortugas':                  { precio: 1750, precio_nino: null, nombre: 'Off Road Casa Tortugas' },
  'isla-mujeres-catamaran':                  { precio: 1590, precio_nino: 750,  nombre: 'Isla Mujeres Catamarán All Inclusive' },
  'atvs-off-road-shared-puerto-morelos':     { precio: 1290, precio_nino: null, nombre: 'ATVs Off Road Compartido — Puerto Morelos' },
  'atvs-off-road-single-caballos-puerto-morelos': { precio: 1730, precio_nino: null, nombre: 'ATVs Off Road Individual + Caballos' },
};

// ── DETECTAR TOUR ACTUAL ────────────────────────────────────
function getTourSlug() {
  const path = window.location.pathname;
  const match = path.match(/tours\/([^.]+?)(-en)?\.html/);
  return match ? match[1] : null;
}

// ── ACTUALIZAR TOTAL EN TIEMPO REAL ────────────────────────
function actualizarTotal() {
  const slug = getTourSlug();
  if (!slug) return;
  const tour = TOUR_PRECIOS[slug];
  if (!tour) return;

  const adultos = parseInt(document.getElementById('r-adultos')?.value) || 0;
  const ninos   = parseInt(document.getElementById('r-ninos')?.value)  || 0;

  const totalAdultos = adultos * tour.precio;
  const totalNinos   = ninos   * (tour.precio_nino || 0);
  const total        = totalAdultos + totalNinos;

  const totalEl = document.getElementById('checkout-total');
  const detalleEl = document.getElementById('checkout-detalle');
  const btnEl = document.getElementById('btn-pagar');

  if (totalEl) {
    totalEl.textContent = total > 0
      ? '$' + total.toLocaleString('es-MX') + ' MXN'
      : '—';
  }

  if (detalleEl && total > 0) {
    let parts = [];
    if (adultos > 0) parts.push(adultos + ' adulto' + (adultos > 1 ? 's' : '') + ' × $' + tour.precio.toLocaleString('es-MX'));
    if (ninos   > 0) parts.push(ninos   + ' niño' + (ninos > 1 ? 's' : '') + ' × $' + (tour.precio_nino || 0).toLocaleString('es-MX'));
    detalleEl.textContent = parts.join(' + ');
  }

  if (btnEl) btnEl.disabled = (total === 0);
}

// ── INICIAR PAGO ────────────────────────────────────────────
async function iniciarPago() {
  const slug = getTourSlug();
  if (!slug) return;
  const tour = TOUR_PRECIOS[slug];
  if (!tour) return;

  const adultos = parseInt(document.getElementById('r-adultos')?.value) || 0;
  const ninos   = parseInt(document.getElementById('r-ninos')?.value)  || 0;
  const nombre  = document.getElementById('r-nombre')?.value?.trim() || '';
  const fecha   = document.getElementById('r-fecha')?.value?.trim() || '';

  if (adultos + ninos === 0) {
    alert('Por favor indica el número de personas.');
    return;
  }

  const btn = document.getElementById('btn-pagar');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  const cancelUrl = window.location.href;

  // Líneas de compra: adultos + niños por separado si aplica
  const lineItems = [];
  if (adultos > 0) {
    lineItems.push({
      nombre: tour.nombre + ' — Adulto',
      precio_unitario: tour.precio,
      cantidad: adultos,
    });
  }
  if (ninos > 0 && tour.precio_nino) {
    lineItems.push({
      nombre: tour.nombre + ' — Niño',
      precio_unitario: tour.precio_nino,
      cantidad: ninos,
    });
  }

  try {
    const response = await fetch(CHECKOUT_CONFIG.pipedreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tour_slug:   slug,
        tour_nombre: tour.nombre,
        line_items:  lineItems,
        cliente:     nombre,
        fecha:       fecha,
        success_url: CHECKOUT_CONFIG.successUrl + '?tour=' + encodeURIComponent(tour.nombre),
        cancel_url:  cancelUrl,
        lang:        document.documentElement.lang || 'es',
      }),
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Sin URL de checkout');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    btn.disabled = false;
    btn.textContent = btn.dataset.label || 'Pagar con tarjeta';
    alert('Hubo un error al procesar el pago. Por favor intenta de nuevo o reserva por WhatsApp.');
  }
}

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const slug = getTourSlug();
  if (!slug || !TOUR_PRECIOS[slug]) return;

  const tour = TOUR_PRECIOS[slug];

  // Escuchar cambios en los campos de personas
  ['r-adultos', 'r-ninos'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', actualizarTotal);
  });

  // Guardar label original del botón
  const btn = document.getElementById('btn-pagar');
  if (btn) btn.dataset.label = btn.textContent;

  // Ocultar campo de niños si el tour no tiene precio diferenciado
  if (!tour.precio_nino) {
    const ninosGroup = document.getElementById('r-ninos-group');
    if (ninosGroup) ninosGroup.style.display = 'none';
  }

  actualizarTotal();
});
