/*
 * interactions.js - Pooja Kurade Portfolio
 * Minimal JS for interactions CSS can't do alone:
 *   - Toggle a "scrolled" state on the sticky nav (via IntersectionObserver, no scroll listener)
 *   - Inject an accessible back-to-top button that appears once you scroll down
 * No dependencies. Safe to load on every page. Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    // ---- Back-to-top button ----
    var btt = document.createElement('button');
    btt.className = 'back-to-top';
    btt.type = 'button';
    btt.setAttribute('aria-label', 'Back to top');
    btt.setAttribute('data-tooltip', 'Back to top');
    btt.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="12" y1="19" x2="12" y2="6"></line><polyline points="6 12 12 6 18 12"></polyline></svg>';
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    // Let the site's custom cursor grow over it, if that cursor exists.
    var cur = document.getElementById('cur');
    if (cur) {
      btt.addEventListener('mouseenter', function () { cur.classList.add('big'); });
      btt.addEventListener('mouseleave', function () { cur.classList.remove('big'); });
    }
    document.body.appendChild(btt);

    // ---- Scroll state via IntersectionObserver on a top sentinel ----
    var navs = document.querySelectorAll('nav, #nav');

    if (!('IntersectionObserver' in window)) {
      // Very old browsers: just keep everything visible/usable.
      btt.classList.add('show');
      return;
    }

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:90px;pointer-events:none;opacity:0;';
    document.body.prepend(sentinel);

    var io = new IntersectionObserver(function (entries) {
      var scrolled = !entries[0].isIntersecting;
      for (var i = 0; i < navs.length; i++) navs[i].classList.toggle('scrolled', scrolled);
      btt.classList.toggle('show', scrolled);
    }, { threshold: 0 });

    io.observe(sentinel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
