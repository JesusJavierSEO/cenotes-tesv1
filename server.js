/**
 * Cenotes Homún by TuTravelSolutions
 * Servidor Express — sitio estático + Stripe + sistema de ganancias
 */

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CATÁLOGO DE TOURS (precios y costos de reporte) ───────
const CATALOGO = {
  'cenote-santa-barbara':        { nombre: 'Cenote Santa Bárbara Básico',          precio: 575,  costo: 450  },
  'cenote-santa-rosa':           { nombre: 'Cenote Santa Rosa',                     precio: 315,  costo: 180  },
  'cenotes-santa-cruz':          { nombre: 'Cenotes Santa Cruz — Paquete Hacienda', precio: 600,  costo: 350  },
  'cenote-santa-cruz-cuatrimotos': { nombre: 'Cenote Santa Cruz + Cuatrimotos',    precio: 900,  costo: 550  },
  'cenotes-casa-tortuga':        { nombre: 'Cenotes Casa Tortuga',                  precio: 750,  costo: 250  },
  'casa-tortuga-silver':         { nombre: 'Casa Tortuga — Paquete Silver',         precio: 1000, costo: 650  },
  'cenotes-casa-tortuga-gold':   { nombre: 'Casa Tortuga — Paquete GOLD',           precio: 1650, costo: 850  },
  'off-road-casa-tortugas':      { nombre: 'Off Road Casa Tortugas',                precio: 1750, costo: 900  },
  'isla-mujeres-catamaran':      { nombre: 'Isla Mujeres Catamarán All Inclusive',  precio: 1590, costo: 800  },
};

const FONDO_POR_VENTA = 20; // MXN por venta
const SHEETS_URL = process.env.SHEETS_URL || '';

// ── CALCULAR DISTRIBUCIÓN DE GANANCIAS ───────────────────
function calcularGanancias(slug, totalCobrado, personas, vendedor) {
  const tour  = CATALOGO[slug] || {};
  const costo = tour.costo || 0;

  const costoTotal  = costo * personas;
  const fondo       = FONDO_POR_VENTA;
  const gananciaNeta = totalCobrado - costoTotal - fondo;

  const pctFijo = { jesus: 0.35, enrique: 0.40 };
  const pctVenta = 0.25;

  let jesusTotal   = gananciaNeta * pctFijo.jesus;
  let enriqueTotal = gananciaNeta * pctFijo.enrique;
  let vendedorGana = gananciaNeta * pctVenta;

  if (vendedor === 'jesus')   jesusTotal   += vendedorGana;
  else if (vendedor === 'enrique') enriqueTotal += vendedorGana;

  return {
    precio_venta:    totalCobrado,
    costo_reporte:   costoTotal,
    fondo_operativo: fondo,
    ganancia_neta:   Math.round(gananciaNeta),
    jesus_recibe:    Math.round(jesusTotal),
    enrique_recibe:  Math.round(enriqueTotal),
    vendedor:        vendedor,
    vendedor_bono:   vendedor === 'jesus' || vendedor === 'enrique' ? Math.round(vendedorGana) : 0,
  };
}

// ── REGISTRAR VENTA EN GOOGLE SHEETS ─────────────────────
async function registrarEnSheets(venta) {
  if (!SHEETS_URL) return;
  try {
    const https = require('https');
    const data  = JSON.stringify(venta);
    const url   = new URL(SHEETS_URL);
    const opts  = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    await new Promise((resolve) => {
      const req = https.request(opts, resolve);
      req.on('error', () => resolve());
      req.write(data);
      req.end();
    });
    console.log('✓ Venta registrada en Sheets:', venta.tour);
  } catch (e) {
    console.error('Sheets error:', e.message);
  }
}

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(cors({
  origin: ['https://cenoteshomun.com', 'https://www.cenoteshomun.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.static(path.join(__dirname), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ── API: CHECKOUT ─────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  try {
    const { tour_slug, tour_nombre, line_items, cliente, fecha, success_url, cancel_url, lang, ref } = req.body;

    if (!line_items || line_items.length === 0)
      return res.status(400).json({ error: 'Sin artículos' });

    const totalPersonas = line_items.reduce((a, i) => a + i.cantidad, 0);
    if (totalPersonas < 1) return res.status(400).json({ error: 'Personas inválido' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items.map(i => ({
        price_data: {
          currency: 'mxn',
          product_data: { name: i.nombre },
          unit_amount: i.precio_unitario * 100,
        },
        quantity: i.cantidad,
      })),
      mode: 'payment',
      success_url: success_url || 'https://cenoteshomun.com/gracias.html',
      cancel_url:  cancel_url  || 'https://cenoteshomun.com/',
      metadata: {
        tour_slug: tour_slug || '',
        tour:      tour_nombre || '',
        cliente:   cliente || '',
        fecha:     fecha || '',
        personas:  totalPersonas.toString(),
        vendedor:  ref || 'jesus',  // ventas web = Jesús por defecto
        canal:     ref ? 'whatsapp' : 'web',
      },
      payment_intent_data: {
        description: `${tour_nombre} — ${totalPersonas} persona(s)`,
      },
      locale: lang === 'en' ? 'en' : 'es',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: GENERAR ENLACE DE PAGO CON ATRIBUCIÓN ────────────
app.post('/api/generar-enlace', async (req, res) => {
  try {
    const { tour_slug, adultos, ninos, vendedor, fecha } = req.body;

    const tour = CATALOGO[tour_slug];
    if (!tour) return res.status(400).json({ error: 'Tour no encontrado' });

    const lineItems = [];
    if (adultos > 0) {
      lineItems.push({
        price_data: {
          currency: 'mxn',
          product_data: { name: tour.nombre + ' — Adulto' },
          unit_amount: tour.precio * 100,
        },
        quantity: adultos,
      });
    }

    const totalPersonas = adultos + (ninos || 0);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://cenoteshomun.com/gracias.html?tour=' + encodeURIComponent(tour.nombre),
      cancel_url:  'https://cenoteshomun.com/',
      metadata: {
        tour_slug: tour_slug,
        tour:      tour.nombre,
        personas:  totalPersonas.toString(),
        vendedor:  vendedor || 'enrique',
        canal:     'whatsapp',
        fecha:     fecha || '',
      },
      locale: 'es',
    });

    res.json({ url: session.url, tour: tour.nombre, total: tour.precio * adultos });
  } catch (err) {
    console.error('Generar enlace error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: WEBHOOK STRIPE ───────────────────────────────────
app.post('/api/webhook', async (req, res) => {
  let event;
  try {
    const sig     = req.headers['stripe-signature'];
    const secret  = process.env.STRIPE_WEBHOOK_SECRET;
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).send('Webhook error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const meta     = session.metadata || {};
    const total    = session.amount_total / 100;
    const personas = parseInt(meta.personas) || 1;
    const slug     = meta.tour_slug || '';
    const vendedor = meta.vendedor || 'jesus';

    const dist = calcularGanancias(slug, total, personas, vendedor);

    const registro = {
      hoja:            'ventas',
      fecha:           new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      tour:            meta.tour || slug,
      cliente:         meta.cliente || '',
      fecha_tour:      meta.fecha || '',
      personas:        personas,
      canal:           meta.canal || 'web',
      vendedor:        vendedor,
      precio_venta:    dist.precio_venta,
      costo_reporte:   dist.costo_reporte,
      fondo_operativo: dist.fondo_operativo,
      ganancia_neta:   dist.ganancia_neta,
      jesus_recibe:    dist.jesus_recibe,
      enrique_recibe:  dist.enrique_recibe,
      stripe_id:       session.id,
    };

    console.log('✅ Pago completado:', registro);
    await registrarEnSheets(registro);
  }

  res.json({ received: true });
});

// ── API: REGISTRAR VENTA MANUAL ───────────────────────────
app.post('/api/venta-manual', async (req, res) => {
  try {
    const { tour_slug, adultos, ninos, vendedor, canal, fecha_tour, cliente } = req.body;
    const tour = CATALOGO[tour_slug];
    if (!tour) return res.status(400).json({ error: 'Tour no encontrado' });

    const personas    = (adultos || 0) + (ninos || 0);
    const totalVenta  = tour.precio * (adultos || 0);
    const dist        = calcularGanancias(tour_slug, totalVenta, adultos || 0, vendedor);

    const registro = {
      hoja:            'ventas',
      fecha:           new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      tour:            tour.nombre,
      cliente:         cliente || '',
      fecha_tour:      fecha_tour || '',
      personas:        personas,
      canal:           canal || 'presencial',
      vendedor:        vendedor,
      precio_venta:    dist.precio_venta,
      costo_reporte:   dist.costo_reporte,
      fondo_operativo: dist.fondo_operativo,
      ganancia_neta:   dist.ganancia_neta,
      jesus_recibe:    dist.jesus_recibe,
      enrique_recibe:  dist.enrique_recibe,
      stripe_id:       'MANUAL',
    };

    await registrarEnSheets(registro);
    res.json({ ok: true, distribucion: dist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── INICIO ────────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`🌊 Cenotes Homún corriendo en puerto ${PORT}`);
  console.log(`   Stripe:  ${process.env.STRIPE_SECRET_KEY  ? '✓' : '⚠ falta STRIPE_SECRET_KEY'}`);
  console.log(`   Sheets:  ${process.env.SHEETS_URL         ? '✓' : '⚠ falta SHEETS_URL'}`);
});
