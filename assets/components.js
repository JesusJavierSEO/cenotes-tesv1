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
     CONFIGURACIÓN — edita solo esta sección
  ───────────────────────────────────────────────────────── */
  const CONFIG = {
    whatsapp: "5219999999999", // ← Reemplaza con tu número real (con código de país, sin +)
    siteName: "Cenotes Homún",

    // Detecta si la página es dark (hero) o light (páginas internas)
    // Las páginas en este array usan nav oscuro sobre hero
    darkNavPages: ["index.html", "en.html", ""],

    // Menú en español — agrega / quita / reordena aquí
    navES: [
      { label: "Inicio",       href: "index.html" },
      { label: "Guía",         href: "guia-cenotes-homun.html" },
      { label: "FAQ",          href: "faq.html" },
      { label: "Cómo llegar",  href: "como-llegar.html" },
    ],
    navCtaES: { label: "Ver Paquetes", href: "index.html#paquetes" },

    // Menú en inglés — agrega / quita / reordena aquí
    navEN: [
      { label: "Home",         href: "en.html" },
      { label: "Guide",        href: "cenotes-guide-homun.html" },
      { label: "FAQ",          href: "faq.html" },
      { label: "Getting there",href: "como-llegar.html" },
    ],
    navCtaEN: { label: "See Packages", href: "en.html#packages" },

    // Footer — columna de paquetes ES
    footerPackagesES: [
      { label: "Tour Explorador",  href: "index.html#paquetes" },
      { label: "Tour Aventurero",  href: "index.html#paquetes" },
      { label: "Tour Premium",     href: "index.html#paquetes" },
      { label: "Grupos y familias",href: "index.html#paquetes" },
    ],
    // Footer — columna de info ES
    footerInfoES: [
      { label: "Los cenotes",  href: "index.html#cenotes" },
      { label: "Guía de viaje",href: "guia-cenotes-homun.html" },
      { label: "Cómo llegar",  href: "como-llegar.html" },
      { label: "FAQ",          href: "faq.html" },
    ],
    // Footer — columna de info EN
    footerPackagesEN: [
      { label: "Explorer Tour",    href: "en.html#packages" },
      { label: "Adventurer Tour",  href: "en.html#packages" },
      { label: "Premium Tour",     href: "en.html#packages" },
      { label: "Groups & Families",href: "en.html#packages" },
    ],
    footerInfoEN: [
      { label: "The cenotes",  href: "en.html#cenotes" },
      { label: "Travel guide", href: "cenotes-guide-homun.html" },
      { label: "Getting there",href: "como-llegar.html" },
      { label: "FAQ",          href: "faq.html" },
    ],
  };

  /* ─────────────────────────────────────────────────────────
     UTILIDADES
  ───────────────────────────────────────────────────────── */
  // Detecta idioma de la página actual
  function getLang() {
    return document.documentElement.lang === "en" ? "en" : "es";
  }

  // Detecta si el nav debe ser dark u oscuro
  function isDarkNav() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return CONFIG.darkNavPages.includes(page);
  }

  // Detecta página activa para resaltar en el menú
  function isActive(href) {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === href || (href === "index.html" && page === "");
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
    const homeES = "index.html";
    const homeEN = "en.html";

    const linksHTML = links.map(l => {
      const active = isActive(l.href) ? " active" : "";
      return `<a href="${l.href}" class="nav-link${active}">${l.label}</a>`;
    }).join("\n");

    const langSwitch = `
      <div class="nav-lang">
        <a href="${homeES}" class="lang-btn${lang === "es" ? " active" : ""}">ES</a>
        <a href="${homeEN}" class="lang-btn${lang === "en" ? " active" : ""}">EN</a>
      </div>`;

    // Mobile menu links
    const mobileLinksHTML = links.map(l =>
      `<a href="${l.href}" class="nav-mobile-link">${l.label}</a>`
    ).join("\n");

    const navHTML = `
<nav id="site-nav" class="${navClass}" role="navigation" aria-label="Menú principal">
  <a href="${lang === "en" ? homeEN : homeES}" class="nav-logo">
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
    <a href="${homeES}" class="${lang === "es" ? "active" : ""}">ES</a>
    <a href="${homeEN}" class="${lang === "en" ? "active" : ""}">EN</a>
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
      <a href="index.html">Español</a> ·
      <a href="en.html">English</a> ·
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
