(function runWhenReady() {
  function init() {

  function wireVideo(id, immediate){
    var v = document.getElementById(id);
    if(!v) return;
    var show = function(){ v.classList.add('loaded'); };
    v.addEventListener('loadeddata', show);
    v.addEventListener('canplaythrough', show);
    v.addEventListener('playing', show);

    function tryPlay(){
      var p = v.play();
      if (p !== undefined) {
        p.then(show).catch(function(){
          var retry = function(){ v.play().then(show); document.removeEventListener('click', retry); document.removeEventListener('touchstart', retry); };
          document.addEventListener('click', retry, { once:true });
          document.addEventListener('touchstart', retry, { once:true });
        });
      }
    }

    if (immediate) {
      /* above-the-fold video: play right away, no need to wait on an observer tick */
      if (v.preload !== 'auto') v.preload = 'auto';
      tryPlay();
      return;
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            if (v.preload !== 'auto') v.preload = 'auto';
            if (!v.src && v.querySelector('source')) { v.load(); }
            tryPlay();
          } else {
            v.pause();
          }
        });
      }, { rootMargin: '400px 0px', threshold: 0.01 });
      io.observe(v);
    } else {
      tryPlay();
    }
  }
  wireVideo('heroVideo', true);
  wireVideo('aboutVideo');
  wireVideo('careerVideo');

  /* ===== HERO HEADING CHAR-BY-CHAR ANIMATION ===== */
  (function(){
    var lines = document.querySelectorAll('.vhero-line');
    if (!lines.length) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var initialDelay = 200, charDelay = 30;

    lines.forEach(function(line, lineIndex){
      var text = line.textContent;
      line.textContent = '';
      var globalIndex = 0;

      function mountChar(parent, ch){
        var span = document.createElement('span');
        span.className = 'vhero-char';
        span.textContent = ch;
        parent.appendChild(span);
        var idx = globalIndex++;
        if (reduced) { span.classList.add('is-in'); return; }
        var delay = initialDelay + (lineIndex * text.length * charDelay) + (idx * charDelay);
        setTimeout(function(){ span.classList.add('is-in'); }, delay);
      }

      var words = text.split(' ');
      words.forEach(function(word, wordIndex){
        var wordWrap = document.createElement('span');
        wordWrap.className = 'vhero-word';
        word.split('').forEach(function(ch){ mountChar(wordWrap, ch); });
        line.appendChild(wordWrap);
        if (wordIndex < words.length - 1) mountChar(line, ' ');
      });
    });
  })();

  /* ===== HERO FADE-INS ===== */
  (function(){
    var fadeEls = document.querySelectorAll('.vhero-fade');
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fadeEls.forEach(function(el){
      var delay = parseInt(el.getAttribute('data-delay'), 10) || 0;
      if (reduced) { el.classList.add('is-in'); return; }
      setTimeout(function(){ el.classList.add('is-in'); }, delay);
    });
  })();

  /* ===== FINANCE SLIDER (Loan / Insurance) ===== */
  (function(){
    var slides = document.querySelectorAll('.fin-slide');
    var dots = document.querySelectorAll('.fin-dot');
    var wrap = document.querySelector('.finance-slides');
    if(!slides.length || !wrap) return;
    var idx = 0;
    var timer = null;
    function advance(){
      slides[idx].classList.remove('is-active');
      if(dots[idx]) dots[idx].classList.remove('is-active');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('is-active');
      if(dots[idx]) dots[idx].classList.add('is-active');
    }
    function start(){ if(!timer) timer = setInterval(advance, 3000); }
    function stop(){ clearInterval(timer); timer = null; }
    start();
    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', start);
  })();

  /* ===== ANIMATED COUNTERS ===== */
  (function(){
    var counters = document.querySelectorAll('[data-count]');
    if(!counters.length) return;
    function run(el){
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 1400, start = null;
      function step(ts){
        if(!start) start = ts;
        var p = Math.min((ts-start)/dur, 1);
        var eased = 1 - Math.pow(1-p, 3);
        el.textContent = Math.floor(eased*target) + suffix;
        if(p < 1) requestAnimationFrame(step); else el.textContent = target + suffix;
      }
      requestAnimationFrame(step);
    }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
      }, {threshold:.4});
      counters.forEach(function(c){ io.observe(c); });
    } else {
      counters.forEach(run);
    }
  })();

  /* ===== ANIMATIONS DISABLED â€” everything shown instantly, no scroll/hover motion ===== */
  document.querySelectorAll('.gs-reveal,.gs-left,.gs-right,.gs-scale').forEach(function(el){ el.style.opacity = 1; el.style.transform = 'none'; el.style.filter = 'none'; });
  document.querySelectorAll('.gs-stagger').forEach(function(wrap){
    Array.prototype.forEach.call(wrap.children, function(c){ c.style.opacity = 1; c.style.transform = 'none'; c.style.filter = 'none'; });
  });
  var ecoFill = document.getElementById('ecoProgressFill');
  if (ecoFill) { ecoFill.style.width = '100%'; }
  var repairFill = document.getElementById('repairTrackFill');
  if (repairFill) { repairFill.style.height = '100%'; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  function killTopGap() {
    var e = document.querySelector('section,.fw');
    if (!e) return;
    while (e && e !== document.documentElement) {
      var s = window.getComputedStyle(e);
      if (parseFloat(s.paddingTop) > 0) e.style.setProperty('padding-top', '0', 'important');
      if (parseFloat(s.marginTop) > 0) e.style.setProperty('margin-top', '0', 'important');
      e = e.parentElement;
    }
    document.documentElement.style.setProperty('margin-top', '0', 'important');
    document.body.style.setProperty('padding-top', '0', 'important');
  }
  killTopGap();
  document.addEventListener('DOMContentLoaded', killTopGap);
  window.addEventListener('load', killTopGap);
  setTimeout(killTopGap, 300);
  setTimeout(killTopGap, 800);
})();