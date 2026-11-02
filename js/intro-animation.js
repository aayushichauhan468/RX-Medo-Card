/**
 * Rx Medo Card — Premium Architectural 3D Hospital Intro & Loading Experience
 * Realistic Medical Center Architecture · Construction Animation · Interactive Entrance Travel
 * Uses local Three.js and GSAP with zero external network dependencies
 *
 * VERSION 2 CHANGES
 *  - Logo + "Rx Medo Card" heading is now big and centered at the top
 *  - Hospital sign says only "HOSPITAL" (Rx MedoCard is a card service, not a hospital)
 *  - The yellow "Click Hospital to Enter" button is replaced by an Rx MedoCard with offers.
 *    Tap the card -> it flies to the entrance, the doors open, the camera walks in, homepage appears.
 */

(function () {
  'use strict';

  // Session & navigation guard:
  // - Plays on fresh reload or direct visit
  // - Does NOT replay when user navigates between internal pages
  var SESSION_KEY = 'rxmc_intro_seen';
  var urlParams = new URLSearchParams(window.location.search);
  var forceIntro = urlParams.has('intro') || urlParams.has('replay');

  // Detect browser reload to ensure intro plays on reload as requested
  var isReload = false;
  try {
    var navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0 && navEntries[0].type === 'reload') {
      isReload = true;
    } else if (window.performance && window.performance.navigation && window.performance.navigation.type === 1) {
      isReload = true;
    }
  } catch (e) { }

  if (isReload) {
    sessionStorage.removeItem(SESSION_KEY);
  }

  if (!forceIntro && !isReload && sessionStorage.getItem(SESSION_KEY)) {
    return;
  }

  // Reduced motion preference check
  if (!forceIntro && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sessionStorage.setItem(SESSION_KEY, '1');
    return;
  }

  // --- PALETTE (Precisely extracted from Homepage Hero Section) ---
  var THEME = {
    bgMint: '#CBEBDF',
    bgSoft: '#D9F0E8',
    bgSky: '#C7DDEA',
    yellow: '#F5C03A',
    yellowGlow: '#FDE08A',
    navy: '#14264F',
    navyText: '#1B5E9E',
    greenAccent: '#1E9E7A',
    greenDark: '#145C47',
    skyAccent: '#7CC4EE',
    white: '#FFFFFF',
    concrete: '#E6ECEB',
    concreteDark: '#CFD9D7',
    glassTint: '#4B9BC7',
    glassReflect: '#7CC4EE',
    asphalt: '#333D45',
    curbYellow: '#F5C03A',
    roadLine: '#FFFFFF',
    heliYellow: '#F5C03A',
    heliWhite: '#FFFFFF',
    frameMetal: '#1E3245',
    warmLobby: '#FFF3D0'
  };

  // Convert hex strings to numeric for Three.js
  var HEX = {
    bg: 0xCBEBDF,
    bgFog: 0xD4EDEA,
    yellow: 0xF5C03A,
    green: 0x1E9E7A,
    navy: 0x14264F,
    sky: 0x7CC4EE,
    white: 0xFFFFFF,
    concrete: 0xE8EFEE,
    concreteBevel: 0xC6D3D0,
    glass: 0x4898C4,
    frame: 0x1B2C3C,
    mullion: 0x2A4254,
    roofAcc: 0x88B4AE,
    warmLight: 0xFFF1D2,
    redCross: 0xE53935
  };

  // --- 1. DOM OVERLAY CREATION ---
  var overlay = document.createElement('div');
  overlay.id = 'rxmc-3d-intro';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:999999',
    'background:linear-gradient(160deg, #CBEBDF 0%, #D9F0E8 50%, #C7DDEA 100%)',
    'overflow:hidden',
    'font-family:Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'user-select:none',
    '-webkit-user-select:none',
    'cursor:default'
  ].join(';') + ';';

  // Ambient organic background shapes matching the hero section
  var bgOrbs = document.createElement('div');
  bgOrbs.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;';
  bgOrbs.innerHTML = [
    '<div style="position:absolute;top:-100px;right:-80px;width:550px;height:550px;border-radius:50%;background:radial-gradient(circle, rgba(245,192,58,0.35) 0%, rgba(245,192,58,0.05) 60%, transparent 75%);filter:blur(30px);animation:pulseOrb 8s ease-in-out infinite alternate;"></div>',
    '<div style="position:absolute;bottom:-120px;left:-100px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle, rgba(124,196,238,0.40) 0%, rgba(30,158,122,0.12) 55%, transparent 75%);filter:blur(40px);"></div>',
    '<div style="position:absolute;top:30%;left:5%;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle, rgba(30,158,122,0.18) 0%, transparent 65%);filter:blur(35px);"></div>'
  ].join('');
  overlay.appendChild(bgOrbs);

  // Add styles for animations
  var styleTag = document.createElement('style');
  styleTag.textContent = [
    '@keyframes pulseOrb { 0% { transform: scale(1) translate(0, 0); } 100% { transform: scale(1.1) translate(-20px, 20px); } }',
    '@keyframes cardAuraPulse { 0%, 100% { box-shadow: 0 20px 48px rgba(20,38,79,0.42), 0 0 0 0 rgba(245,192,58,0.7), 0 0 30px rgba(30,158,122,0.35); } 50% { box-shadow: 0 26px 60px rgba(20,38,79,0.52), 0 0 0 16px rgba(245,192,58,0), 0 0 50px rgba(245,192,58,0.8); } }',
    '@keyframes floatBadge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }',
    '@keyframes cardShimmer { 0% { transform: translateX(-180%) rotate(25deg); opacity: 0; } 15% { opacity: 0.8; } 50% { transform: translateX(280%) rotate(25deg); opacity: 0; } 100% { transform: translateX(280%) rotate(25deg); opacity: 0; } }',
    '@keyframes promptBounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.04); } }',
    '@keyframes brandIn { 0% { opacity: 0; transform: translateY(-24px) scale(0.92); } 100% { opacity: 1; transform: none; } }'
  ].join('\n');
  document.head.appendChild(styleTag);

  // 3D Canvas
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:2;cursor:pointer;';
  overlay.appendChild(canvas);

  // Top header: only the Skip button now (brand moved to the big centered block below)
  var topHeader = document.createElement('div');
  topHeader.style.cssText = [
    'position:absolute',
    'top:20px',
    'left:24px',
    'right:24px',
    'display:flex',
    'justify-content:flex-end',
    'align-items:center',
    'z-index:12',
    'pointer-events:none',
    'transition:opacity 0.5s ease'
  ].join(';') + ';';

  var skipBtn = document.createElement('button');
  skipBtn.innerHTML = 'Skip Intro &rarr;';
  skipBtn.style.cssText = [
    'pointer-events:auto',
    'background:rgba(255,255,255,0.92)',
    'backdrop-filter:blur(10px)',
    '-webkit-backdrop-filter:blur(10px)',
    'border:2px solid rgba(20,38,79,0.22)',
    'color:#14264F',
    'font-size:1.02rem',
    'font-weight:800',
    'letter-spacing:0.4px',
    'padding:11px 26px',
    'border-radius:999px',
    'cursor:pointer',
    'box-shadow:0 6px 20px rgba(20,38,79,0.14)',
    'transition:all 0.25s ease'
  ].join(';') + ';';
  skipBtn.addEventListener('mouseenter', function () {
    skipBtn.style.background = '#F5C03A';
    skipBtn.style.color = '#14264F';
    skipBtn.style.transform = 'translateY(-2px) scale(1.04)';
    skipBtn.style.boxShadow = '0 8px 24px rgba(245,192,58,0.55)';
  });
  skipBtn.addEventListener('mouseleave', function () {
    skipBtn.style.background = 'rgba(255,255,255,0.92)';
    skipBtn.style.color = '#14264F';
    skipBtn.style.transform = 'translateY(0) scale(1)';
    skipBtn.style.boxShadow = '0 6px 20px rgba(20,38,79,0.14)';
  });

  topHeader.appendChild(skipBtn);
  overlay.appendChild(topHeader);

  // BIG CENTERED BRAND: logo + "Rx Medo Card" (+ status line underneath)
  var brandCenter = document.createElement('div');
  brandCenter.style.cssText = [
    'position:absolute',
    'top:22px',
    'left:0',
    'right:0',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:14px',
    'z-index:10',
    'pointer-events:none',
    'padding:0 16px',
    'transition:opacity 0.6s ease',
    'animation:brandIn 1s cubic-bezier(0.16, 1, 0.3, 1) backwards'
  ].join(';') + ';';

  var brandRow = document.createElement('div');
  brandRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;';
  brandRow.innerHTML = [
    '<div style="width:clamp(64px,8vw,98px);height:clamp(64px,8vw,98px);border-radius:50%;background:#ffffff;box-shadow:0 10px 30px rgba(20,38,79,0.22);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid rgba(255,255,255,0.9);flex-shrink:0;">',
    '  <img src="images/logo.ico" alt="Rx Medo Card" style="width:78%;height:78%;object-fit:contain;" onerror="this.src=\'images/logo.webp\'">',
    '</div>',
    '<div style="text-align:left;">',
    '  <div style="font-size:clamp(2.1rem,5vw,4.2rem);font-weight:800;color:#1B5E9E;line-height:1.05;letter-spacing:-1px;text-shadow:0 2px 0 rgba(255,255,255,0.6),0 8px 24px rgba(20,38,79,0.18);">Rx Medo Card</div>',
    '  <div style="font-size:clamp(0.6rem,1.2vw,0.95rem);font-weight:700;color:#145C47;letter-spacing:0.2em;margin-top:6px;">AN INITIATIVE OF RX MEDICAL TRUST</div>',
    '</div>'
  ].join('');
  brandCenter.appendChild(brandRow);
  overlay.appendChild(brandCenter);

  // Rx MedoCard — High-profile hero showcase. Revealed after hospital construction.
  var isWide = window.innerWidth >= 900;
  var ctaX = isWide ? '0px' : '-50%';
  var ctaContainer = document.createElement('div');
  ctaContainer.id = 'rxmc-cta-panel';
  ctaContainer.style.cssText = [
    'position:absolute',
    'bottom:26px',
    isWide ? 'right:4vw' : 'left:50%',
    'transform:translateX(' + ctaX + ') translateY(40px) scale(0.9)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:12px',
    'z-index:20',
    'opacity:0',
    'pointer-events:none',
    'transition:opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
  ].join(';') + ';';

  var cardFloat = document.createElement('div');
  cardFloat.style.cssText = 'animation:floatBadge 3.2s ease-in-out infinite;cursor:pointer;perspective:1000px;';

  var enterCard = document.createElement('div');
  enterCard.id = 'rxmc-enter-trigger';
  enterCard.setAttribute('role', 'button');
  enterCard.setAttribute('tabindex', '0');
  enterCard.setAttribute('aria-label', 'Use your Rx MedoCard to enter hospital');
  enterCard.style.cssText = [
    'position:relative',
    'width:min(345px,82vw)',
    'aspect-ratio:1.586',
    'border-radius:20px',
    'padding:16px 20px',
    'box-sizing:border-box',
    'color:#ffffff',
    'overflow:hidden',
    'cursor:pointer',
    'background:linear-gradient(135deg, #1B5E9E 0%, #14264F 72%)',
    'border:2px solid rgba(245,192,58,0.85)',
    'animation:cardAuraPulse 3s infinite',
    'pointer-events:auto',
    'transform-style:preserve-3d',
    'transition:transform 0.3s ease, border-color 0.3s ease'
  ].join(';') + ';';

  enterCard.innerHTML = [
    // Dynamic Holographic Light Shimmer Sweep
    '<div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.45) 50%, rgba(245,192,58,0.65) 54%, transparent 64%);animation:cardShimmer 4.5s ease-in-out infinite;pointer-events:none;z-index:5;"></div>',
    // Decorative Geometric Circles
    '<div style="position:absolute;right:-12%;top:-34%;width:48%;height:84%;border-radius:50%;background:#F5C03A;opacity:0.95;"></div>',
    '<div style="position:absolute;left:-18%;bottom:-60%;width:72%;height:110%;border-radius:50%;background:rgba(30,158,122,0.42);"></div>',
    '<div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">',
    '  <div style="display:flex;align-items:center;gap:10px;">',
    '    <div style="width:38px;height:38px;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.25);"><img src="images/logo.ico" alt="" style="width:30px;height:30px;object-fit:contain;" onerror="this.src=\'images/logo.webp\'"></div>',
    '    <div style="line-height:1.15;"><div style="font-size:1.08rem;font-weight:800;letter-spacing:-0.2px;">Rx MedoCard</div><div style="font-size:0.55rem;font-weight:700;letter-spacing:0.16em;color:#FDE08A;margin-top:2px;">HEALTH SAVINGS CARD</div></div>',
    '    <!-- Realistic Smart Card EMV Chip -->',
    '    <div style="margin-left:auto;width:40px;height:30px;border-radius:7px;background:linear-gradient(135deg,#FFEBA3,#DF9D17);box-shadow:inset 0 0 0 1px rgba(20,38,79,0.3), 0 2px 6px rgba(0,0,0,0.2);position:relative;overflow:hidden;">',
    '      <div style="position:absolute;top:40%;left:0;right:0;height:1px;background:rgba(20,38,79,0.35);"></div>',
    '      <div style="position:absolute;top:0;bottom:0;left:45%;width:1px;background:rgba(20,38,79,0.35);"></div>',
    '      <div style="position:absolute;inset:4px;border:1px solid rgba(20,38,79,0.3);border-radius:4px;"></div>',
    '    </div>',
    '  </div>',
    '  <div style="margin-top:auto;">',
    '    <div style="font-size:1.75rem;font-weight:800;color:#F5C03A;line-height:1;letter-spacing:-0.4px;text-shadow:0 2px 10px rgba(0,0,0,0.3);">SAVE UP TO 50%</div>',
    '    <div style="font-size:0.78rem;font-weight:700;margin-top:4px;color:#FFFFFF;text-shadow:0 1px 4px rgba(0,0,0,0.3);">on medical services</div>',
    '    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:0.65rem;font-weight:700;color:#E8F7F3;"><span>&#10003; Free OPD</span><span>&#10003; 20-22% off Pharmacy</span><span>&#10003; Pre-existing covered</span></div>',
    '  </div>',
    '</div>'
  ].join('');

  // 3D Tilt on Hover for a tactile physical card feel
  enterCard.addEventListener('mouseenter', function () {
    enterCard.style.transform = 'scale(1.04) rotateX(4deg) rotateY(-4deg)';
    enterCard.style.borderColor = '#FFFFFF';
  });
  enterCard.addEventListener('mouseleave', function () {
    enterCard.style.transform = 'scale(1) rotateX(0deg) rotateY(0deg)';
    enterCard.style.borderColor = 'rgba(245,192,58,0.85)';
  });

  cardFloat.appendChild(enterCard);

  // Highly visible interactive call-to-action button underneath
  var subPrompt = document.createElement('div');
  subPrompt.style.cssText = [
    'background:linear-gradient(135deg, #F5C03A 0%, #E6AC18 100%)',
    'color:#14264F',
    'font-size:0.86rem',
    'font-weight:800',
    'letter-spacing:0.3px',
    'padding:9px 22px',
    'border-radius:999px',
    'box-shadow:0 8px 24px rgba(245, 192, 58, 0.55)',
    'border:2px solid #FFFFFF',
    'text-align:center',
    'cursor:pointer',
    'animation:promptBounce 2.4s ease-in-out infinite',
    'transition:all 0.25s ease',
    'user-select:none'
  ].join(';') + ';';
  subPrompt.textContent = '✨ TAP CARD TO ENTER HOSPITAL ✨';
  subPrompt.addEventListener('mouseenter', function () {
    subPrompt.style.transform = 'scale(1.08)';
    subPrompt.style.boxShadow = '0 10px 28px rgba(245, 192, 58, 0.75)';
  });
  subPrompt.addEventListener('mouseleave', function () {
    subPrompt.style.transform = 'scale(1)';
    subPrompt.style.boxShadow = '0 8px 24px rgba(245, 192, 58, 0.55)';
  });
  ctaContainer.appendChild(cardFloat);
  ctaContainer.appendChild(subPrompt);
  overlay.appendChild(ctaContainer);

  // Transition Flash Layer (for entrance transition)
  var flashLayer = document.createElement('div');
  flashLayer.style.cssText = 'position:absolute;inset:0;background:#FFFFFF;opacity:0;pointer-events:none;z-index:100;transition:opacity 0.5s ease-out;';
  overlay.appendChild(flashLayer);

  // Append overlay to DOM immediately and freeze body scroll
  document.body.appendChild(overlay);
  var originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // --- 2. SCRIPT LOADER (USING LOCAL THREE.MIN.JS & GSAP.MIN.JS) ---
  function loadScript(src, next) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = next;
    s.onerror = function () {
      console.warn('Local script load failed for ' + src + ', falling back to CDN.');
      var cdnFallback = src.indexOf('three') !== -1
        ? 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
        : 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
      var s2 = document.createElement('script');
      s2.src = cdnFallback;
      s2.onload = next;
      s2.onerror = function () {
        dismissIntro();
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  }

  loadScript('js/three.min.js', function () {
    loadScript('js/gsap.min.js', initThreeScene);
  });

  // --- 3. HIGH-END PROCEDURAL ARCHITECTURAL TEXTURES ---
  function createArchitecturalTextures(THREE) {
    var tex = {};

    // 1. Curtain Wall Glass Texture (Metallic Mullions + Reflective Tinted Glass)
    var glassCvs = document.createElement('canvas');
    glassCvs.width = 512;
    glassCvs.height = 512;
    var gctx = glassCvs.getContext('2d');
    gctx.fillStyle = '#4898C4';
    gctx.fillRect(0, 0, 512, 512);

    // Subtle glass vertical tint gradient
    var gGrd = gctx.createLinearGradient(0, 0, 0, 512);
    gGrd.addColorStop(0, '#6CB7E0');
    gGrd.addColorStop(0.5, '#428CB6');
    gGrd.addColorStop(1, '#2F7096');
    gctx.fillStyle = gGrd;
    gctx.fillRect(0, 0, 512, 512);

    // Architectural window mullion frames (16x16 grid)
    var cols = 8;
    var rows = 8;
    var cw = 512 / cols;
    var ch = 512 / rows;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        // Individual window pane glass reflection
        gctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        gctx.fillRect(i * cw + 4, j * ch + 4, cw - 8, ch - 8);

        // Some rooms with warm interior medical lighting
        if ((i + j) % 3 === 0 || (i * 2 + j) % 5 === 0) {
          gctx.fillStyle = 'rgba(255, 243, 208, 0.22)';
          gctx.fillRect(i * cw + 6, j * ch + 6, cw - 12, ch - 12);
        }

        // Dark metallic window frame border
        gctx.strokeStyle = '#182E3E';
        gctx.lineWidth = 3;
        gctx.strokeRect(i * cw + 1.5, j * ch + 1.5, cw - 3, ch - 3);

        // Thin interior glazing bead
        gctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        gctx.lineWidth = 1;
        gctx.strokeRect(i * cw + 4, j * ch + 4, cw - 8, ch - 8);
      }
    }
    tex.glass = new THREE.CanvasTexture(glassCvs);
    tex.glass.wrapS = tex.glass.wrapT = THREE.RepeatWrapping;

    // 2. Architectural Panel Texture (Crisp Composite Off-White Cladding)
    var panCvs = document.createElement('canvas');
    panCvs.width = 512;
    panCvs.height = 512;
    var pctx = panCvs.getContext('2d');
    pctx.fillStyle = '#EBF2F0';
    pctx.fillRect(0, 0, 512, 512);

    // Architectural panel seams
    pctx.strokeStyle = '#CBD8D5';
    pctx.lineWidth = 2;
    for (var px = 0; px <= 512; px += 64) {
      pctx.beginPath();
      pctx.moveTo(px, 0);
      pctx.lineTo(px, 512);
      pctx.stroke();
    }
    for (var py = 0; py <= 512; py += 64) {
      pctx.beginPath();
      pctx.moveTo(0, py);
      pctx.lineTo(512, py);
      pctx.stroke();
    }
    tex.panels = new THREE.CanvasTexture(panCvs);
    tex.panels.wrapS = tex.panels.wrapT = THREE.RepeatWrapping;

    // 3. Hospital Main Signage Texture  -> now says only "HOSPITAL"
    var signCvs = document.createElement('canvas');
    signCvs.width = 1024;
    signCvs.height = 256;
    var sctx = signCvs.getContext('2d');
    sctx.fillStyle = '#14264F';
    sctx.fillRect(0, 0, 1024, 256);

    // Border accent
    sctx.strokeStyle = '#1E9E7A';
    sctx.lineWidth = 8;
    sctx.strokeRect(8, 8, 1008, 240);

    // Medical Cross Icon
    sctx.fillStyle = '#1E9E7A';
    sctx.fillRect(60, 48, 48, 160);
    sctx.fillRect(4, 104, 160, 48);

    // Signage Text
    sctx.textAlign = 'center';
    sctx.textBaseline = 'alphabetic';
    sctx.fillStyle = '#FFFFFF';
    sctx.font = 'bold 120px Poppins, sans-serif';
    sctx.fillText('HOSPITAL', 600, 150);

    sctx.fillStyle = '#F5C03A';
    sctx.font = '600 40px Poppins, sans-serif';
    sctx.fillText('24x7 CARE  \u2022  EMERGENCY  \u2022  OPD', 600, 208);

    tex.hospitalSign = new THREE.CanvasTexture(signCvs);

    // 4. Helipad Flight Deck Texture
    var heliCvs = document.createElement('canvas');
    heliCvs.width = 512;
    heliCvs.height = 512;
    var hctx = heliCvs.getContext('2d');
    hctx.fillStyle = '#3A4A52';
    hctx.fillRect(0, 0, 512, 512);

    // Concrete pad border
    hctx.strokeStyle = '#F5C03A';
    hctx.lineWidth = 14;
    hctx.strokeRect(16, 16, 480, 480);

    // Outer circle
    hctx.strokeStyle = '#FFFFFF';
    hctx.lineWidth = 10;
    hctx.beginPath();
    hctx.arc(256, 256, 200, 0, Math.PI * 2);
    hctx.stroke();

    // Inner landing cross / H
    hctx.fillStyle = '#F5C03A';
    hctx.font = 'bold 220px Poppins, Arial, sans-serif';
    hctx.textAlign = 'center';
    hctx.textBaseline = 'middle';
    hctx.fillText('H', 256, 256);

    tex.helipad = new THREE.CanvasTexture(heliCvs);

    // 5. Asphalt Roadway with Drop-Off Lane Markings
    var roadCvs = document.createElement('canvas');
    roadCvs.width = 512;
    roadCvs.height = 1024;
    var rctx = roadCvs.getContext('2d');
    rctx.fillStyle = '#2C353D';
    rctx.fillRect(0, 0, 512, 1024);

    // Yellow curb edges
    rctx.fillStyle = '#F5C03A';
    rctx.fillRect(0, 0, 18, 1024);
    rctx.fillRect(494, 0, 18, 1024);

    // Dashed center traffic line
    rctx.strokeStyle = '#FFFFFF';
    rctx.lineWidth = 8;
    rctx.setLineDash([40, 30]);
    rctx.beginPath();
    rctx.moveTo(256, 0);
    rctx.lineTo(256, 1024);
    rctx.stroke();

    // Pedestrian crosswalk zebra stripes at entrance
    rctx.setLineDash([]);
    rctx.fillStyle = '#FFFFFF';
    for (var zx = 50; zx <= 462; zx += 38) {
      rctx.fillRect(zx, 860, 24, 90);
    }

    tex.roadway = new THREE.CanvasTexture(roadCvs);

    return tex;
  }

  // --- 4. THREE.JS SCENE, HOSPITAL ARCHITECTURE & ANIMATION ---
  function initThreeScene() {
    var THREE = window.THREE;
    var gsap = window.gsap;
    if (!THREE || !gsap) {
      dismissIntro();
      return;
    }

    var W = window.innerWidth;
    var H = window.innerHeight;

    // Renderer with soft PBR shadows and tone mapping
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.30;
    }

    var scene = new THREE.Scene();
    // High-visibility linear fog starting behind the hospital so foreground colors are completely vibrant and clear
    scene.fog = new THREE.Fog(0xD8ECE6, 85, 340);

    // Camera setup: initial aerial cinematic perspective
    // The look-at point is raised (12.5) so the hospital sits lower on screen,
    // leaving room for the big brand heading at the top.
    var camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 800);
    var cameraTarget = new THREE.Vector3(0, 12.5, 0);
    var lookTarget = cameraTarget;   // animated by GSAP, applied every frame in the render loop
    camera.position.set(0, 18, 52);
    camera.lookAt(lookTarget);

    // Textures
    var textures = createArchitecturalTextures(THREE);

    // --- LIGHTING SETUP (High Vibrancy & Contrast Medical Campus Lighting) ---
    var ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.85);
    scene.add(ambientLight);

    // Key Sun Light casting crisp, soft shadows
    var sunLight = new THREE.DirectionalLight(0xFFF9EE, 2.1);
    sunLight.position.set(28, 48, 36);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Sky Fill Light (vibrant, saturated sky blue)
    var skyFill = new THREE.DirectionalLight(0x40A9FF, 1.15);
    skyFill.position.set(-28, 22, -18);
    scene.add(skyFill);

    // Soft Warm Rim Light (punchy golden yellow from hero palette)
    var rimLight = new THREE.DirectionalLight(0xF5C03A, 0.7);
    rimLight.position.set(0, 8, -40);
    scene.add(rimLight);

    // --- MATERIALS (Realistic, High-Vibrancy Architectural PBR) ---
    var matPanel = new THREE.MeshStandardMaterial({
      map: textures.panels,
      color: 0xF5FAF8,
      roughness: 0.55,
      metalness: 0.08
    });
    textures.panels.repeat.set(4, 4);

    var matPanelDark = new THREE.MeshStandardMaterial({
      map: textures.panels,
      color: 0xC4D6D2,
      roughness: 0.65,
      metalness: 0.14
    });

    var matGlassCurtain = new THREE.MeshStandardMaterial({
      map: textures.glass,
      color: 0x328DC5,
      roughness: 0.10,
      metalness: 0.88,
      emissive: 0x0E354E,
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0.94
    });
    textures.glass.repeat.set(2, 2);

    var matClearGlass = new THREE.MeshPhysicalMaterial({
      color: 0xA3DCF8,
      transmission: 0.75,
      transparent: true,
      opacity: 0.85,
      roughness: 0.04,
      reflectivity: 0.85,
      metalness: 0.12
    });

    var matFrame = new THREE.MeshStandardMaterial({
      color: 0x122434,
      roughness: 0.35,
      metalness: 0.65
    });

    var matYellowAccent = new THREE.MeshStandardMaterial({
      color: 0xF5BA20,
      roughness: 0.28,
      metalness: 0.25,
      emissive: 0xF5BA20,
      emissiveIntensity: 0.38
    });

    var matGreenMedical = new THREE.MeshStandardMaterial({
      color: 0x0E9A70,
      roughness: 0.32,
      metalness: 0.25,
      emissive: 0x0E9A70,
      emissiveIntensity: 0.48
    });

    var matRoof = new THREE.MeshStandardMaterial({
      color: HEX.roofAcc,
      roughness: 0.8,
      metalness: 0.15
    });

    var matRoad = new THREE.MeshStandardMaterial({
      map: textures.roadway,
      roughness: 0.9,
      metalness: 0.05
    });

    var matHelipad = new THREE.MeshStandardMaterial({
      map: textures.helipad,
      roughness: 0.85,
      metalness: 0.1
    });

    var matSign = new THREE.MeshStandardMaterial({
      map: textures.hospitalSign,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x14264F,
      emissiveIntensity: 0.2
    });

    var matLobbyWarm = new THREE.MeshBasicMaterial({
      color: HEX.warmLight
    });

    // --- HOSPITAL ARCHITECTURAL MODEL HIERARCHY ---
    var hospitalIsland = new THREE.Group();
    scene.add(hospitalIsland);

    // Helpers
    function makeMesh(geo, mat, castSh, recSh) {
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = castSh !== false;
      m.receiveShadow = recSh !== false;
      return m;
    }

    // 1. FLOATING BEVELED CAMPUS PODIUM (Island)
    var podiumGroup = new THREE.Group();
    hospitalIsland.add(podiumGroup);

    // Main top ground platform
    var campusTop = makeMesh(new THREE.BoxGeometry(48, 1.2, 38), new THREE.MeshStandardMaterial({ color: 0xDCE9E5, roughness: 0.85 }), false, true);
    campusTop.position.set(0, -0.6, 0);
    podiumGroup.add(campusTop);

    // Beveled lower pedestal underside (floating display edge)
    var campusBase = makeMesh(new THREE.CylinderGeometry(27, 24, 2.4, 8), new THREE.MeshStandardMaterial({ color: HEX.concreteBevel, roughness: 0.7, metalness: 0.25 }));
    campusBase.position.set(0, -2.1, 0);
    podiumGroup.add(campusBase);

    // Ambient underside glow ring (high-tech medical floating aesthetic)
    var ringGeo = new THREE.RingGeometry(24.5, 26, 32);
    var ringMat = new THREE.MeshBasicMaterial({ color: HEX.sky, side: THREE.DoubleSide });
    var glowRing = new THREE.Mesh(ringGeo, ringMat);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = -3.3;
    podiumGroup.add(glowRing);

    // Paved Approach Driveway
    var driveway = makeMesh(new THREE.PlaneGeometry(12, 26), matRoad, false, true);
    driveway.rotation.x = -Math.PI / 2;
    driveway.position.set(0, 0.02, 10);
    podiumGroup.add(driveway);

    // Manicured Campus Landscaping (Geometric Planters & Modern Hedges)
    function addPlanter(x, z, w, d) {
      var curb = makeMesh(new THREE.BoxGeometry(w, 0.35, d), matPanelDark);
      curb.position.set(x, 0.18, z);
      podiumGroup.add(curb);

      var hedge = makeMesh(new THREE.BoxGeometry(w - 0.4, 0.7, d - 0.4), new THREE.MeshStandardMaterial({ color: 0x228B62, roughness: 0.9 }));
      hedge.position.set(x, 0.55, z);
      podiumGroup.add(hedge);
    }
    addPlanter(-13, 11, 8, 14);
    addPlanter(13, 11, 8, 14);
    addPlanter(-18, -2, 6, 16);
    addPlanter(18, -2, 6, 16);

    // Modern Architectural Light Bollards
    [-5.8, 5.8].forEach(function (bx) {
      [2, 8, 14, 20].forEach(function (bz) {
        var pole = makeMesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), matFrame);
        pole.position.set(bx, 0.7, bz);
        podiumGroup.add(pole);

        var lampHead = makeMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8), matYellowAccent);
        lampHead.position.set(bx, 1.35, bz);
        podiumGroup.add(lampHead);
      });
    });

    // 2. HOSPITAL BUILDINGS GROUP (Pieces animated in during construction)
    var hospitalBuilding = new THREE.Group();
    hospitalIsland.add(hospitalBuilding);

    // Tier array for building construction sequence
    var constructionTiers = [];

    // --- TIER 1: Ground Floor Podium & Emergency Wing ---
    var tier1 = new THREE.Group();
    hospitalBuilding.add(tier1);
    constructionTiers.push(tier1);

    // Ground Floor Concrete Core
    var groundCore = makeMesh(new THREE.BoxGeometry(32, 4.5, 18), matPanel);
    groundCore.position.set(0, 2.25, -1);
    tier1.add(groundCore);

    // Ground Floor Accent Stripe (Brand Yellow)
    var groundStripe = makeMesh(new THREE.BoxGeometry(32.2, 0.3, 18.2), matYellowAccent);
    groundStripe.position.set(0, 4.35, -1);
    tier1.add(groundStripe);

    // Emergency Department Porte-Cochere (Left Wing)
    var emerCanopy = makeMesh(new THREE.BoxGeometry(10, 0.45, 9), matPanelDark);
    emerCanopy.position.set(-15, 4.2, 4.5);
    tier1.add(emerCanopy);

    var emerSign = makeMesh(new THREE.BoxGeometry(6.5, 1.2, 0.2), new THREE.MeshStandardMaterial({
      color: 0xB71C1C,
      roughness: 0.3,
      emissive: 0xB71C1C,
      emissiveIntensity: 0.35
    }));
    emerSign.position.set(-15, 3.4, 8.95);
    tier1.add(emerSign);

    // Columns for Emergency Canopy
    [-19, -11].forEach(function (cx) {
      var col = makeMesh(new THREE.CylinderGeometry(0.25, 0.25, 4.2, 12), matFrame);
      col.position.set(cx, 2.1, 8.5);
      tier1.add(col);
    });

    // --- TIER 2: Main Central Inpatient Tower (Levels 2 - 5) ---
    var tier2 = new THREE.Group();
    hospitalBuilding.add(tier2);
    constructionTiers.push(tier2);

    // Tower Structure Core
    var towerCore = makeMesh(new THREE.BoxGeometry(18, 14, 14), matPanel);
    towerCore.position.set(0, 11.5, -1);
    tier2.add(towerCore);

    // Front Curtain Wall Glass Facade
    var towerGlass = makeMesh(new THREE.BoxGeometry(15.5, 12.5, 0.6), matGlassCurtain);
    towerGlass.position.set(0, 11.8, 6.1);
    tier2.add(towerGlass);

    // Horizontal Spandrel Louvers on Tower
    for (var fl = 0; fl < 4; fl++) {
      var spandrel = makeMesh(new THREE.BoxGeometry(17.5, 0.4, 0.8), matPanelDark);
      spandrel.position.set(0, 6.5 + fl * 3.4, 6.2);
      tier2.add(spandrel);
    }

    // Vertical Architectural Solar Fins (Emerald Green Accents)
    [-7.8, -4.5, 4.5, 7.8].forEach(function (fx) {
      var fin = makeMesh(new THREE.BoxGeometry(0.3, 13.5, 1.2), matGreenMedical);
      fin.position.set(fx, 11.8, 6.2);
      tier2.add(fin);
    });

    // Rear and Side Window Bands
    var rearGlass = makeMesh(new THREE.BoxGeometry(16, 12.5, 0.5), matGlassCurtain);
    rearGlass.position.set(0, 11.8, -8.1);
    tier2.add(rearGlass);

    var leftGlass = makeMesh(new THREE.BoxGeometry(0.5, 10, 11), matGlassCurtain);
    leftGlass.position.set(-9.1, 12, -1);
    tier2.add(leftGlass);

    var rightGlass = makeMesh(new THREE.BoxGeometry(0.5, 10, 11), matGlassCurtain);
    rightGlass.position.set(9.1, 12, -1);
    tier2.add(rightGlass);

    // --- TIER 3: West & East Clinical Wings (Levels 2 - 4) ---
    var tier3 = new THREE.Group();
    hospitalBuilding.add(tier3);
    constructionTiers.push(tier3);

    // West Wing (Diagnostics / ICU)
    var westWing = makeMesh(new THREE.BoxGeometry(9.5, 8.5, 13), matPanel);
    westWing.position.set(-13.5, 8.75, -1);
    tier3.add(westWing);

    var westGlass = makeMesh(new THREE.BoxGeometry(8.5, 7, 0.5), matGlassCurtain);
    westGlass.position.set(-13.5, 8.8, 5.6);
    tier3.add(westGlass);

    // East Wing (Surgical & Specialty Suites)
    var eastWing = makeMesh(new THREE.BoxGeometry(9.5, 8.5, 13), matPanel);
    eastWing.position.set(13.5, 8.75, -1);
    tier3.add(eastWing);

    var eastGlass = makeMesh(new THREE.BoxGeometry(8.5, 7, 0.5), matGlassCurtain);
    eastGlass.position.set(13.5, 8.8, 5.6);
    tier3.add(eastGlass);

    // Roof Parapets on Wings
    var westParapet = makeMesh(new THREE.BoxGeometry(9.8, 0.5, 13.3), matRoof);
    westParapet.position.set(-13.5, 13.2, -1);
    tier3.add(westParapet);

    var eastParapet = makeMesh(new THREE.BoxGeometry(9.8, 0.5, 13.3), matRoof);
    eastParapet.position.set(13.5, 13.2, -1);
    tier3.add(eastParapet);

    // --- TIER 4: Grand Entrance Atrium, Sliding Doors & Signage ---
    var tier4 = new THREE.Group();
    hospitalBuilding.add(tier4);
    constructionTiers.push(tier4);

    // Double-Height Structural Glass Atrium
    var atriumGlass = makeMesh(new THREE.BoxGeometry(11, 4.8, 4.5), matClearGlass);
    atriumGlass.position.set(0, 2.4, 7.8);
    tier4.add(atriumGlass);

    // Warm Interior Reception Desk visible inside glass lobby
    var reception = makeMesh(new THREE.BoxGeometry(4.5, 1.1, 1.2), new THREE.MeshStandardMaterial({ color: HEX.yellow, roughness: 0.3 }));
    reception.position.set(0, 0.55, 6.8);
    tier4.add(reception);

    var lobbyLight = new THREE.PointLight(HEX.warmLight, 1.6, 12);
    lobbyLight.position.set(0, 3.2, 7.5);
    tier4.add(lobbyLight);

    // Sliding Entrance Glass Doors (Animated when the card is used!)
    var doorLeft = makeMesh(new THREE.BoxGeometry(1.6, 2.8, 0.1), matFrame);
    doorLeft.position.set(-0.85, 1.4, 10.05);
    tier4.add(doorLeft);

    var doorRight = makeMesh(new THREE.BoxGeometry(1.6, 2.8, 0.1), matFrame);
    doorRight.position.set(0.85, 1.4, 10.05);
    tier4.add(doorRight);

    // Cantilevered Drop-Off Canopy over Entrance
    var mainCanopy = makeMesh(new THREE.BoxGeometry(13.5, 0.5, 6), matPanelDark);
    mainCanopy.position.set(0, 5.0, 9.8);
    tier4.add(mainCanopy);

    var canopyTrim = makeMesh(new THREE.BoxGeometry(13.6, 0.18, 0.15), matYellowAccent);
    canopyTrim.position.set(0, 4.85, 12.82);
    tier4.add(canopyTrim);

    // Stainless Steel Canopy Support Columns
    [-5.6, -1.8, 1.8, 5.6].forEach(function (colX) {
      var cCol = makeMesh(new THREE.CylinderGeometry(0.22, 0.22, 5.0, 16), matFrame);
      cCol.position.set(colX, 2.5, 12.4);
      tier4.add(cCol);
    });

    // Main Hospital Signage Board (text: HOSPITAL)
    var mainSign = makeMesh(new THREE.BoxGeometry(12, 1.8, 0.25), matSign);
    mainSign.position.set(0, 5.9, 9.6);
    tier4.add(mainSign);

    // Glowing Emerald Green Medical Cross on Main Tower Facade
    var crossGroup = new THREE.Group();
    crossGroup.position.set(0, 17.2, 6.1);
    var crossV = makeMesh(new THREE.BoxGeometry(0.8, 2.6, 0.35), matGreenMedical);
    var crossH = makeMesh(new THREE.BoxGeometry(2.6, 0.8, 0.35), matGreenMedical);
    crossGroup.add(crossV);
    crossGroup.add(crossH);
    tier4.add(crossGroup);

    // --- TIER 5: Rooftop Helipad, Mechanical Penthouse & Parapets ---
    var tier5 = new THREE.Group();
    hospitalBuilding.add(tier5);
    constructionTiers.push(tier5);

    // Main Roof Parapet
    var roofDeck = makeMesh(new THREE.BoxGeometry(18.5, 0.6, 14.5), matRoof);
    roofDeck.position.set(0, 18.6, -1);
    tier5.add(roofDeck);

    // Mechanical Penthouse (HVAC / Elevator Shaft with Louvers)
    var penthouse = makeMesh(new THREE.BoxGeometry(6.5, 3.2, 6), matPanelDark);
    penthouse.position.set(-4.5, 20.3, -2);
    tier5.add(penthouse);

    // Helipad Structure (Raised on steel girders)
    var heliBase = makeMesh(new THREE.BoxGeometry(7.5, 0.5, 7.5), matFrame);
    heliBase.position.set(4, 19.1, 1);
    tier5.add(heliBase);

    var heliPadMesh = makeMesh(new THREE.BoxGeometry(7.2, 0.15, 7.2), matHelipad);
    heliPadMesh.position.set(4, 19.4, 1);
    tier5.add(heliPadMesh);

    // Helipad Corner Green Landing Lights
    [[0.8, -2.2], [7.2, -2.2], [0.8, 4.2], [7.2, 4.2]].forEach(function (hPos) {
      var hLight = makeMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8), matGreenMedical);
      hLight.position.set(hPos[0], 19.6, hPos[1]);
      tier5.add(hLight);
    });

    // Roof HVAC Air Handler Units
    [-2, 1, 3.5].forEach(function (hx) {
      var hvac = makeMesh(new THREE.BoxGeometry(1.6, 1.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x8CA0A8, roughness: 0.5, metalness: 0.4 }));
      hvac.position.set(hx, 19.4, -6);
      tier5.add(hvac);
    });

    // Communication Antenna Mast
    var antenna = makeMesh(new THREE.CylinderGeometry(0.06, 0.12, 4.5, 8), matFrame);
    antenna.position.set(-6.5, 24, -4);
    tier5.add(antenna);

    // --- FLOATING ATMOSPHERIC PARTICLES (Yellow & Sky Blue Theme Orbs) ---
    var particleCount = 180;
    var particleGeo = new THREE.BufferGeometry();
    var pPositions = new Float32Array(particleCount * 3);
    for (var p = 0; p < particleCount; p++) {
      pPositions[p * 3] = (Math.random() - 0.5) * 70;
      pPositions[p * 3 + 1] = Math.random() * 35;
      pPositions[p * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    var pMaterial = new THREE.PointsMaterial({
      color: HEX.sky,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true
    });
    var particleSystem = new THREE.Points(particleGeo, pMaterial);
    scene.add(particleSystem);

    // --- INITIAL CONSTRUCTION STATE (Hidden / Collapsed) ---
    // Start island lowered
    podiumGroup.position.y = -18;
    podiumGroup.scale.set(0.01, 0.01, 0.01);

    constructionTiers.forEach(function (tier) {
      tier.position.y = -25;
      tier.scale.set(1, 0.001, 1);
    });

    // --- TIMELINE: 3D CONSTRUCTION SEQUENCE ---
    var masterTL = gsap.timeline({ delay: 0.25 });

    // 1. Floating Podium Appears
    masterTL.to(podiumGroup.position, {
      y: 0,
      duration: 1.6,
      ease: 'power3.out'
    }, 0);

    masterTL.to(podiumGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.6,
      ease: 'back.out(1.2)'
    }, 0);

    // 2. Camera Initial Orbit / Push
    masterTL.to(camera.position, {
      x: 6,
      y: 14,
      z: 42,
      duration: 3.5,
      ease: 'power2.out'
    }, 0.2);

    // 3. Sequential Architectural Construction (Tier by Tier from Ground to Sky)
    var tierDelays = [0.6, 1.1, 1.6, 2.1, 2.6];
    constructionTiers.forEach(function (tier, idx) {
      masterTL.to(tier.position, {
        y: 0,
        duration: 1.3,
        ease: 'power3.out'
      }, tierDelays[idx]);

      masterTL.to(tier.scale, {
        y: 1,
        duration: 1.3,
        ease: 'elastic.out(1, 0.75)'
      }, tierDelays[idx]);
    });

    // 4. Climax: Reveal the Rx MedoCard with an energetic showcase
    var ctaReady = false;
    masterTL.call(function () {
      ctaReady = true;
      ctaContainer.style.pointerEvents = 'auto';

      // Dramatic spring entrance for the card panel
      gsap.to(ctaContainer, {
        opacity: 1,
        transform: 'translateX(' + ctaX + ') translateY(0) scale(1)',
        duration: 0.9,
        ease: 'back.out(1.8)'
      });

      // Start gentle majestic floating breathing motion for the 3D hospital
      startIdleFloating();
    }, [], 3.0);

    // --- IDLE FLOATING MOTION ---
    var idleTweens = [];
    function startIdleFloating() {
      idleTweens.push(
        gsap.to(hospitalIsland.position, {
          y: 0.65,
          duration: 3.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        })
      );
      idleTweens.push(
        gsap.to(hospitalIsland.rotation, {
          y: 0.07,
          duration: 4.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        })
      );
      idleTweens.push(
        gsap.to(camera.position, {
          x: -2,
          duration: 6.0,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        })
      );
    }

    // --- 5. CARD USE + INTERACTIVE ENTRANCE TRAVEL ANIMATION ---
    var isEntering = false;
    var cardUsed = false;

    // Step 1: the Rx MedoCard flies swiftly into the hospital entrance
    function useCard() {
      if (!ctaReady || cardUsed || isEntering) return;
      cardUsed = true;

      subPrompt.style.opacity = '0';

      var r = enterCard.getBoundingClientRect();
      var doorPoint = new THREE.Vector3(0, 1.6 + hospitalIsland.position.y, 10.3);
      doorPoint.project(camera);
      var targetX = (doorPoint.x * 0.5 + 0.5) * window.innerWidth;
      var targetY = (-doorPoint.y * 0.5 + 0.5) * window.innerHeight;

      // Card launches briskly towards the gate
      gsap.to(enterCard, {
        x: targetX - (r.left + r.width / 2),
        y: targetY - (r.top + r.height / 2),
        scale: 0.10,
        rotation: -12,
        opacity: 0,
        duration: 0.38,
        ease: 'power2.in'
      });

      // Hospital gates trigger immediately as card arrives
      setTimeout(executeEntranceTransition, 220);
    }

    // Clicking the hospital itself only nudges the card: the gate needs the card
    function nudgeCard() {
      if (!ctaReady || cardUsed || isEntering) return;
      gsap.fromTo(enterCard, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    }

    // Step 2: doors slide open swiftly, camera zooms in, clean flash, homepage appears
    function executeEntranceTransition() {
      if (isEntering) return;
      isEntering = true;

      // Stop idle movements
      idleTweens.forEach(function (tw) { tw.kill(); });
      gsap.killTweensOf(hospitalIsland.position);
      gsap.killTweensOf(hospitalIsland.rotation);
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(lookTarget);

      // Re-align hospital orientation
      gsap.to(hospitalIsland.rotation, { y: 0, duration: 0.4, ease: 'power2.out' });

      // Fade out HUD, brand and card panel
      ctaContainer.style.opacity = '0';
      ctaContainer.style.transform = 'translateX(' + ctaX + ') translateY(30px)';
      brandCenter.style.opacity = '0';
      topHeader.style.opacity = '0';

      // Door Sliding Opening Animation: Open swiftly and smoothly!
      gsap.to(doorLeft.position, { x: -2.4, duration: 0.50, ease: 'power3.out' });
      gsap.to(doorRight.position, { x: 2.4, duration: 0.50, ease: 'power3.out' });

      // Fast, cinematic camera dolly straight through the open entrance
      var entranceTL = gsap.timeline();

      // Phase A: Swoop briskly down to entrance level
      entranceTL.to(camera.position, {
        x: 0,
        y: 2.8,
        z: 14,
        duration: 0.60,
        ease: 'power2.inOut'
      }, 0);
      entranceTL.to(lookTarget, { x: 0, y: 2.4, z: 8, duration: 0.60, ease: 'power2.inOut' }, 0);

      // Phase B: Swoop through the open doors into the bright lobby
      entranceTL.to(camera.position, {
        x: 0,
        y: 2.0,
        z: 7.2,
        duration: 0.45,
        ease: 'power3.in'
      }, 0.50);
      entranceTL.to(lookTarget, { x: 0, y: 2.0, z: 3.5, duration: 0.45, ease: 'power3.in' }, 0.50);

      // Phase C: Clean flash into homepage reveal
      entranceTL.call(function () {
        flashLayer.style.opacity = '1';
        setTimeout(function () {
          dismissIntro();
        }, 250);
      }, [], 0.90);
    }

    // --- INTERACTION EVENT LISTENERS ---
    // Both the card AND the button trigger the entrance!
    enterCard.addEventListener('click', function (e) {
      e.stopPropagation();
      useCard();
    });

    subPrompt.addEventListener('click', function (e) {
      e.stopPropagation();
      useCard();
    });

    skipBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dismissIntro();
    });

    // Clicking the 3D hospital: the gate needs the Rx MedoCard, so the card shakes
    canvas.addEventListener('click', function () {
      nudgeCard();
    });

    // Keyboard support: Escape = skip, Enter/Space = use the card
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        dismissIntro();
      } else if (e.key === 'Enter' || e.key === ' ') {
        useCard();
      }
    }
    document.addEventListener('keydown', handleKeyDown);

    // --- 6. RENDER LOOP ---
    var clock = new THREE.Clock();
    var animFrameId = 0;

    function renderLoop() {
      animFrameId = requestAnimationFrame(renderLoop);
      var elapsedTime = clock.getElapsedTime();

      // Subtle rotation for atmospheric particles
      if (particleSystem) {
        particleSystem.rotation.y = elapsedTime * 0.025;
      }

      camera.lookAt(lookTarget);
      renderer.render(scene, camera);
    }
    renderLoop();

    // Responsive resize handler
    function handleResize() {
      var nW = window.innerWidth;
      var nH = window.innerHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup reference
    window._rxmcIntroCleanup = function () {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }

  // --- 7. INTRO DISMISSAL & SEAMLESS HOMEPAGE REVEAL ---
  var isDismissed = false;
  function dismissIntro() {
    if (isDismissed) return;
    isDismissed = true;

    sessionStorage.setItem(SESSION_KEY, '1');

    if (window._rxmcIntroCleanup) {
      window._rxmcIntroCleanup();
    }

    // Smooth fade out of intro overlay
    overlay.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    overlay.style.opacity = '0';

    // Restore body scrolling
    document.body.style.overflow = originalBodyOverflow || '';

    // Scroll gracefully to top of hero section
    window.scrollTo({ top: 0, behavior: 'instant' });

    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 650);
  }

})();