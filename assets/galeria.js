/* ═══════════════════════════════════════════════════════════
   Cenotes Homún — galeria.js
   Sistema de galería con lightbox para todas las páginas
   Uso: <div class="ch-gallery" data-imgs="img1.jpg,img2.jpg,...">
═══════════════════════════════════════════════════════════ */

(function() {
  var MODAL_ID = 'ch-lightbox';
  var currentIdx = 0;
  var currentImgs = [];

  // ── CONSTRUIR LIGHTBOX ─────────────────────────────────────
  function buildLightbox() {
    if (document.getElementById(MODAL_ID)) return;
    var el = document.createElement('div');
    el.id = MODAL_ID;
    el.innerHTML = `
      <div class="ch-lb-overlay" onclick="CHGaleria.close()"></div>
      <div class="ch-lb-content">
        <button class="ch-lb-close" onclick="CHGaleria.close()">✕</button>
        <button class="ch-lb-prev" onclick="CHGaleria.prev()">‹</button>
        <button class="ch-lb-next" onclick="CHGaleria.next()">›</button>
        <div class="ch-lb-img-wrap">
          <img class="ch-lb-img" id="ch-lb-img" src="" alt="">
          <div class="ch-lb-loading">⏳</div>
        </div>
        <div class="ch-lb-counter" id="ch-lb-counter"></div>
        <div class="ch-lb-thumbs" id="ch-lb-thumbs"></div>
      </div>`;
    document.body.appendChild(el);

    // Teclado
    document.addEventListener('keydown', function(e) {
      if (!document.getElementById(MODAL_ID).classList.contains('open')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') CHGaleria.next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   CHGaleria.prev();
      if (e.key === 'Escape') CHGaleria.close();
    });
  }

  // ── API PÚBLICA ────────────────────────────────────────────
  window.CHGaleria = {
    open: function(imgs, idx) {
      buildLightbox();
      currentImgs = typeof imgs === 'string' ? imgs.split(',') : imgs;
      currentIdx  = idx || 0;
      document.getElementById(MODAL_ID).classList.add('open');
      document.body.style.overflow = 'hidden';
      this._show();
      this._buildThumbs();
    },
    close: function() {
      var lb = document.getElementById(MODAL_ID);
      if (lb) lb.classList.remove('open');
      document.body.style.overflow = '';
    },
    next: function() {
      currentIdx = (currentIdx + 1) % currentImgs.length;
      this._show();
    },
    prev: function() {
      currentIdx = (currentIdx - 1 + currentImgs.length) % currentImgs.length;
      this._show();
    },
    _show: function() {
      var img     = document.getElementById('ch-lb-img');
      var counter = document.getElementById('ch-lb-counter');
      var loading = document.querySelector('.ch-lb-loading');
      if (!img) return;

      loading.style.display = 'flex';
      img.style.opacity = '0';

      var src = currentImgs[currentIdx].trim();
      var tmp = new Image();
      tmp.onload = function() {
        img.src = src;
        img.style.opacity = '1';
        loading.style.display = 'none';
      };
      tmp.onerror = function() { loading.style.display = 'none'; };
      tmp.src = src;

      counter.textContent = (currentIdx + 1) + ' / ' + currentImgs.length;

      // Actualizar thumb activo
      document.querySelectorAll('.ch-lb-thumb').forEach(function(t, i) {
        t.classList.toggle('active', i === currentIdx);
      });
    },
    _buildThumbs: function() {
      var wrap = document.getElementById('ch-lb-thumbs');
      if (!wrap) return;
      wrap.innerHTML = '';
      var self = this;
      currentImgs.forEach(function(src, i) {
        var d = document.createElement('div');
        d.className = 'ch-lb-thumb' + (i === currentIdx ? ' active' : '');
        d.style.cssText = 'width:60px;height:45px;flex-shrink:0;border-radius:6px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.2s';
        d.onclick = function() { currentIdx = i; self._show(); };
        var img = document.createElement('img');
        img.src = src.trim();
        img.style.cssText = 'width:100%;height:100%;object-fit:cover';
        d.appendChild(img);
        wrap.appendChild(d);
      });
    }
  };

  // ── INICIALIZAR GALERÍAS EN LA PÁGINA ─────────────────────
  function initGalleries() {

    // 1. Galerías tipo .ch-gallery (nueva forma declarativa)
    document.querySelectorAll('.ch-gallery').forEach(function(wrap) {
      var imgs = (wrap.dataset.imgs || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      if (!imgs.length) return;

      var hero  = imgs[0];
      var resto = imgs.slice(1);

      wrap.innerHTML = '';
      wrap.style.cssText = 'border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.2);cursor:pointer';

      // Grid principal
      var grid = document.createElement('div');
      grid.className = 'ch-gallery-grid';

      // Imagen principal grande
      var mainDiv = document.createElement('div');
      mainDiv.className = 'ch-gallery-main';
      var mainImg = document.createElement('img');
      mainImg.src = hero; mainImg.alt = ''; mainImg.loading = 'eager';
      mainImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      mainDiv.appendChild(mainImg);
      mainDiv.onclick = function() { CHGaleria.open(imgs, 0); };
      grid.appendChild(mainDiv);

      // Columna de miniaturas
      var col = document.createElement('div');
      col.className = 'ch-gallery-col';

      var show = resto.slice(0, 3);
      show.forEach(function(src, i) {
        var cell = document.createElement('div');
        cell.className = 'ch-gallery-cell';
        var img = document.createElement('img');
        img.src = src; img.alt = ''; img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
        cell.appendChild(img);

        // Último thumb: badge con total restante
        if (i === show.length - 1 && imgs.length > 4) {
          var badge = document.createElement('div');
          badge.className = 'ch-gallery-badge';
          badge.textContent = '+' + (imgs.length - 4) + ' fotos';
          cell.appendChild(badge);
        }
        cell.onclick = (function(idx){ return function(){ CHGaleria.open(imgs, idx + 1); }; })(i);
        col.appendChild(cell);
      });

      grid.appendChild(col);
      wrap.appendChild(grid);
    });

    
    // 2. Galerías .tour-gallery-wrap con data-imgs
    document.querySelectorAll('.tour-gallery-wrap[data-imgs]').forEach(function(wrap) {
      var imgs = (wrap.getAttribute('data-imgs') || '').split(',')
        .map(function(s){ return s.trim(); }).filter(Boolean);
      if (!imgs.length) return;

      // Mostrar el grid real y ocultar el fallback SVG
      var grid     = wrap.querySelector('.tour-gallery-grid');
      var fallback = wrap.querySelector('.tour-gallery');
      if (grid)    grid.style.display = '';
      if (fallback) fallback.style.display = 'none';

      // Poner la primera imagen en el main
      var mainImg = wrap.querySelector('[id^="tg-main-img"]');
      if (mainImg) mainImg.src = imgs[0];

      // Construir thumbnails
      var thumbsEl = wrap.querySelector('[id^="tg-thumbs"]');
      if (thumbsEl && thumbsEl.children.length === 0) {
        imgs.forEach(function(src, i) {
          var div = document.createElement('div');
          div.className = 'tg-thumb' + (i === 0 ? ' tg-thumb-active' : '');
          div.setAttribute('data-src', src);
          var img = document.createElement('img');
          img.src = src; img.alt = ''; img.loading = 'lazy';
          div.appendChild(img);
          thumbsEl.appendChild(div);

          div.addEventListener('click', function() {
            if (mainImg) mainImg.src = src;
            wrap.querySelectorAll('.tg-thumb').forEach(function(t) {
              t.classList.remove('tg-thumb-active');
            });
            div.classList.add('tg-thumb-active');
          });
        });
      }

      // Click en imagen principal → lightbox
      if (mainImg) {
        mainImg.style.cursor = 'pointer';
        mainImg.addEventListener('click', function() {
          var cur = mainImg.src.split('/').pop();
          var idx = imgs.findIndex(function(s) { return s.includes(cur); });
          CHGaleria.open(imgs, Math.max(0, idx));
        });
      }
    });

    // 3. Galerías antiguas con tgSwap (compatibilidad hacia atrás)
    window.tgSwap = function(thumb, src) {
      var main = document.getElementById('tg-main-img');
      if (!main) return;
      // En lugar de solo cambiar la imagen, abrir el lightbox
      var wrap = thumb.closest('.tour-gallery-wrap') || thumb.closest('[data-tour]');
      if (wrap) {
        var imgs = [];
        var mainSrc = main.src;
        if (mainSrc) imgs.push(mainSrc);
        wrap.querySelectorAll('.tg-thumb img').forEach(function(img) {
          if (img.src && img.src !== mainSrc) imgs.push(img.src);
        });
        var clickedSrc = src || thumb.querySelector('img').src;
        var idx = imgs.indexOf(clickedSrc);
        CHGaleria.open(imgs.length > 0 ? imgs : [clickedSrc], Math.max(0, idx));
      } else {
        CHGaleria.open([src], 0);
      }
    };

    // 2. Galerías tour-gallery-wrap con data-imgs — construye thumbs y muestra galería
    document.querySelectorAll('.tour-gallery-wrap[data-imgs]').forEach(function(wrap) {
      var imgsRaw = (wrap.dataset.imgs || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      if (!imgsRaw.length) return;

      var slug = wrap.dataset.tour || '';

      // Mostrar el grid y ocultar el fallback
      var grid = wrap.querySelector('.tour-gallery-grid');
      var fallback = wrap.querySelector('[id^="gallery-fallback"]');
      if (grid)    { grid.style.display = ''; }
      if (fallback){ fallback.style.display = 'none'; }

      // Poner la primera imagen en el main
      var mainImg = wrap.querySelector('[id^="tg-main-img"]');
      if (mainImg && !mainImg.src.includes('/tours/')) {
        mainImg.src = imgsRaw[0];
      }

      // Construir thumbnails si el contenedor está vacío
      var thumbsEl = wrap.querySelector('[id^="tg-thumbs"]');
      if (thumbsEl && thumbsEl.children.length === 0) {
        imgsRaw.forEach(function(src, i) {
          var div = document.createElement('div');
          div.className = 'tg-thumb' + (i === 0 ? ' tg-thumb-active' : '');
          div.dataset.src = src;
          var img = document.createElement('img');
          img.src = src;
          img.alt = '';
          img.loading = 'lazy';
          div.appendChild(img);
          thumbsEl.appendChild(div);
        });
      }

      // Click en thumbnail → cambiar imagen principal + abrir lightbox
      wrap.querySelectorAll('.tg-thumb').forEach(function(thumb) {
        thumb.onclick = function() {
          var src = thumb.dataset.src || (thumb.querySelector('img') && thumb.querySelector('img').src);
          if (!src) return;
          if (mainImg) { mainImg.src = src; }
          wrap.querySelectorAll('.tg-thumb').forEach(function(t){ t.classList.remove('tg-thumb-active'); });
          thumb.classList.add('tg-thumb-active');
        };
      });

      // Click en imagen principal → abrir lightbox
      if (mainImg) {
        mainImg.style.cursor = 'pointer';
        mainImg.onclick = function() {
          var idx = imgsRaw.indexOf(mainImg.src.replace(location.origin, ''));
          CHGaleria.open(imgsRaw, Math.max(0, idx));
        };
      }
    });

        // 3. Hacer clickeable la imagen principal de las galerías antiguas
    document.querySelectorAll('#tg-main-img').forEach(function(img) {
      img.style.cursor = 'pointer';
      img.onclick = function() {
        var wrap = img.closest('.tour-gallery-wrap') || img.closest('[data-tour]');
        var imgs = [img.src];
        if (wrap) {
          wrap.querySelectorAll('.tg-thumb img').forEach(function(t) {
            if (t.src && !imgs.includes(t.src)) imgs.push(t.src);
          });
        }
        CHGaleria.open(imgs, 0);
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalleries);
  } else {
    initGalleries();
  }
})();
