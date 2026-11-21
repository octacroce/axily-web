/* Axily en Tienda Nube (Ipanema): interacciones de nuestras secciones (vanilla JS, sin dependencias).
   El precio sale de la ficha real del producto (data-variants de la sección nativa, que queda oculta)
   y el botón de compra usa el formulario nativo, así el carrito, el checkout y los píxeles son los de Tienda Nube. */
(function () {
  "use strict";
  window.AX_OK = true;

  var CONF = window.AX_CONFIG || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var plata = function (n) { return "$" + Math.round(n).toLocaleString("es-AR"); };

  /* ---------- datos del producto ----------
     La ficha nativa está en la página del producto y, en la portada, en la sección "producto destacado".
     Si es el producto de ejemplo del tema o no hay stock, el botón nativo viene deshabilitado. */
  var ficha = $("#single-product[data-variants]");
  var form = ficha && $("#product_form", ficha);
  var botonNativo = form && $(".js-addtocart", form);
  var nativoOk = !!(botonNativo && !botonNativo.disabled);
  var variante = null;
  if (nativoOk) {
    try {
      var variantes = JSON.parse(ficha.getAttribute("data-variants")) || [];
      variante = variantes.filter(function (v) { return v.available; })[0] || variantes[0] || null;
    } catch (e) { variante = null; }
  }
  function numero(v) { var n = typeof v === "number" ? v : parseFloat(String(v || "").replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".")); return isFinite(n) && n > 0 ? n : 0; }
  var PRECIO = CONF.precio || 24900;
  var precioFicha = variante ? numero(variante.price_number) : 0;
  // el precio real manda, salvo que venga en otra unidad (ej. centavos)
  if (precioFicha && precioFicha > PRECIO / 3 && precioFicha < PRECIO * 3) PRECIO = precioFicha;
  var TRANSF = 0.9;

  /* ---------- promociones (21/11: opción B, sin descuentos por cantidad) ----------
     n cajas = n × el precio de la ficha · -10% con transferencia (lo aplica Tienda Nube en el checkout)
     Llevando 3: envío gratis y 3 cuotas sin interés (de una caja cada una). Con 1 o 2 cajas, el envío lo paga el cliente */
  var EMPUJON = "Llevando 3: envío gratis y 3 cuotas sin interés";
  function cuotasPara(n) { return n >= 3 ? 3 : 0; }
  function textoCuotas(n, t, corto) {
    var c = cuotasPara(n);
    return c ? c + " cuotas" + (corto ? "" : " sin interés") + " de " + plata(t / c) : "";
  }
  function total(n) { return n * PRECIO; }
  // portada: la tabla de precios se arma con el mismo precio que la ficha
  $$("[data-precio-cajas]").forEach(function (el) { el.textContent = plata(total(parseInt(el.getAttribute("data-precio-cajas"), 10))); });

  /* ---------- aparecer al scrollear ---------- */
  var revelar = $$("[data-revelar]");
  if ("IntersectionObserver" in window && revelar.length) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revelar.forEach(function (el) { io.observe(el); });
  } else {
    revelar.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- galería ---------- */
  var pista = $(".ax-galeria__pista");
  if (pista) {
    var items = $$(".ax-galeria__item", pista);
    var puntos = $$(".ax-galeria__puntos span");
    var thumbs = $$(".ax-galeria__thumbs button");
    var tira = $(".ax-galeria__thumbs");
    var prev = $(".ax-galeria__flecha--prev"), next = $(".ax-galeria__flecha--next");
    var cont = $(".ax-galeria__cont");
    var actual = 0;
    var marcar = function (i) {
      actual = i;
      puntos.forEach(function (p, k) { p.classList.toggle("is-on", k === i); });
      thumbs.forEach(function (t, k) { t.setAttribute("aria-current", k === i ? "true" : "false"); });
      if (cont) cont.textContent = (i + 1) + " / " + items.length;
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === items.length - 1;
      if (tira && thumbs[i] && tira.clientWidth) {
        tira.scrollTo({ left: thumbs[i].offsetLeft - (tira.clientWidth - thumbs[i].clientWidth) / 2, behavior: "smooth" });
      }
    };
    var ir = function (k) {
      k = Math.max(0, Math.min(items.length - 1, k));
      pista.scrollTo({ left: k * pista.clientWidth, behavior: "smooth" });
      marcar(k);
    };
    if (prev) prev.addEventListener("click", function () { ir(actual - 1); });
    if (next) next.addEventListener("click", function () { ir(actual + 1); });
    var raf = null;
    pista.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var i = Math.round(pista.scrollLeft / pista.clientWidth);
        if (i !== actual) marcar(Math.max(0, Math.min(items.length - 1, i)));
      });
    }, { passive: true });
    thumbs.forEach(function (t, k) { t.addEventListener("click", function () { ir(k); }); });
    marcar(0);
  }

  /* ---------- selector de cajas ---------- */
  var ofertas = $$('.ax-oferta input[name="oferta"]');
  function cajasElegidas() {
    var sel = ofertas.filter(function (o) { return o.checked; })[0];
    return sel ? parseInt(sel.value, 10) : 1;
  }
  function textoCta(n) { return n === 1 ? "Quiero mi caja" : "Quiero mis " + n + " cajas"; }
  function pintarOferta() {
    var n = cajasElegidas(), t = total(n);
    $$(".ax-js-precio").forEach(function (el) { el.textContent = plata(t); });
    $$(".ax-js-transf").forEach(function (el) { el.textContent = plata(t * TRANSF); });
    // 21/11: con 3, las cuotas; con 1 o 2, el empujón hacia las 3
    $$(".ax-js-cuotas").forEach(function (el) { el.textContent = n >= 3 ? textoCuotas(n, t) : EMPUJON; el.closest("p").hidden = false; });
    $$(".ax-js-precio-etq").forEach(function (el) {
      el.textContent = n + (n === 1 ? " caja · " : " cajas · ") + n * 10 + " días · " + (n >= 3 ? "envío gratis" : "+ envío");
    });
    $$(".ax-js-cta-texto").forEach(function (el) { el.textContent = textoCta(n); });
    // 28/10: en la barra fija van solo las cuotas (cuántas cajas ya lo dice el botón), al lado de la franja del envío gratis.
    // 21/11: con 1 o 2 cajas, "+ envío"
    $$(".ax-js-sticky-detalle").forEach(function (el) { el.textContent = n >= 3 ? textoCuotas(n, t, true) : "+ envío"; el.hidden = !el.textContent; });
    // cada tarjeta: su precio, sus cuotas y el precio por caja (28/10).
    // 21/11, opción B: abajo del precio, "+ envío" con 1 o 2 cajas; en la de 3, "como pagar 1 caja por mes" (3 cuotas de una caja)
    ofertas.forEach(function (o) {
      var k = parseInt(o.value, 10), tk = total(k), card = o.closest(".ax-oferta");
      var p = $(".ax-js-card-precio", card), d = $(".ax-js-card-dia", card), u = $(".ax-js-card-unidad", card);
      if (p) p.textContent = plata(tk);
      if (d) { d.textContent = k >= 3 ? textoCuotas(k, tk, true) : "+ envío"; d.hidden = !d.textContent; }
      if (u) u.textContent = k === 3 ? "Como pagar 1 caja por\u00a0mes" : plata(tk / k) + " por caja";   // \u00a0: "por mes" no se corta
    });
  }
  ofertas.forEach(function (o) { o.addEventListener("change", pintarOferta); });
  if (ofertas.length) pintarOferta();
  // "Sumá la 3ra": pasa la elección a 3 cajas. El botón está dentro de la tarjeta de 2, por eso corta el clic.
  $$("[data-sumar]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var r = ofertas.filter(function (o) { return o.value === b.getAttribute("data-sumar"); })[0];
      if (!r) return;
      r.checked = true;
      pintarOferta();
      r.closest(".ax-oferta").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  /* ---------- comprar: usa el formulario nativo de Tienda Nube ---------- */
  function agregarAlCarrito(n) {
    if (!nativoOk) {
      // sin ficha que sirva acá: lleva a la página del producto
      if (CONF.urlProducto && location.pathname.indexOf("/productos/") !== 0) location.href = CONF.urlProducto + "#comprar";
      return;
    }
    var cant = $(".js-quantity-input", form);
    if (!cant) {
      cant = document.createElement("input");
      cant.type = "hidden"; cant.name = "quantity";
      form.appendChild(cant);
    }
    cant.value = String(n);
    cant.dispatchEvent(new Event("input", { bubbles: true }));
    cant.dispatchEvent(new Event("change", { bubbles: true }));
    botonNativo.click();
  }
  $$("[data-agregar]").forEach(function (b) {
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      agregarAlCarrito(ofertas.length ? cajasElegidas() : 1);
    });
  });

  /* ---------- videos cortos (28/10): mudos y en loop ----------
     El video se baja y arranca recién cuando aparece en pantalla (data-src -> src) y se pausa cuando sale.
     Con "reducir movimiento" no arranca solo: queda el póster con un botón de play. El botón también sirve para pausarlo. */
  var videos = $$("video[data-src]:not([data-sonido])");
  if (videos.length) {
    var quieto = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var marcarVideo = function (v) {
      var fig = v.closest(".ax-video"), btn = fig && $(".ax-video__btn", fig);
      if (fig) fig.classList.toggle("is-playing", !v.paused);
      if (btn) btn.setAttribute("aria-label", v.paused ? "Reproducir el video" : "Pausar el video");
    };
    var darPlay = function (v) {
      if (!v.getAttribute("src")) v.setAttribute("src", v.getAttribute("data-src"));
      v.muted = true;
      var pr = v.play();
      // si el navegador no lo deja arrancar solo (por ejemplo, con ahorro de batería), queda el botón de play
      if (pr && typeof pr.catch === "function") pr.catch(function () {
        var fig = v.closest(".ax-video");
        if (fig) fig.classList.add("ax-video--manual");
        marcarVideo(v);
      });
    };
    videos.forEach(function (v) {
      var fig = v.closest(".ax-video"), btn = fig && $(".ax-video__btn", fig);
      v.addEventListener("play", function () { marcarVideo(v); });
      v.addEventListener("pause", function () { marcarVideo(v); });
      if (fig && quieto) fig.classList.add("ax-video--manual");
      if (btn) {
        btn.hidden = false;
        btn.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (v.paused) { v.axPausado = false; darPlay(v); } else { v.axPausado = true; v.pause(); }
        });
      }
    });
    if ("IntersectionObserver" in window) {
      // 0,2: en el celu el paso 02 asoma un 23 % al lado del paso 01, y así ya se mueve
      var ioVideos = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.2) {
            if (!quieto && !v.axPausado) darPlay(v);
          } else if (!v.paused) {
            v.pause();
          }
        });
      }, { threshold: [0, 0.2] });
      videos.forEach(function (v) { ioVideos.observe(v); });
    } else {
      videos.forEach(function (v) { var fig = v.closest(".ax-video"); if (fig) fig.classList.add("ax-video--manual"); });
    }
  }

  /* ---------- video con sonido (11/11, borrador): no se baja nada hasta que tocan play ----------
     Arranca con el póster y el botón grande; al tocar se baja, suena y se puede pausar (también tocando el video).
     Si sale de la pantalla, se pausa. Los cortos mudos de arriba no lo agarran (llevan data-src sin data-sonido). */
  $$("video[data-src][data-sonido]").forEach(function (v) {
    var fig = v.closest(".ax-video"), btn = fig && $(".ax-video__btn", fig);
    var marcar = function () {
      if (fig) fig.classList.toggle("is-playing", !v.paused && !v.ended);
      if (btn) btn.setAttribute("aria-label", (v.paused || v.ended) ? "Reproducir el video con sonido" : "Pausar el video");
    };
    var alternar = function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      if (v.paused || v.ended) {
        if (!v.getAttribute("src")) v.setAttribute("src", v.getAttribute("data-src"));
        v.muted = false;
        var pr = v.play();
        if (pr && typeof pr.catch === "function") pr.catch(function () { marcar(); });
      } else {
        v.pause();
      }
    };
    v.addEventListener("play", marcar);
    v.addEventListener("pause", marcar);
    v.addEventListener("ended", marcar);
    v.addEventListener("click", alternar);
    if (btn) { btn.hidden = false; btn.addEventListener("click", alternar); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) { if (!e.isIntersecting && !v.paused) v.pause(); });
      }, { threshold: 0 }).observe(v);
    }
  });

  /* ---------- comparador antes / después ---------- */
  $$(".ax-comparador").forEach(function (c) {
    var r = $("input", c);
    var mover = function () { c.style.setProperty("--pos", r.value + "%"); };
    r.addEventListener("input", mover);
    mover();
  });

  /* ---------- barra fija de compra (celu): aparece cuando el botón principal quedó arriba ---------- */
  var sticky = $(".ax-sticky"), ctaPrincipal = $("#ax-cta-principal");
  if (sticky && ctaPrincipal) {
    var rafSticky = null;
    var chequearSticky = function () {
      rafSticky = null;
      sticky.classList.toggle("is-visible", ctaPrincipal.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener("scroll", function () { if (!rafSticky) rafSticky = requestAnimationFrame(chequearSticky); }, { passive: true });
    window.addEventListener("resize", chequearSticky);
    chequearSticky();
  }

  /* ---------- aviso de cookies del tema (7/11, Fran: que no tape la primera pantalla) ----------
     Se ve recién cuando la persona baja, y se esconde mientras el botón principal de compra está en pantalla */
  var raiz = document.documentElement, rafCookies = null;
  var chequearCookies = function () {
    rafCookies = null;
    var r = ctaPrincipal && ctaPrincipal.getBoundingClientRect();
    var tapaCompra = !!r && r.top < window.innerHeight && r.bottom > 0;
    raiz.classList.toggle("ax-cookies-espera", window.scrollY < window.innerHeight * 0.5 || tapaCompra);
  };
  window.addEventListener("scroll", function () { if (!rafCookies) rafCookies = requestAnimationFrame(chequearCookies); }, { passive: true });
  window.addEventListener("resize", chequearCookies);
  chequearCookies();
})();

/* ---------- 15/11 (usuario): cartel de la promo con reloj de 48 h (Black Friday desde el 20/11) ----------
   Lo que lleva data-liq / data-liq-si se ve mientras dura la promo y data-liq-no cuando termina (hora de Argentina);
   después la página vuelve sola a como estaba. Para mirarla antes: ?verliq=1 en la dirección.
   21/11: opción B, sin descuentos. El botón compra lo que dice la opción elegida (1, 2 o 3 cajas); con 3, Tienda Nube da
   envío gratis y 3 cuotas sin interés. Este bloque va igual en js/axily-tn.js de la tienda: se copia entero, en lugar del anterior. */
(function () {
  "use strict";
  // 17/11 (usuario): tramos de 48 h que se renuevan solos desde el lunes 16/11 00:00, sin fecha de fin.
  // Para cortar la promo: FIN_PROMO = Date.parse("AAAA-MM-DDT23:59:59-03:00").
  var INI = Date.parse("2026-11-16T00:00:00-03:00"), TRAMO = 48 * 3600 * 1000, FIN_PROMO = null;
  // 17/11 (usuario): "Ya se llevaron 39 cajas desde el lunes" = cajas pagadas desde el lunes 16/11, según Tienda Nube.
  // Es el único lugar donde está el número (pinta [data-liq-vendidas]). Con 0, la línea no se muestra.
  var VENDIDAS = 91;
  function finTramo() { var k = Math.max(1, Math.floor((Date.now() - INI) / TRAMO) + 1); return INI + k * TRAMO - 1000; }
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function diaYFecha(t) { var d = new Date(t - 3 * 3600 * 1000); return DIAS[d.getUTCDay()] + " " + d.getUTCDate() + "/" + (d.getUTCMonth() + 1); }
  function diaSiguiente(t) { var d = new Date(t + 1000 - 3 * 3600 * 1000); return DIAS[d.getUTCDay()]; }
  var forzar = /[?&]verliq=1(&|$)/.test(location.search);
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var dos = function (n) { return (n < 10 ? "0" : "") + n; };
  if (!$$("[data-liq], [data-liq-si], [data-liq-no]").length) return;
  function activa() { var a = Date.now(); return (FIN_PROMO === null || a <= FIN_PROMO) && (forzar || a >= INI); }
  function radio(v) { return $$('.ax-oferta input[name="oferta"]').filter(function (o) { return v ? o.value === v : o.checked; })[0]; }
  var estado = null;
  function precios() {
    if (!estado) return;
    // 17/11: la barra fija dice cuántas cajas lleva la opción elegida (el botón compra eso, igual que el de arriba).
    // 21/11: los precios y los textos de cada opción los pinta el selector de arriba; acá solo la barra fija
    // y el cartel rojo al lado del precio ("Te ahorrás el envío"), que va solo con las 3 cajas
    var sel = radio(), n = sel ? parseInt(sel.value, 10) || 1 : 1;
    $$(".ax-js-liq-cajas").forEach(function (el) { el.textContent = n === 1 ? "1 caja" : n + " cajas"; });
    $$(".ax-js-liq-cta").forEach(function (el) { el.textContent = n === 1 ? "Quiero mi caja" : "Quiero mis " + n; });
    $$("[data-liq-ahorro]").forEach(function (el) { el.hidden = n < 3; });
  }
  function aplicar() {
    var on = activa();
    if (on !== estado) {
      estado = on;
      document.documentElement.classList.toggle("ax-liq-on", on);
      $$("[data-liq], [data-liq-si]").forEach(function (el) { el.hidden = !on; });
      $$("[data-liq-no]").forEach(function (el) { el.hidden = on; });
      $$("[data-liq-vendidas]").forEach(function (el) {     // 17/11: las cajas vendidas, desde VENDIDAS
        el.textContent = String(VENDIDAS);
        var linea = el.closest("[data-liq-si]");
        if (linea && !(VENDIDAS > 0)) linea.hidden = true;
      });
      var sel = radio();                       // que el selector se vuelva a pintar con o sin la promo
      if (sel) sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    precios();
  }
  function reloj() {
    var fin = finTramo();
    var s = Math.floor(Math.max(0, fin - Date.now()) / 1000);
    $$("[data-liq-hasta]").forEach(function (el) { el.textContent = diaYFecha(fin); });
    $$("[data-liq-vuelve]").forEach(function (el) { el.textContent = diaSiguiente(fin); });
    var h = dos(Math.floor(s / 3600)), mi = dos(Math.floor(s / 60) % 60), se = dos(s % 60);
    $$("[data-liq-reloj]").forEach(function (el) { el.textContent = h + ":" + mi + ":" + se; });
    $$("[data-liq-h]").forEach(function (el) { el.textContent = h; });
    $$("[data-liq-m]").forEach(function (el) { el.textContent = mi; });
    $$("[data-liq-s]").forEach(function (el) { el.textContent = se; });
  }
  // 21/11: ya no hay pack de 4. Se sacó el paso que, en el clic de compra, pasaba la opción de 3 a 4 cajas:
  // el botón manda al carrito lo que dice la opción elegida (1, 2 o 3).
  document.addEventListener("change", function (e) { if (e.target && e.target.name === "oferta") setTimeout(precios, 0); });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-sumar]")) setTimeout(precios, 0); });
  aplicar();
  reloj();
  setInterval(function () { aplicar(); if (estado) reloj(); }, 1000);
})();
