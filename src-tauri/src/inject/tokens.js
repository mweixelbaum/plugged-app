// Sperrt auf panel.plugged.host/tokens den primären Kauf-/Einlöse-Button in der App.
// Das Panel (Filament/Livewire) navigiert ohne Seiten-Reload und rendert Buttons neu,
// daher wird bei jeder DOM-Änderung erneut geprüft.
(function () {
  if (location.hostname !== 'panel.plugged.host') return;

  var LABEL = 'Not available on App';
  var SELECTOR = '.fi-btn.fi-color-primary.w-full.justify-center';

  function onTokensPage() {
    return /^\/tokens\/?$/.test(location.pathname);
  }

  function setAttr(el, name, value) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  function lock(btn) {
    // Nur bei Abweichung setzen: jedes setAttribute löst sonst den Observer erneut aus.
    setAttr(btn, 'disabled', '');
    setAttr(btn, 'aria-disabled', 'true');
    setAttr(btn, 'tabindex', '-1');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';

    // Filament legt den Text meist in .fi-btn-label; sonst den ganzen Button-Text ersetzen.
    var label = btn.querySelector('.fi-btn-label') || btn;
    if (label.textContent.trim() !== LABEL) label.textContent = LABEL;
  }

  function apply() {
    if (!onTokensPage()) return;
    document.querySelectorAll(SELECTOR).forEach(lock);
  }

  // Klicks sicherheitshalber schon in der Capture-Phase abfangen (auch für <a>-Buttons).
  document.addEventListener('click', function (e) {
    if (onTokensPage() && e.target.closest && e.target.closest(SELECTOR)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  function start() {
    apply();
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'class']
    });
    document.addEventListener('livewire:navigated', apply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
