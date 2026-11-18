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
  function enhance(svg) {
    if (svg.__fx) return;
    var p = svg.querySelector("path");
    if (!p) return;
    var d = p.getAttribute("d") || "";
    if (d.indexOf("M11.562 3.266") === 0) {
      svg.__fx = 1;
      svg.classList.add("ic-crown");
    } else if (d.indexOf("M7 11V7a5 5 0 0 1 10 0v4") === 0) {
      svg.__fx = 1;
      svg.classList.add("ic-lock");
      var parts = d.split(" M");
      var shackle = mk("path", { class: "ic-shackle", d: parts[0] });
      var body = mk("path", { d: "M" + parts[1] });
      svg.setAttribute("overflow", "visible");
      svg.replaceChild(body, p);
      svg.insertBefore(shackle, body);
      svg.style.setProperty("--ic-delay", (Math.random() * 3).toFixed(2) + "s");
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
