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
  'test-pago-live':              { nombre: 'TEST — Verificación de sistema',         precio: 10,   costo: 0    },
};

const FONDO_POR_VENTA = 20; // MXN por venta
const SHEETS_URL = process.env.SHEETS_URL || '';

// ── CALCULAR COMISIÓN DE STRIPE ──────────────────────────
// México: 3.6% + $3 MXN tarjetas nacionales
//         4.6% + $3 MXN tarjetas internacionales
function calcularComisionStripe(monto, tipoTarjeta) {
  const pct  = tipoTarjeta === 'internacional' ? 0.046 : 0.036;
  const fijo = 3; // MXN
  return Math.round((monto * pct) + fijo);
}

// ── CALCULAR DISTRIBUCIÓN DE GANANCIAS ───────────────────
function calcularGanancias(slug, totalCobrado, personas, vendedor, tipoTarjeta) {
  const tour  = CATALOGO[slug] || {};
  const costo = tour.costo || 0;

  const costoTotal       = costo * personas;
  const comisionStripe   = calcularComisionStripe(totalCobrado, tipoTarjeta || 'nacional');
  const fondo            = FONDO_POR_VENTA;
  const gananciaNeta     = totalCobrado - costoTotal - comisionStripe - fondo;

  const pctFijo  = { jesus: 0.35, enrique: 0.40 };
  const pctVenta = 0.25;

  let jesusTotal   = gananciaNeta * pctFijo.jesus;
  let enriqueTotal = gananciaNeta * pctFijo.enrique;
  let vendedorGana = gananciaNeta * pctVenta;

  if (vendedor === 'jesus')        jesusTotal   += vendedorGana;
  else if (vendedor === 'enrique') enriqueTotal += vendedorGana;

  return {
    precio_venta:      totalCobrado,
    costo_reporte:     costoTotal,
    comision_stripe:   comisionStripe,
    fondo_operativo:   fondo,
    ganancia_neta:     Math.round(gananciaNeta),
    jesus_recibe:      Math.round(jesusTotal),
    enrique_recibe:    Math.round(enriqueTotal),
    vendedor:          vendedor,
    vendedor_bono:     Math.round(vendedorGana),
  };
}

// ── REGISTRAR VENTA EN GOOGLE SHEETS ─────────────────────
async function registrarEnSheets(venta) {
  if (!SHEETS_URL) {
    console.warn('⚠ SHEETS_URL no configurada — venta no registrada');
    return;
  }
  try {
    // Usar fetch (Node 18+) que sigue redirects automáticamente
    // Apps Script responde con 302 redirect que https.request NO seguía
    const response = await fetch(SHEETS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(venta),
      redirect: 'follow',
    });
    const text = await response.text();
    if (response.ok) {
      console.log('✓ Venta registrada en Sheets:', venta.tour, '| Status:', response.status);
    } else {
      console.error('❌ Sheets respondió con error:', response.status, text.slice(0, 200));
    }
  } catch (e) {
    console.error('❌ Sheets fetch error:', e.message);
  }
}


// ─── EMAIL DE CONFIRMACIÓN ────────────────────────────────
function getEmailConfig() {
  return {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
  };
}

async function enviarEmailSMTP(to, subject, htmlBody) {
  // ── Opción 1: Resend API (recomendado — zero npm, mejor deliverability) ──
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Cenotes Homún <reservas@cenoteshomun.com>',
        to:      [to],
        subject: subject,
        html:    htmlBody,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error('Resend error: ' + JSON.stringify(data));
    console.log('✅ Email enviado via Resend a:', to);
    return;
  }

  // ── Opción 2: nodemailer + SMTP Hostinger ─────────────────────────────────
  let nm;
  try { nm = require('nodemailer'); } catch(e) {
    throw new Error('nodemailer no instalado y RESEND_API_KEY no configurado. Configura una de las dos opciones.');
  }
  const cfg = getEmailConfig();
  if (!cfg.user || !cfg.pass) throw new Error('EMAIL_USER o EMAIL_PASS no configurados');

  const transporter = nm.createTransport({
    host: cfg.host, port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
  });
  await transporter.sendMail({
    from:    '"Cenotes Homún" <' + cfg.user + '>',
    to, subject, html: htmlBody,
  });
  console.log('✅ Email enviado via SMTP a:', to);
}

async function enviarConfirmacion({ email, nombre, tour, fecha, personas, precio }) {
  if (!email) return;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',sans-serif;background:#f8f7f4;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:#1a3a2a;padding:28px 24px;text-align:center}
  .hdr h1{color:#f5ede0;font-size:1.3rem;margin:0 0 4px}
  .hdr p{color:rgba(245,237,224,0.55);font-size:0.82rem;margin:0}
  .bod{padding:28px 24px}
  .icon{text-align:center;font-size:2.8rem;margin-bottom:12px}
  .ttl{text-align:center;font-size:1.15rem;font-weight:700;color:#1a3a2a;margin-bottom:6px}
  .sub{text-align:center;color:#888;font-size:0.85rem;margin-bottom:24px}
  .card{background:#f8f7f4;border-radius:12px;padding:18px;margin-bottom:20px}
  .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:0.85rem}
  .row:last-child{border-bottom:none}
  .lbl{color:#999}.val{color:#1a3a2a;font-weight:600}
  .steps{margin-bottom:20px}
  .step{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0;align-items:flex-start}
  .step:last-child{border-bottom:none}
  .num{width:24px;height:24px;background:rgba(10,157,168,0.12);color:#0a9da8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;flex-shrink:0;margin-top:1px}
  .stxt strong{display:block;font-size:0.85rem;color:#1a3a2a}
  .stxt span{font-size:0.8rem;color:#999}
  .wa{display:block;text-align:center;background:#25D366;color:white;text-decoration:none;padding:13px;border-radius:10px;font-weight:600;font-size:0.88rem;margin-bottom:20px}
  .ftr{background:#f8f7f4;padding:18px 24px;text-align:center;font-size:0.75rem;color:#bbb}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>Cenotes Homún</h1><p>by TuTravelSolutions</p></div>
  <div class="bod">
    <div class="icon">✅</div>
    <div class="ttl">¡Reserva confirmada!</div>
    <div class="sub">Hola ${nombre || 'viajero'}, tu pago fue procesado exitosamente.</div>
    <div class="card">
      <div class="row"><span class="lbl">Tour</span><span class="val">${tour}</span></div>
      <div class="row"><span class="lbl">Fecha solicitada</span><span class="val">${fecha || 'Por confirmar'}</span></div>
      <div class="row"><span class="lbl">Personas</span><span class="val">${personas}</span></div>
      <div class="row"><span class="lbl">Total pagado</span><span class="val">$${precio} MXN</span></div>
      <div class="row"><span class="lbl">Punto de encuentro</span><span class="val">Entrada de Homún, Yucatán</span></div>
      <div class="row"><span class="lbl">Horario</span><span class="val">9:00 AM</span></div>
    </div>
    <div class="steps">
      <div class="step"><div class="num">1</div><div class="stxt"><strong>Confirma tu fecha por WhatsApp</strong><span>Escríbenos para agendar el día y hora exacta de tu tour.</span></div></div>
      <div class="step"><div class="num">2</div><div class="stxt"><strong>Lleva traje de baño y toalla</strong><span>Snorkel y chaleco salvavidas están incluidos en el tour.</span></div></div>
      <div class="step"><div class="num">3</div><div class="stxt"><strong>Bloqueador solar biodegradable</strong><span>Obligatorio para proteger el ecosistema de los cenotes.</span></div></div>
    </div>
    <a class="wa" href="https://wa.me/529994105737?text=Hola%2C%20acabo%20de%20reservar%20y%20quiero%20confirmar%20mi%20fecha">
      💬 Confirmar fecha por WhatsApp
    </a>
  </div>
  <div class="ftr">Cenotes Homún by TuTravelSolutions &nbsp;·&nbsp; +52 999 410 5737<br>cenoteshomun.com &nbsp;·&nbsp; Homún, Yucatán, México</div>
</div></body></html>`;

  try {
    await enviarEmailSMTP(email, '✅ Reserva confirmada — ' + tour, html);
    console.log('✅ Email de confirmación enviado a:', email);
  } catch(e) {
    console.error('❌ Error enviando email:', e.message);
  }
}

// ── HEADERS DE SEGURIDAD ─────────────────────────────────
app.use((req, res, next) => {
  // Evita que la página se cargue en un iframe (clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Evita que el navegador adivine el tipo de contenido
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Fuerza HTTPS por 1 año
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Controla qué información se envía en el Referer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Deshabilita características del navegador que no se usan
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content Security Policy — solo permite recursos del mismo dominio + CDNs usados
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.stripe.com https://www.google-analytics.com; " +
    "frame-src https://js.stripe.com; " +
    "object-src 'none';"
  );
  next();
});

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(cors({
  origin: ['https://cenoteshomun.com', 'https://www.cenoteshomun.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
// Archivos admin protegidos por contraseña
app.use('/admin', (req, res, next) => {
  // Permitir solo si viene con token válido o es la página de login implícita
  const token = req.query.token;
  if (token && adminSessions.has(token)) {
    // Inyectar token en la respuesta HTML para que JS lo tenga
    return next();
  }
  res.status(401).send(getLoginPage());
});

// Bloquear acceso a archivos sensibles
const BLOCKED_PATHS = [
  '/server.js', '/package.json', '/package-lock.json',
  '/.env', '/.gitignore', '/node_modules'
];
app.use((req, res, next) => {
  const url = req.path.toLowerCase();
  if (BLOCKED_PATHS.some(p => url === p || url.startsWith('/node_modules'))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

app.use(express.static(path.join(__dirname), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));


// ── PROTECCIÓN DEL PANEL ADMIN ────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD no está configurada en las variables de entorno');
  process.exit(1); // No arrancar sin contraseña configurada
}
const adminSessions  = new Set(); // tokens activos en memoria

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (adminSessions.has(token)) return next();
  // Servir página de login en lugar del recurso
  res.status(401).send(getLoginPage());
}

function getLoginPage() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acceso restringido — Cenotes Homún</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Outfit',sans-serif;background:#0d2b1e;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:white;border-radius:16px;padding:40px;width:100%;max-width:360px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.3)}
.logo{font-size:1.1rem;font-weight:700;color:#1a3a2a;margin-bottom:6px}
.logo span{color:#0a9da8}
.sub{font-size:0.8rem;color:#aaa;margin-bottom:28px}
input{width:100%;padding:12px;border:1.5px solid #e2e2de;border-radius:8px;font-size:0.9rem;outline:none;margin-bottom:12px;font-family:inherit;transition:border-color 0.2s}
input:focus{border-color:#0a9da8}
button{width:100%;padding:12px;background:#1a3a2a;color:white;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.2s}
button:hover{background:#0d2b1e}
.error{color:#e53e3e;font-size:0.8rem;margin-top:8px;display:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Cenotes <span>Homún</span></div>
  <div class="sub">Panel privado — acceso restringido</div>
  <input type="password" id="pwd" placeholder="Contraseña" onkeydown="if(event.key==='Enter')login()">
  <button onclick="login()">Entrar</button>
  <div class="error" id="err">Contraseña incorrecta</div>
</div>
<script>
async function login() {
  var pwd = document.getElementById('pwd').value;
  var res = await fetch('/api/admin-login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})});
  var data = await res.json();
  if (data.token) {
    sessionStorage.setItem('adminToken', data.token);
    window.location.reload();
  } else {
    document.getElementById('err').style.display='block';
  }
}
// Si ya tenemos token, agregarlo a todas las peticiones futuras
var t = sessionStorage.getItem('adminToken');
if (t) {
  // Recargar con token en header no funciona directo — usar fetch interceptor
  document.addEventListener('DOMContentLoaded', function() {
    window.location.href = window.location.pathname + '?token=' + t;
  });
}
</script>
</body>
</html>`;
}

// Rate limiter simple para login (sin dependencias extra)
const loginAttempts = new Map(); // ip -> { count, lastAttempt }

function checkLoginRateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const window = 15 * 60 * 1000; // ventana de 15 minutos
  const maxAttempts = 10;

  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  // Resetear si pasó la ventana de tiempo
  if (now - entry.firstAttempt > window) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const waitMinutes = Math.ceil((window - (now - entry.firstAttempt)) / 60000);
    return { allowed: false, waitMinutes };
  }

  loginAttempts.set(ip, { count: entry.count + 1, firstAttempt: entry.firstAttempt });
  return { allowed: true, remaining: maxAttempts - entry.count - 1 };
}



// ── API: TEST EMAIL DIRECTO (verifica contraseña en el body) ──
app.post('/api/test-email-directo', async (req, res) => {
  const { to, password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  if (!to) return res.status(400).json({ error: 'Falta el campo "to"' });

  const cfg = getEmailConfig();
  const metodo = process.env.RESEND_API_KEY ? 'Resend API' : (cfg.user ? 'SMTP Hostinger' : 'No configurado');
  if (!process.env.RESEND_API_KEY && !cfg.user) {
    return res.status(500).json({
      error: 'Sin configuración de email. Configura RESEND_API_KEY (recomendado) o EMAIL_USER + EMAIL_PASS.',
      metodo,
      opciones: {
        'Opción A (recomendada)': 'Crear cuenta en resend.com → agregar RESEND_API_KEY en Hostinger',
        'Opción B':               'Configurar EMAIL_USER, EMAIL_PASS, EMAIL_HOST=smtp.hostinger.com, EMAIL_PORT=465 en Hostinger',
      }
    });
  }

  try {
    await enviarEmailSMTP(
      to,
      '🧪 Test email — Cenotes Homún',
      '<p>El sistema de emails funciona correctamente. ✅</p><p>Método: <b>' + metodo + '</b></p>'
    );
    res.json({ ok: true, mensaje: 'Email enviado a ' + to, metodo });
  } catch(e) {
    res.status(500).json({ error: e.message, metodo });
  }
});

// (test-email-directo reemplaza este endpoint)

// Login endpoint
app.post('/api/admin-login', (req, res) => {
  const rateCheck = checkLoginRateLimit(req);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Demasiados intentos. Espera ${rateCheck.waitMinutes} minutos.`
    });
  }

  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.add(token);
    // Limpiar sesiones viejas después de 8 horas
    setTimeout(() => adminSessions.delete(token), 8 * 60 * 60 * 1000);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Contraseña incorrecta' });
  }
});

// ── API: CHECKOUT ─────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  try {
    const { tour_slug, tour_nombre, line_items, cliente, fecha, success_url, cancel_url, lang, ref } = req.body;

    if (!line_items || line_items.length === 0)
      return res.status(400).json({ error: 'Sin artículos' });

    const totalPersonas = line_items.reduce((a, i) => a + (parseInt(i.cantidad) || 0), 0);
    if (totalPersonas < 1) return res.status(400).json({ error: 'Personas inválido' });
    if (totalPersonas > 30) return res.status(400).json({ error: 'Máximo 30 personas por reserva' });

    // Validar que los precios no sean manipulados desde el cliente
    // Los precios deben venir del catálogo del servidor, no del cliente
    const tourData = CATALOGO[tour_slug];
    if (tourData) {
      const expectedMin = tourData.precio * 0.9; // 10% de tolerancia por niños
      const totalCalculado = line_items.reduce((a, i) => a + (parseInt(i.cantidad) || 0) * (parseInt(i.precio_unitario) || 0), 0);
      if (totalCalculado < expectedMin * totalPersonas * 0.5) {
        console.warn('⚠ Posible manipulación de precios:', { tour_slug, totalCalculado, esperado: tourData.precio });
        return res.status(400).json({ error: 'Precio inválido' });
      }
    }

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
      customer_email: req.body.email || undefined,  // Stripe envía recibo automático
      phone_number_collection: { enabled: true },
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
        email:     req.body.email || '',
        telefono:  req.body.telefono || '',
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

// ── API: GENERAR ENLACE (requiere auth) ────────────────────
app.post('/api/generar-enlace', adminAuth, async (req, res) => {
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
// Maneja tanto webhooks clásicos (payload completo)
// como webhooks del Workbench (thin events / resumen)
app.post('/api/webhook', async (req, res) => {
  let event;
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body   = req.body;

  try {
    if (!secret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET no configurado — rechazando webhook');
      return res.status(400).send('Webhook secret not configured');
    }
    if (!sig) {
      console.error('❌ Webhook sin firma — posible petición maliciosa');
      return res.status(400).send('Missing stripe-signature header');
    }
    // Verificar firma siempre — rechazar si no es válida
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('❌ Webhook firma inválida:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }

  console.log('📨 Webhook recibido:', event.type, '| ID:', event.id);

  // Workbench thin event: solo contiene el ID, hay que buscar los datos
  // Se detecta porque data.object no existe o es un string (el ID del recurso)
  let session = null;

  if (event.type === 'checkout.session.completed') {
    try {
      if (event.data && event.data.object && typeof event.data.object === 'object') {
        // Webhook clásico — datos completos
        session = event.data.object;
        console.log('📦 Payload completo recibido');
      } else {
        // Thin event del Workbench — buscar sesión por ID
        const sessionId = event.data?.id || event.data?.object;
        if (sessionId) {
          console.log('🔍 Thin event — buscando sesión:', sessionId);
          session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
          });
        }
      }
    } catch(err) {
      console.error('❌ Error obteniendo sesión:', err.message);
    }
  }

  if (event.type === 'checkout.session.completed' && session) {
    const meta     = session.metadata || {};
    const total    = session.amount_total / 100;
    const personas = parseInt(meta.personas) || 1;
    const slug     = meta.tour_slug || '';
    const vendedor = meta.vendedor || 'jesus';

    const dist = calcularGanancias(slug, total, personas, vendedor, 'nacional');

    const registro = {
      hoja:             'ventas',
      fecha:            new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      tour:             meta.tour || slug,
      cliente:          meta.cliente || '',
      fecha_tour:       meta.fecha || '',
      personas:         personas,
      canal:            meta.canal || 'web',
      vendedor:         vendedor,
      precio_venta:     dist.precio_venta,
      costo_reporte:    dist.costo_reporte,
      comision_stripe:  dist.comision_stripe,
      fondo_operativo:  dist.fondo_operativo,
      ganancia_neta:    dist.ganancia_neta,
      jesus_recibe:     dist.jesus_recibe,
      enrique_recibe:   dist.enrique_recibe,
      email_cliente:    session.customer_email || meta.email || '',
      telefono:         (session.customer_details && session.customer_details.phone) || meta.telefono || '',
      stripe_id:        session.id,
      modo:             session.livemode ? 'live' : 'test',
    };

    console.log('✅ Pago completado — registrando:', registro.tour, '|', registro.precio_venta, 'MXN');
    await registrarEnSheets(registro);

    // Enviar email de confirmación al cliente
    await enviarConfirmacion({
      email:    registro.email_cliente,
      nombre:   meta.cliente || '',
      tour:     registro.tour,
      fecha:    registro.fecha_tour,
      telefono: registro.telefono || '',
      precio:   registro.precio_venta,
      personas: registro.personas,
    });
  }

  res.json({ received: true });
});

// ── API: REGISTRAR VENTA MANUAL (requiere auth) ─────────────
app.post('/api/venta-manual', adminAuth, async (req, res) => {
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


// ── API: DIAGNÓSTICO (protegido) ─────────────────────────
app.get('/api/diagnostico', adminAuth, async (req, res) => {
  const resultados = {
    servidor:       '✅ funcionando',
    stripe_key:     process.env.STRIPE_SECRET_KEY ? '✅ configurada' : '❌ falta STRIPE_SECRET_KEY',
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? '✅ configurado' : '⚠️ falta STRIPE_WEBHOOK_SECRET',
    sheets_url:     process.env.SHEETS_URL ? '✅ configurada' : '❌ falta SHEETS_URL',
    sheets_url_val: process.env.SHEETS_URL ? process.env.SHEETS_URL.substring(0, 60) + '...' : 'no definida',
    node_version:   process.version,
    entorno:        process.env.NODE_ENV || 'production',
  };

  // Probar conexión con Sheets
  if (process.env.SHEETS_URL) {
    try {
      const testData = {
        hoja: 'ventas',
        fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
        tour: '🔧 TEST DIAGNÓSTICO',
        cliente: 'Sistema',
        fecha_tour: '',
        personas: 0,
        canal: 'test',
        vendedor: 'sistema',
        precio_venta: 0,
        costo_reporte: 0,
        comision_stripe: 0,
        fondo_operativo: 0,
        ganancia_neta: 0,
        jesus_recibe: 0,
        enrique_recibe: 0,
        stripe_id: 'DIAGNOSTICO-' + Date.now(),
        modo: 'test',
      };
      await registrarEnSheets(testData);
      resultados.sheets_test = '✅ registro enviado a Sheets';
    } catch(e) {
      resultados.sheets_test = '❌ error: ' + e.message;
    }
  } else {
    resultados.sheets_test = '⏭️ saltado (sin SHEETS_URL)';
  }

  res.json(resultados);
});

// ── API: SIMULAR WEBHOOK (protegido) ──────────────────────
app.post('/api/simular-venta', adminAuth, async (req, res) => {
  try {
    const { tour_slug, adultos, vendedor } = req.body;
    const tour = CATALOGO[tour_slug];
    if (!tour) return res.status(400).json({ error: 'Tour no encontrado: ' + tour_slug });

    const total    = tour.precio * (adultos || 1);
    const personas = adultos || 1;
    const dist     = calcularGanancias(tour_slug, total, personas, vendedor || 'jesus', 'nacional');

    const registro = {
      hoja:             'ventas',
      fecha:            new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      tour:             tour.nombre,
      cliente:          'SIMULACIÓN',
      fecha_tour:       '',
      personas:         personas,
      canal:            'test',
      vendedor:         vendedor || 'jesus',
      precio_venta:     dist.precio_venta,
      costo_reporte:    dist.costo_reporte,
      comision_stripe:  dist.comision_stripe,
      fondo_operativo:  dist.fondo_operativo,
      ganancia_neta:    dist.ganancia_neta,
      jesus_recibe:     dist.jesus_recibe,
      enrique_recibe:   dist.enrique_recibe,
      stripe_id:        'SIM-' + Date.now(),
      modo:             'test',
    };

    console.log('🔧 Simulando venta:', registro);
    await registrarEnSheets(registro);

    res.json({ ok: true, registro, distribucion: dist });
  } catch(err) {
    console.error('Simular venta error:', err);
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
