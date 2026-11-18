/* Ícones com vida: coroa brilha, cadeado abre, chama tremula.
   Atua sobre os SVGs que já existem (e os criados depois pelo app). */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function mk(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uid = 0;
  function enhance(svg) {
    if (svg.__fx) return;
    var p = svg.querySelector("path");
    if (!p) return;
    var d = p.getAttribute("d") || "";
    if (d.indexOf("M11.562 3.266") === 0) {
      svg.__fx = 1;
      if (REDUCED) return;
      /* coroa: um brilho claro atravessa o contorno */
      var id = "icm" + ++uid, crown = d.split(" M")[0];
      svg.setAttribute("overflow", "visible");
      var defs = mk("defs", {});
      var mask = mk("mask", { id: id, maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "24", height: "24" });
      mask.appendChild(mk("path", { d: crown, fill: "none", stroke: "#fff", "stroke-width": "2.1", "stroke-linejoin": "round" }));
      var gr = mk("linearGradient", { id: id + "g", x1: "0", y1: "0", x2: "1", y2: "0" });
      [["0", "#fff", "0"], ["0.5", "#fff", "0.9"], ["1", "#fff", "0"]].forEach(function (s) { gr.appendChild(mk("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] })); });
      defs.appendChild(gr);
      defs.appendChild(mask);
      var g = mk("g", { mask: "url(#" + id + ")" });
      var band = mk("rect", { x: "-10", y: "-2", width: "9", height: "30", fill: "url(#" + id + "g)", transform: "rotate(25 12 12)" });
      var anim = mk("animateTransform", { attributeName: "transform", type: "translate", values: "-6 0;-6 0;34 0", keyTimes: "0;.45;1", dur: "4.5s", repeatCount: "indefinite", additive: "sum", calcMode: "spline", keySplines: "0 0 1 1;.4 0 .6 1" });
      band.appendChild(anim);
      g.appendChild(band);
      svg.appendChild(defs);
      svg.appendChild(g);
    } else if (d.indexOf("M7 11V7a5 5 0 0 1 10 0v4") === 0) {
      svg.__fx = 1;
      svg.classList.add("ic-lock");
      var parts = d.split(" M");
      var shackle = mk("path", { class: "ic-shackle", d: parts[0] });
      var body = mk("path", { d: "M" + parts[1] });
      svg.replaceChild(body, p);
      svg.insertBefore(shackle, body);
      if (REDUCED) return;
      /* cadeado: a haste se solta de um lado e depois volta a fechar */
      var closed = "M7 11V7a5 5 0 0 1 10 0v4", open = "M7 11V7a5 5 0 0 1 9.9-1";
      var an = mk("animate", { attributeName: "d", dur: "6s", repeatCount: "indefinite", calcMode: "spline",
        values: [closed, closed, open, open, closed, closed].join(";"),
        keyTimes: "0;.5;.6;.8;.9;1",
        keySplines: "0 0 1 1;.3 0 .2 1;0 0 1 1;.3 0 .2 1;0 0 1 1",
        begin: (Math.random() * 2.5).toFixed(2) + "s" });
      shackle.appendChild(an);
    } else if (d.indexOf("M12 3q1 4 4 6.5") === 0 && d.indexOf("M4 4l16 16") < 0) {
      svg.__fx = 1;
      svg.classList.add("ic-flame");
      svg.style.setProperty("--ic-delay", (Math.random() * 1.2).toFixed(2) + "s");
    }
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName && root.tagName.toLowerCase() === "svg") enhance(root);
    var l = root.querySelectorAll("svg");
    for (var i = 0; i < l.length; i++) enhance(l[i]);
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++)
        for (var j = 0; j < ms[i].addedNodes.length; j++) scan(ms[i].addedNodes[j]);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
