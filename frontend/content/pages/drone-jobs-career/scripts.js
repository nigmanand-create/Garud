(function runWhenReady() {
  function init() {
document.addEventListener('DOMContentLoaded', function () {

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

  /* ===== TILT + GLOW ON CARDS ===== */
  if(window.matchMedia && window.matchMedia('(hover:hover)').matches){
    document.querySelectorAll('.role-card').forEach(function(el){
      el.classList.add('tilt-glow');
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x+'px');
        el.style.setProperty('--my', y+'px');
        var rx = ((y/r.height)-0.5) * -6;
        var ry = ((x/r.width)-0.5) * 6;
        el.style.transform = 'perspective(900px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) translateY(-6px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });
  }

  /* ===== PARALLAX HERO MEDIA ===== */
  if(!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
    var pxEls = document.querySelectorAll('.pg-hero-img');
    if(pxEls.length){
      var pxTicking = false;
      function updateParallax(){
        pxEls.forEach(function(el){
          var rect = el.getBoundingClientRect();
          var wh = window.innerHeight;
          if(rect.bottom < 0 || rect.top > wh) return;
          var progress = (wh - rect.top) / (wh + rect.height);
          var ty = (progress - 0.5) * 50;
          el.style.transform = 'scale(1.14) translateY(' + ty.toFixed(1) + 'px)';
        });
        pxTicking = false;
      }
      window.addEventListener('scroll', function(){
        if(!pxTicking){ requestAnimationFrame(updateParallax); pxTicking = true; }
      }, {passive:true});
      window.addEventListener('resize', updateParallax);
      updateParallax();
    }
  }

  if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ overwrite:'auto' });
    ScrollTrigger.config({ ignoreMobileResize:true, autoRefreshEvents:'visibilitychange,DOMContentLoaded,load' });
    gsap.ticker.lagSmoothing(500, 33);

    var EASE = 'power3.out';
    var DUR = .85;
    function clearWillChange(el){ el.style.willChange = 'auto'; }

    document.querySelectorAll('.gs-reveal').forEach(function(el){
      gsap.to(el, { opacity:1, y:0, filter:'blur(0px)', duration:DUR, ease:EASE,
        scrollTrigger:{ trigger:el, start:'top 87%', toggleActions:'play none none reverse' },
        onComplete:function(){ clearWillChange(el); } });
    });
    document.querySelectorAll('.gs-left').forEach(function(el){
      gsap.to(el, { opacity:1, x:0, filter:'blur(0px)', duration:DUR, ease:EASE,
        scrollTrigger:{ trigger:el, start:'top 87%', toggleActions:'play none none reverse' },
        onComplete:function(){ clearWillChange(el); } });
    });
    document.querySelectorAll('.gs-right').forEach(function(el){
      gsap.to(el, { opacity:1, x:0, filter:'blur(0px)', duration:DUR, ease:EASE,
        scrollTrigger:{ trigger:el, start:'top 87%', toggleActions:'play none none reverse' },
        onComplete:function(){ clearWillChange(el); } });
    });
    document.querySelectorAll('.gs-scale').forEach(function(el){
      gsap.to(el, { opacity:1, y:0, scale:1, filter:'blur(0px)', duration:DUR, ease:EASE,
        scrollTrigger:{ trigger:el, start:'top 87%', toggleActions:'play none none reverse' },
        onComplete:function(){ clearWillChange(el); } });
    });
    document.querySelectorAll('.gs-stagger').forEach(function(wrap){
      var items = wrap.children;
      if (!items.length) return;
      gsap.to(items, { opacity:1, y:0, filter:'blur(0px)', duration:.75, stagger:.08, ease:EASE,
        scrollTrigger:{ trigger:wrap, start:'top 87%', toggleActions:'play none none reverse' },
        onComplete:function(){ gsap.utils.toArray(items).forEach(clearWillChange); } });
    });

    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function(){ ScrollTrigger.refresh(); }); }
    window.addEventListener('load', function(){ ScrollTrigger.refresh(); });
  } else {
    document.querySelectorAll('.gs-reveal,.gs-left,.gs-right,.gs-scale').forEach(function(el){ el.style.opacity = 1; el.style.transform = 'none'; el.style.filter = 'none'; });
    document.querySelectorAll('.gs-stagger').forEach(function(wrap){
      Array.prototype.forEach.call(wrap.children, function(c){ c.style.opacity = 1; c.style.transform = 'none'; c.style.filter = 'none'; });
    });
  }
});

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
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();