// Fügt im Panel unter .fi-sidebar-nav den Punkt "About the App" ein und zeigt beim Klick
// eine lokale Seite (about.html, beim Kompilieren eingebaut) im Inhaltsbereich an.
// Die Panel-Inhalte werden dabei nur per CSS ausgeblendet, nicht entfernt – so bleiben die
// Livewire-Komponenten intakt. Jede echte Navigation (wire:navigate) ersetzt <main> ohnehin.
(function () {
  if (location.hostname !== 'panel.plugged.host') return;

  var ABOUT_HTML = __ABOUT_HTML__;
  var ITEM_ID = 'pa-about-item';
  var OPEN_CLASS = 'pa-about-open';

  var ICON =
    '<svg class="fi-sidebar-item-icon fi-icon fi-size-lg" xmlns="http://www.w3.org/2000/svg" fill="none" ' +
    'viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 ' +
    '2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>';

  var CSS =
    'main.' + OPEN_CLASS + ' > :not(.pa-about){display:none!important}' +
    '.pa-about-grid{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))}' +
    '.pa-card{border-radius:.75rem;padding:1.5rem;display:flex;flex-direction:column;gap:1rem}' +
    '.pa-card-header{display:flex;align-items:center;gap:1rem;padding:0!important}' +
    '.pa-card-content{padding:0!important}' +
    '.pa-card-title{font-weight:600;font-size:1rem}' +
    '.pa-muted{color:var(--phv2-text-muted,#9ca3af);font-size:.875rem}' +
    '.pa-logo{width:3rem;height:3rem;flex:none}' +
    '.pa-facts{display:grid;grid-template-columns:max-content 1fr;gap:.5rem 1.5rem;font-size:.875rem}' +
    '.pa-facts dt{color:var(--phv2-text-muted,#9ca3af)}' +
    '.pa-facts code{font-family:var(--mono-font-family,"JetBrains Mono"),ui-monospace,monospace}' +
    '.pa-list{list-style:disc;padding-left:1.25rem;display:flex;flex-direction:column;gap:.5rem;font-size:.875rem}' +
    '.pa-links{display:flex;flex-wrap:wrap;gap:.75rem}' +
    '.pa-btn-gray{background:var(--phv2-raise-2,rgb(255 255 255/.1));color:var(--phv2-text,#fff)}' +
    '.pa-btn-gray:hover{background:var(--phv2-raise-3,rgb(255 255 255/.15))}';

  function injectStyle() {
    if (document.getElementById('pa-about-style')) return;
    var style = document.createElement('style');
    style.id = 'pa-about-style';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function main() {
    return document.getElementById('fi-main-content');
  }

  function isOpen() {
    var m = main();
    return !!m && m.classList.contains(OPEN_CLASS);
  }

  function setActive(active) {
    var item = document.getElementById(ITEM_ID);
    document.querySelectorAll('.fi-sidebar-nav .fi-sidebar-item').forEach(function (li) {
      var mine = li === item;
      if (active) {
        // Bisher aktiven Punkt merken, damit er beim Schließen wiederhergestellt werden kann.
        if (!mine && li.classList.contains('fi-active')) {
          li.classList.remove('fi-active');
          li.setAttribute('data-pa-was-active', '');
        }
      } else if (li.hasAttribute('data-pa-was-active')) {
        li.removeAttribute('data-pa-was-active');
        li.classList.add('fi-active');
      }
    });
    if (item) {
      item.classList.toggle('fi-active', active);
      var a = item.querySelector('a');
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }

  function open() {
    var m = main();
    if (!m) return;
    if (!m.querySelector(':scope > .pa-about')) {
      var wrap = document.createElement('div');
      wrap.className = 'pa-about';
      wrap.innerHTML = ABOUT_HTML;
      m.appendChild(wrap);
    }
    m.classList.add(OPEN_CLASS);
    setActive(true);
    document.title = 'About the App - plugged.host';
    m.scrollTop = 0;
    window.scrollTo(0, 0);
    // Auf kleinen Bildschirmen die Sidebar schließen, wie es die Panel-Links auch tun.
    try {
      if (window.matchMedia('(max-width: 1024px)').matches) window.Alpine.store('sidebar').close();
    } catch (e) {}
  }

  function close() {
    var m = main();
    if (m) {
      m.classList.remove(OPEN_CLASS);
      var about = m.querySelector(':scope > .pa-about');
      if (about) about.remove();
    }
    setActive(false);
  }

  function buildItem() {
    var li = document.createElement('li');
    li.id = ITEM_ID;
    li.className = 'fi-sidebar-item fi-sidebar-item-has-url';
    li.innerHTML =
      '<a href="#about-the-app" class="fi-sidebar-item-btn">' + ICON +
      '<span class="fi-sidebar-item-label">About the App</span></a>';
    li.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open();
    });
    return li;
  }

  // Der Punkt muss nach jedem Livewire-Update der Sidebar erneut eingesetzt werden.
  function ensureItem() {
    if (document.getElementById(ITEM_ID)) return;
    var lists = document.querySelectorAll('.fi-sidebar-nav .fi-sidebar-group-items');
    var target = lists[lists.length - 1];
    if (!target) {
      var nav = document.querySelector('.fi-sidebar-nav');
      if (!nav) return;
      target = document.createElement('ul');
      target.className = 'fi-sidebar-nav-groups';
      nav.appendChild(target);
    }
    target.appendChild(buildItem());
    if (isOpen()) setActive(true);
  }

  function start() {
    injectStyle();
    ensureItem();
    // documentElement statt body: wire:navigate ersetzt das komplette <body>-Element.
    new MutationObserver(ensureItem).observe(document.documentElement, { childList: true, subtree: true });
    // Andere Sidebar-Punkte: Panel-Navigation läuft normal, About wird geschlossen.
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('.fi-sidebar-nav a');
      if (link && !link.closest('#' + ITEM_ID) && isOpen()) close();
    }, true);
    document.addEventListener('livewire:navigated', function () {
      injectStyle();
      ensureItem();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
