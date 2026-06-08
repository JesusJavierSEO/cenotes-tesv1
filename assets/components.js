/**
 * CENOTES HOMÚN — Componentes modulares
 * nav.js + footer.js en un solo archivo
 *
 * Para agregar un enlace al menú: edita ONLY this file.
 * Se actualiza en todo el sitio automáticamente.
 *
 * Uso en cada HTML:
 *   <div id="nav-placeholder"></div>   ← al inicio del body
 *   <div id="footer-placeholder"></div> ← al final del body
 *   <script src="assets/components.js"></script>
 */

(function () {
  /* ─────────────────────────────────────────────────────────
     GOOGLE TAG MANAGER
     GA4 se gestiona desde GTM — no cargar gtag.js por separado.
     GTM ID: GTM-TNLT9JNQ
  ───────────────────────────────────────────────────────── */
  function loadGTM() {
    // GTM head snippet
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),
          dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-TNLT9JNQ');

    // GTM noscript fallback — inyectar justo después de <body>
    var noscript = document.createElement('noscript');
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.googletagmanager.com/ns.html?id=GTM-TNLT9JNQ';
    iframe.height = '0'; iframe.width = '0';
    iframe.style.cssText = 'display:none;visibility:hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }

  /* ─────────────────────────────────────────────────────────
     CONFIGURACIÓN — edita solo esta sección
  ───────────────────────────────────────────────────────── */
  const CONFIG = {
    whatsapp: "529994105737", // ← Reemplaza con tu número real (con código de país, sin +)
    siteName: "Cenotes Homún",

    // Páginas con nav oscuro (hero background)
    // Detecta por pathname — rutas absolutas desde la raíz
    darkNavPages: ["/", "/index.html", "/en.html"],

    // Menú en español — RUTAS ABSOLUTAS (funcionan desde cualquier subcarpeta)
    navES: [
      { label: "Inicio",   href: "/" },
      { label: "Homún",    href: "/destinos/homun.html" },
      { label: "Tulum",    href: "/destinos/tulum.html" },
      { label: "Cancún",   href: "/tours-cancun.html" },
      { label: "Guía",     href: "/guia-cenotes-homun.html" },
    ],
    navCtaES: { label: "Reservar", href: "/#paquetes" },

    // Menú en inglés — RUTAS ABSOLUTAS
    navEN: [
      { label: "Home",         href: "/en.html" },
      { label: "Homún",        href: "/destinos/homun-en.html" },
      { label: "Tulum",        href: "/destinos/tulum-en.html" },
      { label: "Cancún",       href: "/tours-cancun.html" },
      { label: "Guide",        href: "/cenotes-guide-homun.html" },
    ],
    navCtaEN: { label: "Book Now", href: "/en.html#packages" },

    // Footer — columna de destinos/tours ES
    footerPackagesES: [
      { label: "Tours en Homún",   href: "/destinos/homun.html" },
      { label: "Tours en Tulum",   href: "/destinos/tulum.html" },
      { label: "Cenote Santa Bárbara", href: "/tours/cenote-santa-barbara.html" },
      { label: "Cenote Santa Rosa",    href: "/tours/cenote-santa-rosa.html" },
      { label: "Tours Cancún",         href: "/tours-cancun.html" },
    ],
    // Footer — columna de info ES
    footerInfoES: [
      { label: "Guía de cenotes", href: "/guia-cenotes-homun.html" },
      { label: "Cómo llegar",     href: "/como-llegar.html" },
      { label: "FAQ",             href: "/faq.html" },
      { label: "Inicio",          href: "/" },
    ],
    // Footer — columna de destinos EN
    footerPackagesEN: [
      { label: "Homún Tours",      href: "/destinos/homun-en.html" },
      { label: "Tulum Tours",      href: "/destinos/tulum-en.html" },
      { label: "Cenote Santa Bárbara", href: "/tours/cenote-santa-barbara.html" },
      { label: "Cenote Santa Rosa",    href: "/tours/cenote-santa-rosa.html" },
      { label: "Cancún Tours",         href: "/tours-cancun.html" },
    ],
    footerInfoEN: [
      { label: "Cenotes guide",   href: "/cenotes-guide-homun.html" },
      { label: "Getting there",   href: "/getting-there.html" },
      { label: "FAQ",             href: "/faq.html" },
      { label: "Home",            href: "/en.html" },
    ],
  };

  /* ─────────────────────────────────────────────────────────
     UTILIDADES
  ───────────────────────────────────────────────────────── */
  // Detecta idioma de la página actual
  function getLang() {
    return document.documentElement.lang === "en" ? "en" : "es";
  }

  // Detecta si el nav debe ser dark (hero oscuro) o light (artículos)
  // Dark: landings, destinos, tours — todos tienen page-hero oscuro
  // Light: guía, FAQ, cómo llegar — son páginas de artículo con fondo blanco
  function isDarkNav() {
    const path = window.location.pathname;
    const lightPages = [
      "/guia-cenotes-homun.html",
      "/cenotes-guide-homun.html",
      "/faq.html",
      "/como-llegar.html",
    ];
    // Si es una página de artículo → nav light
    if (lightPages.includes(path)) return false;
    // Todo lo demás (inicio, destinos, tours, cancún, etc.) → nav dark
    return true;
  }

  // Detecta página activa — compara la ruta actual con el href del link
  function isActive(href) {
    const path = window.location.pathname;
    if (!href || href === "#") return false;
    const hrefPath = href.split("#")[0];
    if (!hrefPath) return false;
    if ((hrefPath === "/" || hrefPath === "/index.html") &&
        (path === "/" || path === "/index.html")) return true;
    return path === hrefPath;
  }

  // Mapa de equivalencias ES ↔ EN para el toggle de idioma
  const LANG_MAP = {
    // Raíz
    "/":                          "/en.html",
    "/index.html":                "/en.html",
    "/en.html":                   "/",
    // Destinos
    "/destinos/homun.html":       "/destinos/homun-en.html",
    "/destinos/homun-en.html":    "/destinos/homun.html",
    "/destinos/tulum.html":       "/destinos/tulum-en.html",
    "/destinos/tulum-en.html":    "/destinos/tulum.html",
    // Tours Homún
    "/tours/cenote-santa-barbara.html":            "/tours/cenote-santa-barbara-en.html",
    "/tours/cenote-santa-barbara-en.html":         "/tours/cenote-santa-barbara.html",
    "/tours/cenote-santa-rosa.html":               "/tours/cenote-santa-rosa-en.html",
    "/tours/cenote-santa-rosa-en.html":            "/tours/cenote-santa-rosa.html",
    "/tours/cenotes-santa-cruz.html":              "/tours/cenotes-santa-cruz-en.html",
    "/tours/cenotes-santa-cruz-en.html":           "/tours/cenotes-santa-cruz.html",
    "/tours/cenote-santa-cruz-cuatrimotos.html":   "/tours/cenote-santa-cruz-cuatrimotos-en.html",
    "/tours/cenote-santa-cruz-cuatrimotos-en.html":"/tours/cenote-santa-cruz-cuatrimotos.html",
    "/tours/cenotes-casa-tortuga.html":            "/tours/cenotes-casa-tortuga-en.html",
    "/tours/cenotes-casa-tortuga-en.html":         "/tours/cenotes-casa-tortuga.html",
    // Guía
    "/guia-cenotes-homun.html":   "/cenotes-guide-homun.html",
    "/cenotes-guide-homun.html":  "/guia-cenotes-homun.html",
    // Cómo llegar
    "/como-llegar.html":          "/getting-there.html",
    "/getting-there.html":        "/como-llegar.html",
    // FAQ bilingüe (misma página)
    "/faq.html":                  "/faq.html",
    // Cancún y nuevos destinos
    "/tours-cancun.html":             "/tours-cancun.html",
    "/destinos/isla-mujeres.html":    "/destinos/isla-mujeres-en.html",
    "/destinos/isla-mujeres-en.html": "/destinos/isla-mujeres.html",
    "/destinos/puerto-morelos.html":  "/destinos/puerto-morelos-en.html",
    "/destinos/puerto-morelos-en.html":"/destinos/puerto-morelos.html",
    // Blog posts
    "/mejores-cenotes-cerca-merida.html": "/mejores-cenotes-cerca-merida.html",
    "/que-hacer-tulum-cenotes.html":      "/que-hacer-tulum-cenotes.html",
    // Página unificada Casa Tortuga
    "/tours/casa-tortuga.html":         "/tours/casa-tortuga-en.html",
    "/tours/casa-tortuga-en.html":      "/tours/casa-tortuga.html",
    // Tours individuales (se mantienen para SEO)
    // Tours nuevos ES <-> EN
    "/tours/isla-mujeres-catamaran.html":          "/tours/isla-mujeres-catamaran-en.html",
    "/tours/isla-mujeres-catamaran-en.html":       "/tours/isla-mujeres-catamaran.html",
    "/tours/off-road-casa-tortugas.html":          "/tours/off-road-casa-tortugas-en.html",
    "/tours/off-road-casa-tortugas-en.html":       "/tours/off-road-casa-tortugas.html",
    "/tours/cenotes-casa-tortuga-gold.html":       "/tours/cenotes-casa-tortuga-gold-en.html",
    "/tours/cenotes-casa-tortuga-gold-en.html":    "/tours/cenotes-casa-tortuga-gold.html",
    "/tours/casa-tortuga-silver.html":             "/tours/casa-tortuga-silver-en.html",
    "/tours/casa-tortuga-silver-en.html":          "/tours/casa-tortuga-silver.html",
    "/tours/atvs-off-road-shared-puerto-morelos.html":    "/tours/atvs-off-road-shared-puerto-morelos-en.html",
    "/tours/atvs-off-road-shared-puerto-morelos-en.html": "/tours/atvs-off-road-shared-puerto-morelos.html",
    "/tours/atvs-off-road-single-caballos-puerto-morelos.html":    "/tours/atvs-off-road-single-caballos-puerto-morelos-en.html",
    "/tours/atvs-off-road-single-caballos-puerto-morelos-en.html": "/tours/atvs-off-road-single-caballos-puerto-morelos.html",
  };

  // Obtiene la URL equivalente en el otro idioma
  function getAltLangUrl() {
    const path = window.location.pathname;
    return LANG_MAP[path] || null;
  }

  // Helper para crear lista de links de footer
  function footerLinks(items) {
    return items.map(i => `<a href="${i.href}">${i.label}</a>`).join("\n");
  }

  /* ─────────────────────────────────────────────────────────
     NAV
  ───────────────────────────────────────────────────────── */
  function buildNav() {
    const lang = getLang();
    const dark = isDarkNav();
    const navClass = dark ? "nav-dark" : "nav-light";
    const links = lang === "en" ? CONFIG.navEN : CONFIG.navES;
    const cta   = lang === "en" ? CONFIG.navCtaEN : CONFIG.navCtaES;
    const homeES = "/";
    const homeEN = "/en.html";

    const linksHTML = links.map(l => {
      const active = isActive(l.href) ? " active" : "";
      return `<a href="${l.href}" class="nav-link${active}">${l.label}</a>`;
    }).join("\n");

    const langSwitch = `
      <div class="nav-lang">
        <a href="${lang === "es" ? window.location.pathname : (getAltLangUrl() || "/")}" class="lang-btn${lang === "es" ? " active" : ""}">ES</a>
        <a href="${lang === "en" ? window.location.pathname : (getAltLangUrl() || "/en.html")}" class="lang-btn${lang === "en" ? " active" : ""}">EN</a>
      </div>`;

    // Mobile menu links
    const mobileLinksHTML = links.map(l =>
      `<a href="${l.href}" class="nav-mobile-link">${l.label}</a>`
    ).join("\n");

    const navHTML = `
<nav id="site-nav" class="${navClass}" role="navigation" aria-label="Menú principal">
  <a href="${lang === "en" ? "/en.html" : "/"}" class="nav-logo">
    Cenotes <span>Homún</span>
  </a>
  <div class="nav-links">
    ${linksHTML}
    ${langSwitch}
    <a href="${cta.href}" class="nav-link nav-cta">${cta.label}</a>
  </div>
  <button class="nav-toggle" aria-label="Abrir menú" onclick="toggleMobileMenu()">
    <span></span><span></span><span></span>
  </button>
</nav>

<div class="nav-mobile-menu" id="mobile-menu" role="dialog" aria-modal="true">
  <button class="nav-mobile-close" onclick="toggleMobileMenu()" aria-label="Cerrar menú">✕</button>
  ${mobileLinksHTML}
  <a href="${cta.href}" class="nav-mobile-link" style="color:var(--agua-light)">${cta.label}</a>
  <div class="nav-mobile-lang">
    <a href="${lang === "es" ? window.location.pathname : (getAltLangUrl() || "/")}" class="${lang === "es" ? "active" : ""}">ES</a>
    <a href="${lang === "en" ? window.location.pathname : (getAltLangUrl() || "/en.html")}" class="${lang === "en" ? "active" : ""}">EN</a>
  </div>
</div>`;

    const placeholder = document.getElementById("nav-placeholder");
    if (placeholder) placeholder.outerHTML = navHTML;

    // Scroll behavior: add nav-scrolled class when scrolled
    if (dark) {
      window.addEventListener("scroll", function () {
        const nav = document.getElementById("site-nav");
        if (!nav) return;
        if (window.scrollY > 60) {
          nav.classList.add("nav-scrolled");
          nav.classList.remove("nav-dark");
        } else {
          nav.classList.remove("nav-scrolled");
          nav.classList.add("nav-dark");
        }
      }, { passive: true });
    }
  }

  /* ─────────────────────────────────────────────────────────
     FOOTER
  ───────────────────────────────────────────────────────── */
  function buildFooter() {
    const lang = getLang();
    const year = new Date().getFullYear();
    const isEN = lang === "en";

    const pkgLinks  = footerLinks(isEN ? CONFIG.footerPackagesEN : CONFIG.footerPackagesES);
    const infoLinks = footerLinks(isEN ? CONFIG.footerInfoEN    : CONFIG.footerInfoES);

    const footerHTML = `
<footer id="site-footer">
  <div class="footer-inner">
    <div>
      <a href="${isEN ? "en.html" : "index.html"}" class="footer-logo">
        Cenotes <span>Homún</span>
      </a>
      <p class="footer-tagline">
        ${isEN
          ? "Authentic experiences in the cenotes of Homún, Yucatán. Local guide and adventure guaranteed."
          : "Experiencias auténticas en los cenotes de Homún, Yucatán. Guía local y aventura garantizada."}
      </p>
    </div>
    <div class="footer-col">
      <h4>${isEN ? "Packages" : "Paquetes"}</h4>
      ${pkgLinks}
    </div>
    <div class="footer-col">
      <h4>${isEN ? "Information" : "Información"}</h4>
      ${infoLinks}
    </div>
    <div class="footer-col">
      <h4>${isEN ? "Contact" : "Contacto"}</h4>
      <p>📍 Homún, Yucatán, México</p>
      <p>💬 WhatsApp</p>
      <p>✉️ ${isEN ? "Online bookings" : "Reservas en línea"}</p>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© ${year} Cenotes Homún · ${isEN ? "All rights reserved" : "Todos los derechos reservados"}</span>
    <span>
      <a href="${getAltLangUrl() && lang === "en" ? getAltLangUrl() : "/"}">Español</a> ·
      <a href="${getAltLangUrl() && lang === "es" ? getAltLangUrl() : "/en.html"}">English</a> ·
      <a href="faq.html">FAQ</a>
    </span>
  </div>
</footer>`;

    const placeholder = document.getElementById("footer-placeholder");
    if (placeholder) placeholder.outerHTML = footerHTML;
  }

  /* ─────────────────────────────────────────────────────────
     WHATSAPP FLOAT
  ───────────────────────────────────────────────────────── */
  function buildWhatsApp() {
    const lang = getLang();
    const msg = lang === "en"
      ? "Hi! I'd like to know more about the cenote packages in Homún."
      : "Hola! Me gustaría saber más sobre los paquetes de cenotes en Homún.";
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

    const el = document.createElement("a");
    el.id = "whatsapp-float";
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.setAttribute("aria-label", "Contactar por WhatsApp");
    el.title = "WhatsApp";
    el.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
    document.body.appendChild(el);
  }

  /* ─────────────────────────────────────────────────────────
     MOBILE MENU TOGGLE (global)
  ───────────────────────────────────────────────────────── */
  window.toggleMobileMenu = function () {
    const menu = document.getElementById("mobile-menu");
    if (menu) menu.classList.toggle("open");
  };

  // Cerrar con Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const menu = document.getElementById("mobile-menu");
      if (menu) menu.classList.remove("open");
    }
  });

  /* ─────────────────────────────────────────────────────────
     INIT — se ejecuta cuando el DOM está listo
  ───────────────────────────────────────────────────────── */
  function init() {
    loadGTM();
    buildNav();
    buildFooter();
    buildWhatsApp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ─── GALERÍA INTELIGENTE DE FOTOS ─────────────────────── */
(function() {
  function initGalleries() {
    document.querySelectorAll('.tour-gallery-wrap').forEach(function(wrap) {
      var slug = wrap.dataset.tour;
      if (!slug) return;
      var imgs = [];
      var checked = 0;
      var MAX = 5;

      function checkDone() {
        checked++;
        if (checked >= MAX) showGallery(imgs, wrap, slug);
      }
      function showGallery(imgs, wrap, slug) {
        if (imgs.length === 0) return; // Sin fotos — queda el SVG
        var grid = document.getElementById('gallery-' + slug);
        var fallback = document.getElementById('gallery-fallback-' + slug);
        if (!grid || !fallback) return;
        fallback.style.display = 'none';
        grid.style.display = 'grid';
        // Imagen principal
        var mainImg = grid.querySelector('img');
        if (mainImg) mainImg.src = imgs[0];
        // Miniaturas
        var thumbsWrap = document.getElementById('tg-thumbs-' + slug);
        if (!thumbsWrap) return;
        imgs.forEach(function(src, i) {
          var div = document.createElement('div');
          div.className = 'tg-thumb' + (i === 0 ? ' active' : '');
          var img = document.createElement('img');
          img.src = src; img.alt = slug + ' foto ' + (i+1); img.loading = 'lazy';
          div.appendChild(img);
          div.addEventListener('click', function() {
            if (mainImg) mainImg.src = src;
            thumbsWrap.querySelectorAll('.tg-thumb').forEach(function(t){ t.classList.remove('active'); });
            div.classList.add('active');
          });
          if (i < 4) thumbsWrap.appendChild(div);
        });
        if (imgs.length > 4) {
          var count = document.createElement('div');
          count.className = 'tg-count';
          count.textContent = '+' + (imgs.length - 4);
          thumbsWrap.lastChild.appendChild(count);
        }
      }

      for (var i = 1; i <= MAX; i++) {
        (function(num) {
          var src = '/assets/img/tours/' + slug + '-' + num + '.jpg';
          var img = new Image();
          img.onload = function() { imgs.push(src); checkDone(); };
          img.onerror = function() { checkDone(); };
          img.src = src;
        })(i);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGalleries);
  else initGalleries();
})();
