// Leitet Links, die laut EXTERNAL-Regeln (lib.rs) in den Browser gehören, an die native
// Navigation weiter. Nötig, weil das Panel (Livewire, wire:navigate) Seiten per JavaScript
// wechselt – das bekommt der native on_navigation-Filter nicht mit.
// Ein echter Seitenaufruf (location.assign) wird dagegen nativ abgefangen und im
// Standardbrowser geöffnet; die aktuelle Seite bleibt dabei stehen.
(function () {
  var RULES = __EXTERNAL_RULES__;

  function hostMatches(host, domain) {
    return host === domain || host.endsWith('.' + domain);
  }

  function pathMatches(path, prefix) {
    prefix = prefix.replace(/\/+$/, '');
    return prefix === '' || path === prefix || path.indexOf(prefix + '/') === 0;
  }

  function isExternal(href) {
    var url;
    try {
      url = new URL(href, location.href);
    } catch (e) {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    for (var i = 0; i < RULES.length; i++) {
      if (hostMatches(url.hostname, RULES[i].host) && pathMatches(url.pathname, RULES[i].path)) {
        return url.href;
      }
    }
    return null;
  }

  function openExternal(href) {
    location.assign(href); // wird nativ abgefangen → Standardbrowser
  }

  // Klicks auf Links, bevor Livewire/Alpine sie verarbeitet (Capture-Phase).
  function onClick(e) {
    if (e.defaultPrevented || (e.button !== 0 && e.button !== 1)) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = isExternal(a.getAttribute('href'));
    if (!href) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openExternal(href);
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);

  // Programmatische Livewire-Navigation (z. B. Weiterleitung nach einer Aktion).
  document.addEventListener('livewire:navigate', function (e) {
    var href = e.detail && e.detail.url && isExternal(e.detail.url.toString());
    if (!href) return;
    e.preventDefault();
    openExternal(href);
  });

  // Fallback: Falls doch per pushState auf eine externe Seite gewechselt wird,
  // den Wechsel verhindern und die Seite stattdessen im Browser öffnen.
  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    history[name] = function (state, title, url) {
      var href = url != null && isExternal(String(url));
      if (href) {
        openExternal(href);
        throw new Error('plugged-app: ' + href + ' wird im Browser geöffnet');
      }
      return original.apply(this, arguments);
    };
  });
})();
