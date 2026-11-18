/* Safari/iPhone não roda animações CSS dentro de <use>. Para os ícones animados,
   copiamos o desenho do <symbol> para dentro do próprio <svg>, onde a animação funciona. */
(function () {
  "use strict";
  function inline(u) {
    if (u.closest("symbol")) return;
    var href = u.getAttribute("href") || u.getAttribute("xlink:href") || "";
    if (href.charAt(0) !== "#") return;
    var sym = document.getElementById(href.slice(1));
    if (!sym || sym.tagName.toLowerCase() !== "symbol" || sym.innerHTML.indexOf('class="') < 0) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < sym.childNodes.length; i++) frag.appendChild(sym.childNodes[i].cloneNode(true));
    u.replaceWith(frag);
  }
  function run(root) {
    var list = root.querySelectorAll ? root.querySelectorAll("svg use") : [];
    for (var i = 0; i < list.length; i++) inline(list[i]);
  }
  function start() {
    run(document);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName.toLowerCase() === "use") inline(n); else run(n);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
