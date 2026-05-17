/**
 * Cenotes Homún by TuTravelSolutions
 * Servidor Express — sirve el sitio estático + API de Stripe
 */

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: ['https://cenoteshomun.com', 'https://www.cenoteshomun.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));

// Servir archivos estáticos — sin caché para JS/CSS
app.use(express.static(path.join(__dirname), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
  }
}));

// ── API: CREAR SESIÓN DE STRIPE CHECKOUT ─────────────────
app.post('/api/checkout', async (req, res) => {
  try {
    const {
      tour_slug,
      tour_nombre,
      line_items,
      cliente,
      fecha,
      success_url,
      cancel_url,
      lang,
    } = req.body;

    // Validación
    if (!line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'Sin artículos en el pedido' });
    }
    const totalPersonas = line_items.reduce((acc, i) => acc + i.cantidad, 0);
    if (totalPersonas < 1 || totalPersonas > 200) {
      return res.status(400).json({ error: 'Número de personas inválido' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe no configurado' });
    }

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items.map(item => ({
        price_data: {
          currency: 'mxn',
          product_data: {
            name: item.nombre,
          },
          unit_amount: item.precio_unitario * 100, // centavos
        },
        quantity: item.cantidad,
      })),
      mode: 'payment',
      success_url: success_url || 'https://cenoteshomun.com/gracias.html',
      cancel_url:  cancel_url  || 'https://cenoteshomun.com/',
      metadata: {
        tour:     tour_nombre || tour_slug,
        slug:     tour_slug   || '',
        cliente:  cliente     || '',
        fecha:    fecha       || '',
        personas: totalPersonas.toString(),
      },
      payment_intent_data: {
        description: `${tour_nombre} — ${totalPersonas} persona(s)${fecha ? ' — ' + fecha : ''}`,
      },
      locale: lang === 'en' ? 'en' : 'es',
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: WEBHOOK DE STRIPE (confirmación de pagos) ────────
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('✅ Pago completado:', {
      tour:    session.metadata.tour,
      cliente: session.metadata.cliente,
      fecha:   session.metadata.fecha,
      monto:   session.amount_total / 100 + ' MXN',
    });
    // Aquí se puede agregar: notificación a WhatsApp, registro en DB, email, etc.
  }

  res.json({ received: true });
});

// ── RUTAS HTML — manejar URLs sin extensión ───────────────
// index.html para la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Cualquier ruta no encontrada devuelve el archivo estático o 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ── INICIO ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌊 Cenotes Homún corriendo en puerto ${PORT}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✓ configurado' : '⚠ STRIPE_SECRET_KEY no encontrada'}`);
});
