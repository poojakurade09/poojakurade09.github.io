/*
 * scroll.js - shared scroll behaviour for the homepage and case study pages.
 *
 * Built to stay smooth on every device:
 *  - Scroll spy and progress bar run once per animation frame, read layout
 *    only when the page size changes, and write styles only when something
 *    actually changed (no layout thrashing while scrolling).
 *  - The progress bar moves with transform, not width.
 *  - Looping banner animations pause while they are off screen.
 *  - Notched mouse wheels (typical on Windows) get eased scrolling.
 *    Trackpads, Magic Mouse, touch screens and keyboards keep native scrolling.
 */
(function () {
  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchOnly = window.matchMedia('(hover: none)').matches;

  /* ── 1. Scroll spy + progress bar ─────────────────────────────── */
  var links = [].slice.call(document.querySelectorAll('[data-spy]'));
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute('data-spy')); });
  var bar = document.querySelector('[data-progress]');
  var tops = [];
  var maxScroll = 0;
  var active = -2;
  var ticking = false;

  function measure() {
    var y = window.scrollY;
    tops = sections.map(function (s) { return s ? s.getBoundingClientRect().top + y : Infinity; });
    maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
  }

  function update() {
    ticking = false;
    var y = window.scrollY;
    if (bar) {
      var p = maxScroll > 0 ? Math.min(1, y / maxScroll) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    var mid = y + window.innerHeight * 0.36;
    var next = -1;
    for (var i = 0; i < tops.length; i++) { if (tops[i] <= mid) next = i; }
    if (next !== active) {
      active = next;
      links.forEach(function (a, i) {
        var on = i === active;
        a.style.color = on ? '#0F6E56' : 'rgba(18,36,28,.55)';
        a.style.fontWeight = on ? '600' : '400';
      });
    }
  }

  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  var measureQueued = false;
  function requestMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(function () { measureQueued = false; measure(); update(); });
  }

  measure();
  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestMeasure, { passive: true });
  window.addEventListener('load', requestMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(requestMeasure).observe(document.body);

  /* ── 2. Pause looping animations while off screen ─────────────── */
  if ('IntersectionObserver' in window) {
    var pauseStyle = document.createElement('style');
    pauseStyle.textContent = '.cs-offscreen,.cs-offscreen *{animation-play-state:paused!important}';
    document.head.appendChild(pauseStyle);

    var hosts = [];
    document.querySelectorAll('[style*="animation:"]').forEach(function (el) {
      if (/animation:\s*none/.test(el.getAttribute('style'))) return;
      var host = el.closest('section') || el.parentElement;
      if (host && hosts.indexOf(host) === -1) hosts.push(host);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('cs-offscreen', !e.isIntersecting); });
    }, { rootMargin: '150px 0px' });
    hosts.forEach(function (h) { io.observe(h); });
  }

  /* ── 3. Eased scrolling engine (wheel + in-page links) ────────── */
  var target = window.scrollY;
  var current = target;
  var animating = false;
  var lastTime = 0;

  function clamp(y) { return Math.max(0, Math.min(doc.scrollHeight - window.innerHeight, y)); }

  function step(now) {
    if (!animating) return;
    var dt = lastTime ? Math.min(50, now - lastTime) : 16.67;
    lastTime = now;
    var ease = 1 - Math.pow(1 - 0.16, dt / 16.67); // same feel at 60Hz, 120Hz or 144Hz
    current += (target - current) * ease;
    if (Math.abs(target - current) < 0.5) { current = target; animating = false; lastTime = 0; }
    // 'instant' so a CSS scroll-behavior: smooth on the page cannot fight each frame
    window.scrollTo({ top: current, behavior: 'instant' });
    if (animating) requestAnimationFrame(step);
  }

  function animateTo(y) {
    if (!animating) { current = window.scrollY; lastTime = 0; }
    target = clamp(y);
    if (!animating) { animating = true; requestAnimationFrame(step); }
  }

  function stop() { animating = false; lastTime = 0; target = current = window.scrollY; }

  // Any direct user input cancels an in-progress glide immediately.
  ['keydown', 'mousedown', 'touchstart'].forEach(function (t) {
    window.addEventListener(t, stop, { passive: true });
  });

  // Notched wheels report wheelDelta in multiples of 120. macOS reports
  // wheelDelta as exactly 3 × deltaY for trackpads and mice, which already
  // scroll smoothly, so those are left alone. Firefox reports wheels in lines.
  function isNotchedWheel(e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.deltaX !== 0 || e.deltaY === 0) return false;
    if (e.deltaMode === 1) return true;
    var w = e.wheelDeltaY;
    if (!w || w % 120 !== 0) return false;
    return Math.abs(w / e.deltaY) !== 3;
  }

  function insideScrollable(el, dy) {
    while (el && el !== document.body && el !== doc) {
      if (el.nodeType === 1) {
        var oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
          if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight : el.scrollTop > 0) return true;
        }
      }
      el = el.parentNode;
    }
    return false;
  }

  if (!reduceMotion && !touchOnly) {
    window.addEventListener('wheel', function (e) {
      if (!isNotchedWheel(e) || insideScrollable(e.target, e.deltaY)) {
        if (animating) stop();
        return;
      }
      e.preventDefault();
      var px = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      var from = animating ? target : window.scrollY;
      animateTo(from + px);
    }, { passive: false });
  }

  // In-page section links glide to the section, clearing the sticky bar.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash.length < 2) return;
    var el = document.getElementById(hash.slice(1));
    if (!el) return;
    e.preventDefault();
    // case study pages have a sticky bar to clear; the homepage nav floats
    var y = el.getBoundingClientRect().top + window.scrollY - (bar ? 78 : 0);
    if (reduceMotion) { window.scrollTo({ top: y, behavior: 'instant' }); return; }
    if (touchOnly) { window.scrollTo({ top: y, behavior: 'smooth' }); return; }
    animateTo(y);
  });
})();
