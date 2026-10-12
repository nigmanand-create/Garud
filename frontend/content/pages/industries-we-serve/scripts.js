(function runWhenReady() {
  function init() {
document.addEventListener('DOMContentLoaded', function () {

  /* ===== INDUSTRY DETAILS MODAL ===== */
  (function(){
    var data = {
      construction: {
        img: 'https://i.ibb.co/WWRsCLXW/image-4.webp',
        title: 'Construction',
        desc: "Track daily site progress captured from the exact same vantage points, calculate cut/fill volumes and stockpile quantities, and give safety teams eyes on hard-to-reach areas — without shutting down work.",
        why: "Manual site walks are slow, subjective and can't be compared apples-to-apples over time. A drone survey gives you the same accurate vantage point every time, so progress, volumes and safety issues are measurable — not just described.",
        how: "A pilot flies a pre-planned grid over your site on a set schedule. Captured imagery is processed into progress photos, 3D models and volumetric calculations, then delivered as a report your project managers and stakeholders can act on.",
        points: ['Daily / weekly progress capture', 'Volumetric cut &amp; fill reports', 'Safety &amp; fall-hazard monitoring', 'Stakeholder-ready progress imagery']
      },
      heavycivil: {
        img: 'https://i.ibb.co/BVhPZDmH/image-5.webp',
        title: 'Heavy Civil',
        desc: "Long, linear infrastructure projects — roads, bridges, dams — get systematic aerial coverage that keeps stakeholders and regulators aligned on progress and compliance.",
        why: "Roads, bridges and dams span kilometres and involve multiple contractors and regulators — keeping everyone aligned on real progress is hard without a consistent, independent record.",
        how: "We fly the full project corridor at a set cadence, stitching imagery into a continuous progress map that's compared against the project timeline and shared with all stakeholders.",
        points: ['Corridor-length progress mapping', 'Compliance documentation for regulators', 'Multi-contractor progress comparisons', 'Milestone-based reporting']
      },
      owners: {
        img: 'https://i.ibb.co/9kFv8W0P/image.webp',
        title: 'Owners',
        desc: "Building and facility owners get a recurring, independent view of their assets — condition, encroachments and maintenance needs — without relying only on tenant or contractor reports.",
        why: "Owners rarely see their own assets independently — most updates come filtered through tenants, contractors or managers. A recurring aerial view gives you an unbiased, first-hand record.",
        how: "We schedule recurring flights across your properties, capturing condition, encroachments and maintenance flags, and roll it all up into a single portfolio-level dashboard.",
        points: ['Scheduled recurring inspections', 'Independent condition reporting', 'Portfolio-wide asset dashboards', 'Early flagging of maintenance issues']
      },
      datacenters: {
        img: 'https://i.ibb.co/hRy5Fp3L/image-1.webp',
        title: 'Data Centers',
        desc: "Perimeter security sweeps, rooftop and cooling infrastructure checks, and thermal imaging for critical facilities where downtime isn't an option.",
        why: "Downtime and security breaches at a data centre are extremely costly — perimeter gaps, cooling failures and unauthorised access need to be caught before they become incidents.",
        how: "Drones fly scheduled perimeter sweeps and thermal passes over cooling infrastructure, flagging anomalies for your facilities and security teams to act on immediately.",
        points: ['Perimeter &amp; security sweeps', 'Thermal inspection of cooling units', 'Site access logging &amp; reporting', 'Rapid incident-response flyovers']
      },
      renewable: {
        img: 'https://i.ibb.co/xrCg3Jq/image-2.webp',
        title: 'Renewable Energy',
        desc: "Catch cracked panels, hotspots and turbine blade faults early — before they turn into lost generation output.",
        why: "A cracked solar panel or a hairline fault in a turbine blade can quietly cost you real generation output for months before anyone notices from the ground.",
        how: "Thermal and high-resolution cameras scan panel arrays and turbine blades from the air, flagging hotspots and micro-cracks that are invisible from ground level.",
        points: ['Solar panel thermal scans', 'Wind turbine blade inspection', 'Output-loss root cause reporting', 'Scheduled seasonal re-scans']
      },
      mining: {
        img: 'https://i.ibb.co/sJJTMTNY/image-3.webp',
        title: 'Mining',
        desc: "Accurate stockpile volumetrics, pit mapping and safety compliance surveys across active mining sites.",
        why: "Manual stockpile measurement is slow and imprecise, and walking active pit faces carries real safety risk — aerial surveys solve both problems at once.",
        how: "We fly the active site on a set schedule, generating accurate volumetric stockpile data and updated site maps without putting personnel near active equipment.",
        points: ['Stockpile volumetric surveys', 'Pit &amp; site progress mapping', 'Safety compliance documentation', 'Equipment &amp; haul-road monitoring']
      },
      utilities: {
        img: 'https://i.ibb.co/twr6hKM9/image-8.webp',
        title: 'Utilities',
        desc: "Inspect transmission lines, towers and substations from the air — safer and faster than manual line-walking crews.",
        why: "Line-walking crews are slow, expensive and put people near live infrastructure — a drone covers the same corridor faster and more safely.",
        how: "Drones fly transmission corridors capturing high-resolution imagery of lines, towers and substations, flagging faults, corrosion and vegetation encroachment for your maintenance teams.",
        points: ['Transmission line inspection', 'Tower &amp; substation checks', 'Vegetation encroachment mapping', 'Fault &amp; corrosion flagging']
      },
      roofing: {
        img: 'https://i.ibb.co/BVkxs6sG/image-5.webp',
        title: 'Roofing',
        desc: "Document rooftop condition and damage in high resolution — built for insurance claims, maintenance planning and pre-purchase inspections.",
        why: "Rooftop damage is hard to assess from the ground and risky to inspect on foot — and insurers increasingly expect high-resolution documentation to support claims.",
        how: "A drone captures full rooftop coverage in high resolution, which we compile into a damage-documentation report suitable for insurance claims or maintenance planning.",
        points: ['High-resolution damage documentation', 'Insurance claim support', 'Maintenance planning reports', 'Pre-purchase inspection reports']
      },
      oilgas: {
        img: 'https://i.ibb.co/y935zFp/image-6.webp',
        title: 'Oil and Gas',
        desc: "Inspect pipelines, flare stacks and refinery infrastructure across sites that are hazardous or difficult to access on foot.",
        why: "Pipelines and refinery infrastructure often run through hazardous, remote or hard-to-access terrain where manual inspection is slow and risky.",
        how: "We fly pipeline routes and refinery zones on a scheduled basis, capturing imagery and thermal data used to flag leaks, corrosion and structural anomalies early.",
        points: ['Pipeline route inspection', 'Refinery &amp; flare stack checks', 'Leak / anomaly flagging support', 'Remote &amp; hazardous-zone coverage']
      },
      propertymgmt: {
        img: 'https://i.ibb.co/B5Rn3PYK/image-7.webp',
        title: 'Property Management',
        desc: "Routine aerial inspection across large residential and commercial portfolios, standardised so every property gets the same level of oversight.",
        why: "Managing dozens or hundreds of properties manually means inconsistent inspection quality — some properties get real attention, others get overlooked.",
        how: "We run a standardised inspection cadence across your entire portfolio, so every property — big or small — gets the same level of aerial oversight and reporting.",
        points: ['Portfolio-wide inspection cadence', 'Standardised condition reports', 'Roof, facade &amp; grounds coverage', 'Prioritised maintenance flagging']
      }
    };

    var overlay = document.getElementById('indModalOverlay');
    var imgEl = document.getElementById('indModalImg');
    var eyebrowEl = document.getElementById('indModalEyebrow');
    var titleEl = document.getElementById('indModalTitle');
    var descEl = document.getElementById('indModalDesc');
    var whyEl = document.getElementById('indModalWhy');
    var howEl = document.getElementById('indModalHow');
    var pointsEl = document.getElementById('indModalPoints');
    var closeBtn = document.getElementById('indModalClose');
    if(!overlay) return;

    function openModal(key){
      var d = data[key];
      if(!d) return;
      imgEl.src = d.img;
      imgEl.alt = d.title;
      eyebrowEl.textContent = 'Industry — ' + d.title;
      titleEl.textContent = d.title;
      descEl.textContent = d.desc;
      whyEl.textContent = d.why;
      howEl.textContent = d.how;
      pointsEl.innerHTML = d.points.map(function(p){
        return '<div class="ind-modal-point"><i class="ph ph-fill ph-check-circle"></i><span>'+p+'</span></div>';
      }).join('');
      overlay.classList.add('is-open');
      overlay.scrollTop = 0;
      document.getElementById('indModal').scrollTop = 0;
      document.body.style.overflow = 'hidden';
    }
    function closeModal(){
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-industry]').forEach(function(btn){
      btn.addEventListener('click', function(){ openModal(btn.getAttribute('data-industry')); });
    });
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });
  })();

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
      gsap.to(items, { opacity:1, y:0, filter:'blur(0px)', duration:.75, stagger:.06, ease:EASE,
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