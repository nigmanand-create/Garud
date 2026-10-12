(function runWhenReady() {
  function init() {
document.addEventListener('DOMContentLoaded', function () {
  if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.gs-reveal').forEach(function(el){
      gsap.to(el, { opacity:1, y:0, filter:'blur(0px)', duration:.8, ease:'power3.out',
        scrollTrigger:{ trigger:el, start:'top 87%', toggleActions:'play none none reverse' } });
    });
  } else {
    document.querySelectorAll('.gs-reveal').forEach(function(el){ el.style.opacity=1; el.style.transform='none'; el.style.filter='none'; });
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
})();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();