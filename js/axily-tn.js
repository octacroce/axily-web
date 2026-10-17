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
  var PRECIO = CONF.precio || 31900;
  var precioFicha = variante ? numero(variante.price_number) : 0;
  // el precio real manda, salvo que venga en otra unidad (ej. centavos)
  if (precioFicha && precioFicha > PRECIO / 3 && precioFicha < PRECIO * 3) PRECIO = precioFicha;
  var TRANSF = 0.9;

  /* ---------- promociones (las mismas que están cargadas en Descuentos de Tienda Nube) ----------
     2da caja al 30% OFF · 3x2 · envío gratis desde 2 cajas · -10% con transferencia
     cuotas sin interés: 3 en cualquier compra (las 6 desde 3 cajas quedaron en pausa el 15/10) */
  function cuotasPara() { return 3; }
  function textoCuotas(n, t, corto) {
    var c = cuotasPara(n);
    return c + " cuotas" + (corto ? "" : " sin interés") + " de " + plata(t / c);
  }
  function total(n) {
    var grupos = Math.floor(n / 3), resto = n % 3;
    return grupos * 2 * PRECIO + (resto === 2 ? 1.7 * PRECIO : resto === 1 ? PRECIO : 0);
  }

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
    var n = cajasElegidas(), t = total(n), lista = n * PRECIO;
    $$(".ax-js-precio").forEach(function (el) { el.textContent = plata(t); });
    $$(".ax-js-tachado").forEach(function (el) { el.textContent = t < lista ? plata(lista) : ""; el.hidden = t >= lista; });
    $$(".ax-js-nota").forEach(function (el) { el.textContent = plata(t / (n * 10)) + " por día" + (n >= 2 ? " · envío gratis" : ""); });
    $$(".ax-js-transf").forEach(function (el) { el.textContent = plata(t * TRANSF); });
    $$(".ax-js-cuotas").forEach(function (el) { el.textContent = textoCuotas(n, t); });
    $$(".ax-js-cta-texto").forEach(function (el) { el.textContent = textoCta(n); });
    $$(".ax-js-sticky-detalle").forEach(function (el) { el.textContent = n + (n === 1 ? " caja" : " cajas") + " · " + textoCuotas(n, t, true); });
    ofertas.forEach(function (o) {
      var k = parseInt(o.value, 10), tk = total(k), card = o.closest(".ax-oferta");
      var p = $(".ax-js-card-precio", card), d = $(".ax-js-card-dia", card);
      if (p) p.textContent = plata(tk);
      if (d) d.textContent = textoCuotas(k, tk, true);
    });
  }
  ofertas.forEach(function (o) { o.addEventListener("change", pintarOferta); });
  if (ofertas.length) pintarOferta();

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
})();
