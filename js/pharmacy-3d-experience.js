/**
 * Rx Medo Card Pharmacy — Photorealistic 3D Environment With Natural Human Animation
 * Three.js WebGL Architecture + Naturally Animated Pharmacist (Breathing, Blinking, Gesturing) +
 * Continuous First-Person Walking Camera Path + Physical Category Wall Board + Foreground Table & Guidebook
 * High-Realism Pharmaceutical Packaging + Optimized Smooth ScrollTrigger
 */

(function () {
  "use strict";

  // Ensure fresh scroll position on reload
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  // Core Three.js State
  let scene, camera, renderer;
  let cameraTarget = new THREE.Vector3(-0.3, 1.45, 0.5);
  const dynamicLookTarget = new THREE.Vector3();
  let scrollTimeline;
  let isWebGLAvailable = true;
  let animationFrameId;
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let scrollProgress = 0;
  let currentActiveSpread = -1;

  // Scene Object Groups
  let roomGroup, shelvesGroup, counterGroup, categoryBoardGroup;
  let tableGroup, closedBook3DGroup, bookCoverMesh;
  let plantsGroup, windowGroup;

  // Shared Asset Cache for Performance
  let pharmaGeos = null;
  let pharmaMats = null;

  // Living Pharmacist Character State
  let pharmacist = {
    group: null,
    idleMesh: null,
    pointMesh: null,
    shadowMesh: null,
    idleTex: null,
    idleBlinkTex: null,
    pointTex: null,
    pointBlinkTex: null,
    blendFactor: 0, // 0.0 = idle, 1.0 = pointing
    targetBlend: 0,
    blinkTimer: 0,
    blinkDuration: 0.16,
    blinkPhase: 0,
    isBlinking: false,
    nextBlinkTime: 3.2,
    lastBlinkClosed: false,
    headYaw: 0,
    headPitch: 0,
    targetHeadYaw: 0,
    targetHeadPitch: 0,
  };

  // DOM Elements
  const container = document.getElementById("pharmacyExperienceSection");
  const viewport = document.querySelector(".rx-pinned-viewport");
  const canvas = document.getElementById("pharmacy3DCanvas");
  const stageEntrance = document.getElementById("stageEntrance");
  const stageReception = document.getElementById("stageReception");
  const stageCategories = document.getElementById("stageCategories");
  const stagePartners = document.getElementById("stagePartners");
  const stageBook = document.getElementById("stageBook");
  const bookSpreads = document.querySelectorAll(".rx-book-spread");
  const progressLine = document.getElementById("rxScrollProgressLine");

  function checkWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  // ==========================================================================
  // 1. RESPONSIVE THREE.JS ENGINE & ADAPTIVE FIELD OF VIEW
  // ==========================================================================

  function updateCameraFraming() {
    if (!renderer || !camera || !viewport) return;
    const width = viewport.clientWidth || window.innerWidth;
    const height = viewport.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;

    const aspect = width / height;
    camera.aspect = aspect;

    // Responsive FOV based on aspect ratio:
    // Mobile portrait (aspect < 0.60): 65 deg to prevent telephoto cropping of shelves and characters
    // Tablet portrait (aspect < 0.90): 58 deg
    // Small tablet / landscape (aspect < 1.25): 52 deg
    // Desktop (aspect >= 1.25): 48 deg (baseline desktop experience)
    if (aspect < 0.6) {
      camera.fov = 65;
    } else if (aspect < 0.9) {
      camera.fov = 58;
    } else if (aspect < 1.25) {
      camera.fov = 52;
    } else {
      camera.fov = 48;
    }
    camera.updateProjectionMatrix();

    // DPR capping for mobile battery and buttery 60fps performance
    const dpr =
      width < 768
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : Math.min(window.devicePixelRatio || 1, 1.8);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
  }

  function init3D() {
    if (!canvas || typeof THREE === "undefined") {
      isWebGLAvailable = false;
      return;
    }

    isWebGLAvailable = checkWebGL();
    if (!isWebGLAvailable) {
      canvas.style.display = "none";
      if (viewport) viewport.classList.add("no-webgl");
      return;
    }

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f9f7);
    scene.fog = new THREE.FogExp2(0xf3f9f7, 0.015);

    // 2. Camera: Natural Human Eye Level Perspective (~1.62m standing eye height)
    const initWidth =
      (viewport ? viewport.clientWidth : window.innerWidth) || 1280;
    const initHeight =
      (viewport ? viewport.clientHeight : window.innerHeight) || 800;
    const aspect = initWidth / initHeight;
    camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 80);
    const isInitMobile = initWidth < 768;
    camera.position.set(
      -0.25,
      isInitMobile ? 1.64 : 1.62,
      isInitMobile ? 4.55 : 4.3,
    );
    camera.lookAt(cameraTarget);

    // 3. Renderer with Optimized Pixel Ratio & Memory Allocation
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    // Apply responsive camera framing & resolution
    updateCameraFraming();

    // 4. Construct Photorealistic Architecture & Props
    setupLighting();
    buildPharmacyRoom();
    buildWindowCourtyard();
    initPharmaAssets();
    buildMedicineShelves();
    buildReceptionCounter();
    buildCategorySignboard();
    buildConsultationArea();
    buildPharmacistCharacter();
    buildIndoorPlants();

    // 5. Event Listeners
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    if (window.ResizeObserver && viewport) {
      try {
        const ro = new ResizeObserver(() => {
          updateCameraFraming();
        });
        ro.observe(viewport);
      } catch (e) {}
    }

    // 6. Start Render Loop
    animate();
  }

  // ==========================================================================
  // 2. REALISTIC BALANCED LIGHTING (Daylight + LED Troffers + Warm Shelf Strips)
  // ==========================================================================
  function setupLighting() {
    // Soft Ambient Daylight Fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.58);
    scene.add(ambientLight);

    // Sunlit Window Influx from Right Windows (casts soft shadows leftward)
    const sunLight = new THREE.DirectionalLight(0xfffaec, 0.85);
    sunLight.position.set(7.0, 5.0, 1.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 18.0;
    sunLight.shadow.camera.left = -6.0;
    sunLight.shadow.camera.right = 6.0;
    sunLight.shadow.camera.top = 5.0;
    sunLight.shadow.camera.bottom = -5.0;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Reception Counter Downlight (Crisp illumination on pharmacist and counter)
    const receptionLight = new THREE.SpotLight(
      0xffffff,
      0.85,
      12,
      Math.PI / 4,
      0.35,
      1.2,
    );
    receptionLight.position.set(-1.35, 3.7, 0.6);
    receptionLight.target.position.set(-1.35, 1.2, -0.15);
    scene.add(receptionLight);
    scene.add(receptionLight.target);

    // Category Board Gallery Spotlights (angled squarely at right wall board)
    const boardSpot = new THREE.SpotLight(
      0xfffdf7,
      1.15,
      10,
      Math.PI / 3.5,
      0.25,
      1.1,
    );
    boardSpot.position.set(2.4, 3.5, -1.0);
    boardSpot.target.position.set(4.88, 1.7, -1.0);
    scene.add(boardSpot);
    scene.add(boardSpot.target);

    // Consultation Desk Warm Reading Light
    const tableSpot = new THREE.SpotLight(
      0xfff7e8,
      0.75,
      8,
      Math.PI / 4,
      0.4,
      1.2,
    );
    tableSpot.position.set(-0.85, 3.4, 2.4);
    tableSpot.target.position.set(-0.85, 0.8, 2.4);
    scene.add(tableSpot);
    scene.add(tableSpot.target);
  }

  // ==========================================================================
  // 3. ARCHITECTURAL ROOM (Floor, Ceiling, Walls, Consultation Door)
  // ==========================================================================
  function buildPharmacyRoom() {
    roomGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // 1. Floor: Polished Calacatta Porcelain / Marble Tile
    const floorTex = textureLoader.load("images/pharmacy_tile_floor.jpg");
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(2.5, 3.5);
    floorTex.anisotropy = 8;

    const floorGeo = new THREE.PlaneGeometry(16, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.12,
      metalness: 0.06,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -1);
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // 2. Ceiling: Crisp Architectural Finish with Troffer Cutouts
    const ceilingTex = textureLoader.load("images/pharmacy_ceiling_tiles.jpg");
    ceilingTex.wrapS = THREE.RepeatWrapping;
    ceilingTex.wrapT = THREE.RepeatWrapping;
    ceilingTex.repeat.set(3, 4);

    const ceilingGeo = new THREE.PlaneGeometry(16, 24);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTex,
      roughness: 0.75,
      color: 0xfdfdfd,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(0, 3.8, -1);
    roomGroup.add(ceilingMesh);

    // 3. Recessed Ceiling LED Troffers (Warm 4000K Clean Lighting)
    const trofferGeo = new THREE.BoxGeometry(0.85, 0.04, 2.2);
    const trofferMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffaf0,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    const trofferPositions = [
      [-1.8, 3.78, 2.8],
      [1.8, 3.78, 2.8],
      [-1.8, 3.78, 0.2],
      [1.8, 3.78, 0.2],
      [-1.8, 3.78, -2.5],
      [1.8, 3.78, -2.5],
    ];
    trofferPositions.forEach((pos) => {
      const troffer = new THREE.Mesh(trofferGeo, trofferMat);
      troffer.position.set(pos[0], pos[1], pos[2]);
      roomGroup.add(troffer);
    });

    // 4. Back Wall (Z = -4.2): Modern Clinic Wall with Consultation Doors
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf6faf8,
      roughness: 0.55,
    });
    const backWallGeo = new THREE.PlaneGeometry(16, 4.0);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 1.9, -4.2);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Wall Baseboard (Navy #1B2F59)
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
    });
    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.12, 0.04),
      baseboardMat,
    );
    baseboard.position.set(0, 0.06, -4.18);
    roomGroup.add(baseboard);

    // Modern Consultation Room Door (Architectural 3D Frame & Slab)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0.6, 0, -4.18);

    const doorTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
    });
    const doorTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.7, 0.06),
      doorTrimMat,
    );
    doorTrim.position.set(0, 1.35, 0);
    doorGroup.add(doorTrim);

    const doorSlabMat = new THREE.MeshStandardMaterial({
      color: 0x223c68,
      roughness: 0.4,
    });
    const doorSlab = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 2.55, 0.05),
      doorSlabMat,
    );
    doorSlab.position.set(0, 1.3, 0.02);
    doorGroup.add(doorSlab);

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.9,
      roughness: 0.15,
    });
    const handleBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.024, 0.05),
      handleMat,
    );
    handleBar.position.set(-0.48, 1.15, 0.06);
    doorGroup.add(handleBar);

    // Backlit "CONSULTATION ROOMS" Sign Above Door
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1b2f59, roughness: 0.3 }),
    );
    signBox.position.set(0, 2.85, 0.02);
    doorGroup.add(signBox);

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext("2d");
    sCtx.fillStyle = "#1B2F59";
    sCtx.fillRect(0, 0, 512, 110);
    sCtx.fillStyle = "#D1F0E7";
    sCtx.font = "bold 32px Poppins, sans-serif";
    sCtx.textAlign = "center";
    sCtx.fillText("CONSULTATION ROOMS", 256, 68);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.36, 0.28),
      new THREE.MeshBasicMaterial({ map: signTex }),
    );
    signFace.position.set(0, 2.85, 0.05);
    doorGroup.add(signFace);

    roomGroup.add(doorGroup);

    // Left Wall (Behind Medicine Shelves)
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 4.0), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-5.0, 1.9, -1.0);
    roomGroup.add(leftWall);

    scene.add(roomGroup);
  }

  // ==========================================================================
  // 4. RIGHT WALL: ARCHITECTURAL GALLERY WALL & GARDEN COURTYARD WINDOWS
  // ==========================================================================
  function buildWindowCourtyard() {
    windowGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // 1. Architectural Gallery Accent Wall (Z = -4.2 to +0.8) where Category Board mounts
    const galleryWallMat = new THREE.MeshStandardMaterial({
      color: 0xebf7f3,
      roughness: 0.45,
      metalness: 0.02,
    });
    const galleryWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 3.8, 5.0),
      galleryWallMat,
    );
    galleryWall.position.set(5.0, 1.9, -1.7);
    galleryWall.receiveShadow = true;
    windowGroup.add(galleryWall);

    // Recessed LED architectural glow trim along gallery wall
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x35c99a });
    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 5.0),
      trimMat,
    );
    topTrim.position.set(4.9, 3.75, -1.7);
    windowGroup.add(topTrim);

    const botTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 5.0),
      trimMat,
    );
    botTrim.position.set(4.9, 0.05, -1.7);
    windowGroup.add(botTrim);

    // 2. Window Wall Section (Z = +0.8 to +4.5) Opening to Medical Courtyard Garden
    const outdoorTex = textureLoader.load("images/pharmacy_window_view.jpg");
    outdoorTex.wrapS = THREE.ClampToEdgeWrapping;
    outdoorTex.wrapT = THREE.ClampToEdgeWrapping;

    const outdoorGeo = new THREE.PlaneGeometry(12, 4.8);
    const outdoorMat = new THREE.MeshBasicMaterial({ map: outdoorTex });
    const outdoorMesh = new THREE.Mesh(outdoorGeo, outdoorMat);
    outdoorMesh.rotation.y = -Math.PI / 2;
    outdoorMesh.position.set(6.2, 2.0, 2.6);
    windowGroup.add(outdoorMesh);

    // Aluminum Frame & Glass Panes
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
      metalness: 0.65,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xe5f8f3,
      transparent: true,
      opacity: 0.2,
      roughness: 0.06,
      metalness: 0.85,
    });

    const windowZPositions = [1.5, 2.7, 3.9];
    windowZPositions.forEach((z) => {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 3.5),
        glassMat,
      );
      glass.rotation.y = -Math.PI / 2;
      glass.position.set(5.0, 1.85, z);
      windowGroup.add(glass);

      const topMull = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 1.2),
        frameMat,
      );
      topMull.position.set(5.0, 3.6, z);
      windowGroup.add(topMull);

      const botMull = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 1.2),
        frameMat,
      );
      botMull.position.set(5.0, 0.1, z);
      windowGroup.add(botMull);

      const sideMull = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 3.5, 0.06),
        frameMat,
      );
      sideMull.position.set(5.0, 1.85, z - 0.58);
      windowGroup.add(sideMull);
    });

    scene.add(windowGroup);
  }

  // ==========================================================================
  // 5. HIGH-REALISM PHARMACEUTICAL ASSETS (Geometries, Textures & Multi-Materials)
  // ==========================================================================
  function initPharmaAssets() {
    if (pharmaGeos && pharmaMats) return;

    pharmaGeos = {
      boxStd: new THREE.BoxGeometry(0.12, 0.085, 0.04),
      boxTall: new THREE.BoxGeometry(0.085, 0.12, 0.035),
      boxSmall: new THREE.BoxGeometry(0.09, 0.065, 0.028),
      boxSlim: new THREE.BoxGeometry(0.155, 0.05, 0.035),
      bottleBody: new THREE.CylinderGeometry(0.032, 0.032, 0.1, 16),
      bottleNeck: new THREE.CylinderGeometry(0.015, 0.02, 0.025, 14),
      bottleCap: new THREE.CylinderGeometry(0.019, 0.019, 0.022, 16),
      measuringCup: new THREE.CylinderGeometry(
        0.023,
        0.019,
        0.028,
        14,
        1,
        true,
      ),
      jarBody: new THREE.CylinderGeometry(0.038, 0.038, 0.11, 18),
      jarCap: new THREE.CylinderGeometry(0.04, 0.04, 0.022, 18),
      blisterCard: new THREE.BoxGeometry(0.075, 0.115, 0.003),
      blisterStand: new THREE.BoxGeometry(0.085, 0.02, 0.06),
      blisterDome: new THREE.SphereGeometry(
        0.0075,
        8,
        6,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      pill: new THREE.CylinderGeometry(0.006, 0.006, 0.003, 10),
    };

    // Helper: Procedural canvas label texture generator for cartons
    function makeBoxTex(opts) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 340;
      const ctx = c.getContext("2d");

      // Clinical clean white backing
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 512, 340);

      // Fine clinical grid watermark
      ctx.strokeStyle = "rgba(209, 240, 231, 0.35)";
      ctx.lineWidth = 1;
      for (let y = 0; y < 340; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Top theme header band
      ctx.fillStyle = opts.color;
      ctx.fillRect(0, 0, 512, 54);

      // Rx / OTC Badge
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(14, 11, 48, 32, 6);
      ctx.fill();
      ctx.fillStyle = opts.color;
      ctx.font = "bold 18px Poppins, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(opts.rxType || "Rx", 38, 34);

      // Network Certification banner text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 13px Poppins, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Rx Medo Card Certified Network • Batch Traceable", 72, 33);

      // Generic Drug Name (Readable, bold, authentic)
      ctx.fillStyle = "#1B2F59";
      ctx.font = "bold 22px Poppins, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(opts.title, 18, 96);

      // Dosage pill badge
      ctx.fillStyle = opts.color;
      ctx.beginPath();
      ctx.roundRect(18, 112, 110, 36, 18);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 19px Poppins, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(opts.strength, 73, 137);

      // Dosage Form text
      ctx.fillStyle = "#2C3E50";
      ctx.font = "600 14px Poppins, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(opts.form, 140, 136);

      // Therapeutic category subtitle
      ctx.fillStyle = "#576574";
      ctx.font = "500 12px Poppins, sans-serif";
      ctx.fillText(opts.sub, 18, 178);

      // Divider line
      ctx.strokeStyle = "rgba(27, 47, 89, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 196);
      ctx.lineTo(494, 196);
      ctx.stroke();

      // Clinical warnings
      ctx.fillStyle = "#8395a7";
      ctx.font = "400 10px Poppins, sans-serif";
      ctx.fillText(
        "Store protected from moisture at temperature not exceeding 25°C.",
        18,
        218,
      );
      ctx.fillText(
        "Generic Pharmaceutical Formulation • Verified Quality Standards",
        18,
        234,
      );

      // Holographic Authenticity Seal Simulation
      const holo = ctx.createLinearGradient(18, 252, 68, 302);
      holo.addColorStop(0, "#c7ecee");
      holo.addColorStop(0.5, "#dfe6e9");
      holo.addColorStop(1, "#a8e5d5");
      ctx.fillStyle = holo;
      ctx.beginPath();
      ctx.roundRect(18, 252, 48, 48, 8);
      ctx.fill();
      ctx.fillStyle = "#1B2F59";
      ctx.font = "bold 10px Poppins, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GENUINE", 42, 274);
      ctx.fillText("★ RX ★", 42, 290);

      // Barcode
      ctx.fillStyle = "#111111";
      const bx = 82,
        by = 252;
      const bBars = [
        2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1,
        2,
      ];
      let cx = bx;
      bBars.forEach((w, i) => {
        if (i % 2 === 0) ctx.fillRect(cx, by, w * 2.2, 34);
        cx += w * 2.2 + 2;
      });
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("8 904123 589412", bx + 80, by + 46);

      // Batch & Expiry Stamp
      ctx.fillStyle = "#2d3436";
      ctx.font = "500 11px Poppins, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("B.No: " + (opts.batch || "RX-9941"), 494, 268);
      ctx.fillText("MFG: 01/2025 • EXP: 12/2027", 494, 286);
      ctx.fillText("M.R.P. ₹" + (opts.mrp || "118.00"), 494, 304);

      // Side trim accents
      ctx.fillStyle = opts.color;
      ctx.fillRect(0, 0, 5, 340);
      ctx.fillRect(507, 0, 5, 340);

      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    }

    // Helper: Create 6-face materials for box
    function makeBoxMats(opts) {
      const frontTex = makeBoxTex(opts);

      const sideC = document.createElement("canvas");
      sideC.width = 128;
      sideC.height = 256;
      const sctx = sideC.getContext("2d");
      sctx.fillStyle = "#FFFFFF";
      sctx.fillRect(0, 0, 128, 256);
      sctx.fillStyle = opts.color;
      sctx.fillRect(0, 0, 128, 32);
      sctx.fillStyle = "#1B2F59";
      sctx.font = "bold 13px Poppins, sans-serif";
      sctx.fillText(opts.title.split(" ")[0], 10, 60);
      sctx.fillStyle = opts.color;
      sctx.fillText(opts.strength, 10, 80);
      sctx.fillStyle = "#8395a7";
      sctx.font = "10px monospace";
      sctx.fillText("EXP 12/2027", 10, 110);
      const sideTex = new THREE.CanvasTexture(sideC);

      const topC = document.createElement("canvas");
      topC.width = 256;
      topC.height = 128;
      const tctx = topC.getContext("2d");
      tctx.fillStyle = "#FFFFFF";
      tctx.fillRect(0, 0, 256, 128);
      tctx.fillStyle = opts.color;
      tctx.fillRect(0, 0, 256, 18);
      tctx.fillStyle = "#F7C43D";
      tctx.fillRect(98, 44, 60, 40);
      tctx.fillStyle = "#1B2F59";
      tctx.font = "bold 9px Poppins, sans-serif";
      tctx.textAlign = "center";
      tctx.fillText("SEALED", 128, 68);
      const topTex = new THREE.CanvasTexture(topC);

      const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.35,
      });
      const frontMat = new THREE.MeshStandardMaterial({
        map: frontTex,
        roughness: 0.28,
        metalness: 0.05,
      });
      const sideMat = new THREE.MeshStandardMaterial({
        map: sideTex,
        roughness: 0.32,
        metalness: 0.02,
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.32,
        metalness: 0.02,
      });

      return [sideMat, sideMat, topMat, whiteMat, frontMat, whiteMat];
    }

    // Helper: Syrup Label Canvas Texture
    function makeSyrupTex() {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 512, 256);

      ctx.fillStyle = "#35C99A";
      ctx.fillRect(0, 0, 512, 40);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 15px Poppins, sans-serif";
      ctx.fillText("Rx Medo Care • Pediatric Oral Suspension", 20, 26);

      ctx.strokeStyle = "#1B2F59";
      ctx.fillStyle = "#1B2F59";
      ctx.lineWidth = 1.5;
      const ticks = ["100ml", "80ml", "60ml", "40ml", "20ml", "10ml", "5ml"];
      ticks.forEach((tk, idx) => {
        const y = 55 + idx * 26;
        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(55, y);
        ctx.stroke();
        ctx.font = "bold 11px Poppins, sans-serif";
        ctx.fillText(tk, 60, y + 4);
      });

      ctx.font = "bold 20px Poppins, sans-serif";
      ctx.fillStyle = "#1B2F59";
      ctx.fillText("BRONCHIAL & COUGH SYRUP", 140, 85);

      ctx.fillStyle = "#7CC4E8";
      ctx.beginPath();
      ctx.roundRect(140, 100, 120, 28, 14);
      ctx.fill();
      ctx.fillStyle = "#1B2F59";
      ctx.font = "bold 14px Poppins, sans-serif";
      ctx.fillText("100 ml Net", 165, 120);

      ctx.fillStyle = "#576574";
      ctx.font = "12px Poppins, sans-serif";
      ctx.fillText("Menthol & Honey Formula • Non-Drowsy", 140, 150);
      ctx.fillText("Each 5ml contains generic active extract IP", 140, 170);

      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 10px Poppins, sans-serif";
      ctx.fillText("SHAKE WELL BEFORE USE • STORE IN COOL PLACE", 140, 200);

      ctx.fillStyle = "#111111";
      ctx.fillRect(400, 70, 90, 80);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "9px monospace";
      ctx.fillText("|||| ||| ||||", 410, 110);

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      return tex;
    }

    // Helper: Jar Canister Label Canvas Texture
    function makeJarTex(title, subtitle, color) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#1B2F59";
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = "#F7C43D";
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 488, 232);

      ctx.fillStyle = color || "#35C99A";
      ctx.fillRect(16, 16, 480, 24);

      ctx.fillStyle = "#F7C43D";
      ctx.fillRect(40, 60, 8, 24);
      ctx.fillRect(32, 68, 24, 8);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px Poppins, sans-serif";
      ctx.fillText(title, 75, 82);

      ctx.fillStyle = "#F7C43D";
      ctx.font = "600 14px Poppins, sans-serif";
      ctx.fillText(subtitle, 75, 110);

      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(75, 130, 390, 75);
      ctx.fillStyle = "#D1F0E7";
      ctx.font = "11px Poppins, sans-serif";
      ctx.fillText(
        "Active Formulations IP: High Bioavailability Standard",
        90,
        152,
      );
      ctx.fillText(
        "• 60 Dietary Veggie Capsules • 100% Quality Assured",
        90,
        172,
      );
      ctx.fillText("• Certified Good Manufacturing Practice (GMP)", 90, 192);

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      return tex;
    }

    // Helper: Blister Foil Texture
    function makeBlisterTex() {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 384;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#e4e8ed";
      ctx.fillRect(0, 0, 256, 384);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 256; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 384);
        ctx.stroke();
      }
      for (let y = 0; y < 384; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#228b55";
      ctx.font = "bold 12px monospace";
      for (let r = 0; r < 5; r++) {
        const y = 40 + r * 72;
        ctx.fillText("PARACETAMOL IP 500mg", 18, y);
        ctx.fillStyle = "#1B2F59";
        ctx.font = "9px monospace";
        ctx.fillText("B.No: RX-2025 • EXP: 12/2027", 18, y + 15);
        ctx.fillStyle = "#228b55";
        ctx.font = "bold 12px monospace";
      }

      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      return tex;
    }

    // Pre-create shared materials for all product lines
    pharmaMats = {
      boxParacetamol: makeBoxMats({
        color: "#35C99A",
        title: "PARACETAMOL TABLETS IP",
        strength: "500 mg",
        form: "10 x 10 Film-Coated Tablets",
        sub: "Analgesic & Antipyretic • Fast Action",
        rxType: "Rx",
        batch: "RX-9412",
        mrp: "115.00",
      }),
      boxAmoxicillin: makeBoxMats({
        color: "#1B2F59",
        title: "AMOXICILLIN & CLAVULANATE",
        strength: "625 mg",
        form: "10 Tablets per Strip",
        sub: "Broad Spectrum Antibacterial Formula",
        rxType: "Rx",
        batch: "RX-7721",
        mrp: "185.00",
      }),
      boxIbuprofen: makeBoxMats({
        color: "#F7C43D",
        title: "IBUPROFEN CAPSULES IP",
        strength: "400 mg",
        form: "10 Liquid Softgel Capsules",
        sub: "Anti-Inflammatory & Muscle Pain Relief",
        rxType: "OTC",
        batch: "RX-3814",
        mrp: "92.00",
      }),
      boxCetirizine: makeBoxMats({
        color: "#7CC4E8",
        title: "CETIRIZINE HYDROCHLORIDE",
        strength: "10 mg",
        form: "10 Film-Coated Tablets",
        sub: "24-Hour Non-Drowsy Anti-Allergy",
        rxType: "OTC",
        batch: "RX-5529",
        mrp: "68.00",
      }),
      boxOmeprazole: makeBoxMats({
        color: "#6C5CE7",
        title: "OMEPRAZOLE DELAYED-RELEASE",
        strength: "20 mg",
        form: "14 Hard Gelatin Capsules",
        sub: "Gastro-Resistant Acid Reducer",
        rxType: "Rx",
        batch: "RX-1108",
        mrp: "142.00",
      }),
      boxAzithromycin: makeBoxMats({
        color: "#00B894",
        title: "AZITHROMYCIN TABLETS USP",
        strength: "500 mg",
        form: "3 Tablets Single-Course",
        sub: "Respiratory Anti-Infective Formula",
        rxType: "Rx",
        batch: "RX-8840",
        mrp: "124.00",
      }),
      boxDermatology: makeBoxMats({
        color: "#E17055",
        title: "HYDROCORTISONE CREAM 1%",
        strength: "30 g",
        form: "Topical Dermatological Cream",
        sub: "Anti-Pruritic & Skin Soothing Ointment",
        rxType: "Rx",
        batch: "RX-4320",
        mrp: "89.00",
      }),

      amberGlass: new THREE.MeshStandardMaterial({
        color: 0x3d1c02,
        roughness: 0.12,
        metalness: 0.18,
      }),
      whiteCap: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
      }),
      measuringCup: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        roughness: 0.15,
      }),
      syrupLabel: new THREE.MeshStandardMaterial({
        map: makeSyrupTex(),
        roughness: 0.32,
        metalness: 0.02,
      }),

      jarNavy: new THREE.MeshStandardMaterial({
        color: 0x1b2f59,
        roughness: 0.25,
      }),
      jarWhite: new THREE.MeshStandardMaterial({
        color: 0xfcfcfc,
        roughness: 0.22,
      }),
      jarGoldCap: new THREE.MeshStandardMaterial({
        color: 0xf7c43d,
        metalness: 0.85,
        roughness: 0.25,
      }),
      jarLabelMultivitamin: new THREE.MeshStandardMaterial({
        map: makeJarTex(
          "DAILY MULTIVITAMIN",
          "Vitality & Immunity Formula",
          "#F7C43D",
        ),
        roughness: 0.3,
        metalness: 0.1,
      }),
      jarLabelOmega: new THREE.MeshStandardMaterial({
        map: makeJarTex(
          "OMEGA-3 FISH OIL 1000mg",
          "Triple Strength EPA & DHA",
          "#7CC4E8",
        ),
        roughness: 0.3,
        metalness: 0.1,
      }),

      blisterFoil: new THREE.MeshStandardMaterial({
        map: makeBlisterTex(),
        metalness: 0.88,
        roughness: 0.18,
      }),
      blisterBubble: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.08,
      }),
      blisterPillWhite: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
      }),
      blisterPillMint: new THREE.MeshStandardMaterial({
        color: 0xd1f0e7,
        roughness: 0.4,
      }),
      blisterStand: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        roughness: 0.1,
      }),
    };
  }

  // Helper Functions to Spawn Shelf Products (Zero Shadow Draw Calls for 60fps WebGL)
  function spawnBox(matKey, geoKey, x, y, z) {
    const mesh = new THREE.Mesh(
      pharmaGeos[geoKey || "boxStd"],
      pharmaMats[matKey],
    );
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  function spawnSyrupBottle(x, y, z) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const body = new THREE.Mesh(pharmaGeos.bottleBody, pharmaMats.amberGlass);
    body.position.set(0, 0.05, 0);
    grp.add(body);

    const labelGeo = new THREE.CylinderGeometry(
      0.0324,
      0.0324,
      0.075,
      16,
      1,
      true,
    );
    const label = new THREE.Mesh(labelGeo, pharmaMats.syrupLabel);
    label.rotation.y = Math.PI / 2;
    label.position.set(0, 0.05, 0);
    grp.add(label);

    const neck = new THREE.Mesh(pharmaGeos.bottleNeck, pharmaMats.amberGlass);
    neck.position.set(0, 0.112, 0);
    grp.add(neck);

    const cap = new THREE.Mesh(pharmaGeos.bottleCap, pharmaMats.whiteCap);
    cap.position.set(0, 0.135, 0);
    grp.add(cap);

    const cup = new THREE.Mesh(
      pharmaGeos.measuringCup,
      pharmaMats.measuringCup,
    );
    cup.rotation.x = Math.PI;
    cup.position.set(0, 0.155, 0);
    grp.add(cup);

    return grp;
  }

  function spawnJar(labelMatKey, capMatKey, isNavy, x, y, z) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const body = new THREE.Mesh(
      pharmaGeos.jarBody,
      isNavy ? pharmaMats.jarNavy : pharmaMats.jarWhite,
    );
    body.position.set(0, 0.055, 0);
    grp.add(body);

    const labelGeo = new THREE.CylinderGeometry(
      0.0384,
      0.0384,
      0.082,
      18,
      1,
      true,
    );
    const label = new THREE.Mesh(
      labelGeo,
      pharmaMats[labelMatKey || "jarLabelMultivitamin"],
    );
    label.rotation.y = Math.PI / 2;
    label.position.set(0, 0.055, 0);
    grp.add(label);

    const cap = new THREE.Mesh(
      pharmaGeos.jarCap,
      pharmaMats[capMatKey || "jarGoldCap"],
    );
    cap.position.set(0, 0.12, 0);
    grp.add(cap);

    return grp;
  }

  function spawnBlisterDisplay(isMint, x, y, z) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    // Clear acrylic tray stand
    const stand = new THREE.Mesh(
      pharmaGeos.blisterStand,
      pharmaMats.blisterStand,
    );
    stand.position.set(0, 0.01, 0);
    grp.add(stand);

    // Blister card standing tilted back
    const cardGrp = new THREE.Group();
    cardGrp.position.set(0, 0.065, 0);
    cardGrp.rotation.y = Math.PI / 2;
    cardGrp.rotation.z = -0.16;

    const card = new THREE.Mesh(pharmaGeos.blisterCard, pharmaMats.blisterFoil);
    cardGrp.add(card);

    // 10 thermoformed pill bubbles in 2x5 grid
    const pillMat = isMint
      ? pharmaMats.blisterPillMint
      : pharmaMats.blisterPillWhite;
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 5; row++) {
        const bx = col === 0 ? -0.02 : 0.02;
        const by = -0.04 + row * 0.02;

        const bubble = new THREE.Mesh(
          pharmaGeos.blisterDome,
          pharmaMats.blisterBubble,
        );
        bubble.rotation.x = Math.PI / 2;
        bubble.position.set(bx, by, 0.003);
        cardGrp.add(bubble);

        const pill = new THREE.Mesh(pharmaGeos.pill, pillMat);
        pill.rotation.x = Math.PI / 2;
        pill.position.set(bx, by, 0.003);
        cardGrp.add(pill);
      }
    }

    grp.add(cardGrp);
    return grp;
  }

  // ==========================================================================
  // 6. MEDICINE SHELVES (Filled with Authentic Generic Medicines & Strip Lighting)
  // ==========================================================================
  function buildMedicineShelves() {
    shelvesGroup = new THREE.Group();

    const mintShelfMat = new THREE.MeshStandardMaterial({
      color: 0xd1f0e7,
      roughness: 0.32,
    });
    const whiteBackMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
    });
    const navyHeaderMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
    });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff6dd,
      emissiveIntensity: 1.1,
      roughness: 0.1,
    });

    const bays = [
      { z: -3.0, title: "PRESCRIPTION MEDICINES & COLD CHAIN" },
      { z: -1.3, title: "OVER-THE-COUNTER & DAILY CARE" },
      { z: 0.4, title: "WELLNESS, VITAMINS & HERBAL AYURVEDA" },
      { z: 2.1, title: "PERSONAL HYGIENE & MEDICAL SUPPLIES" },
    ];

    bays.forEach((bay, bIdx) => {
      const bayGroup = new THREE.Group();
      bayGroup.position.set(-4.72, 0, bay.z);

      // Backing Panel
      const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 3.4, 1.6),
        whiteBackMat,
      );
      backPanel.position.set(0, 1.7, 0);
      backPanel.receiveShadow = true;
      bayGroup.add(backPanel);

      // Uprights
      const uprightLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 3.4, 0.05),
        mintShelfMat,
      );
      uprightLeft.position.set(0.2, 1.7, -0.78);
      uprightLeft.castShadow = true;
      bayGroup.add(uprightLeft);

      const uprightRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 3.4, 0.05),
        mintShelfMat,
      );
      uprightRight.position.set(0.2, 1.7, 0.78);
      uprightRight.castShadow = true;
      bayGroup.add(uprightRight);

      // Category Header Board
      const headerBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.32, 1.6),
        navyHeaderMat,
      );
      headerBox.position.set(0.2, 3.25, 0);
      bayGroup.add(headerBox);

      const hCanvas = document.createElement("canvas");
      hCanvas.width = 512;
      hCanvas.height = 96;
      const hCtx = hCanvas.getContext("2d");
      hCtx.fillStyle = "#1B2F59";
      hCtx.fillRect(0, 0, 512, 96);
      hCtx.fillStyle = "#D1F0E7";
      hCtx.font = "bold 22px Poppins, sans-serif";
      hCtx.textAlign = "center";
      hCtx.fillText(bay.title, 256, 58);

      const hTex = new THREE.CanvasTexture(hCanvas);
      const hLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.56, 0.28),
        new THREE.MeshBasicMaterial({ map: hTex }),
      );
      hLabel.rotation.y = Math.PI / 2;
      hLabel.position.set(0.425, 3.25, 0);
      bayGroup.add(hLabel);

      // 6 Shelves per Bay
      const shelfHeights = [0.45, 0.95, 1.45, 1.95, 2.45, 2.95];
      shelfHeights.forEach((shY, sIdx) => {
        // Shelf Plank (Top surface is at shY + 0.02)
        const shelfPlank = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.04, 1.52),
          mintShelfMat,
        );
        shelfPlank.position.set(0.2, shY, 0);
        shelfPlank.castShadow = true;
        shelfPlank.receiveShadow = true;
        bayGroup.add(shelfPlank);

        // LED Strip Under Shelf
        if (shY > 0.45) {
          const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.015, 1.48),
            ledMat,
          );
          ledStrip.position.set(0.36, shY - 0.025, 0);
          bayGroup.add(ledStrip);
        }

        // Shelf Front Pricing Rail
        const railMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.2,
        });
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.01, 0.035, 1.52),
          railMat,
        );
        rail.position.set(0.405, shY, 0);
        bayGroup.add(rail);

        // Exact Surface Height
        const surfaceY = shY + 0.02;

        // POPULATE WITH REALISTIC PHARMACY INVENTORY ROWS
        if (bIdx === 0) {
          // ================= BAY 0: PRESCRIPTION MEDICINES & COLD CHAIN =================
          if (sIdx === 0) {
            // Cold chain bottles row
            for (let i = -0.55; i <= 0.55; i += 0.18) {
              bayGroup.add(spawnSyrupBottle(0.22, surfaceY, i));
            }
          } else if (sIdx === 1) {
            // Amoxicillin 625mg & Paracetamol 500mg rows
            for (let i = -0.58; i <= -0.15; i += 0.14) {
              bayGroup.add(
                spawnBox(
                  "boxAmoxicillin",
                  "boxStd",
                  0.22,
                  surfaceY + 0.0425,
                  i,
                ),
              );
              bayGroup.add(
                spawnBox(
                  "boxAmoxicillin",
                  "boxStd",
                  0.12,
                  surfaceY + 0.0425,
                  i,
                ),
              ); // Depth row
            }
            for (let i = 0.05; i <= 0.58; i += 0.14) {
              bayGroup.add(
                spawnBox(
                  "boxParacetamol",
                  "boxStd",
                  0.22,
                  surfaceY + 0.0425,
                  i,
                ),
              );
              bayGroup.add(
                spawnBox(
                  "boxParacetamol",
                  "boxStd",
                  0.12,
                  surfaceY + 0.0425,
                  i,
                ),
              );
            }
          } else if (sIdx === 2) {
            // Eye-Level: Paracetamol + Blister Pack Displays + Omeprazole
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.56,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.42,
              ),
            );
            bayGroup.add(spawnBlisterDisplay(true, 0.22, surfaceY, -0.22));
            bayGroup.add(spawnBlisterDisplay(false, 0.22, surfaceY, -0.06));
            bayGroup.add(
              spawnBox(
                "boxOmeprazole",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.14,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxOmeprazole",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.28,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxOmeprazole",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.42,
              ),
            );
            bayGroup.add(spawnBlisterDisplay(true, 0.22, surfaceY, 0.58));
          } else if (sIdx === 3) {
            // Eye-Level: Azithromycin tall cartons + Cetirizine
            for (let i = -0.56; i <= -0.16; i += 0.1) {
              bayGroup.add(
                spawnBox(
                  "boxAzithromycin",
                  "boxTall",
                  0.22,
                  surfaceY + 0.06,
                  i,
                ),
              );
            }
            bayGroup.add(spawnBlisterDisplay(false, 0.22, surfaceY, 0.0));
            for (let i = 0.16; i <= 0.58; i += 0.1) {
              bayGroup.add(
                spawnBox(
                  "boxCetirizine",
                  "boxSmall",
                  0.22,
                  surfaceY + 0.0325,
                  i,
                ),
              );
              bayGroup.add(
                spawnBox(
                  "boxCetirizine",
                  "boxSmall",
                  0.12,
                  surfaceY + 0.0325,
                  i,
                ),
              );
            }
          } else if (sIdx === 4) {
            // Upper shelf: Mixed prescription cartons
            for (let i = -0.58; i <= 0.58; i += 0.14) {
              const k =
                Math.abs(Math.sin(i * 10)) > 0.5
                  ? "boxAmoxicillin"
                  : "boxParacetamol";
              bayGroup.add(spawnBox(k, "boxStd", 0.22, surfaceY + 0.0425, i));
            }
          } else {
            // Top shelf: Backup stock cartons
            for (let i = -0.54; i <= 0.54; i += 0.15) {
              bayGroup.add(
                spawnBox("boxOmeprazole", "boxStd", 0.2, surfaceY + 0.0425, i),
              );
            }
          }
        } else if (bIdx === 1) {
          // ================= BAY 1: OVER-THE-COUNTER & DAILY CARE =================
          if (sIdx === 0 || sIdx === 1) {
            // Pediatric cough syrups with measuring cups
            for (let i = -0.56; i <= 0.56; i += 0.15) {
              bayGroup.add(spawnSyrupBottle(0.22, surfaceY, i));
            }
          } else if (sIdx === 2) {
            // Ibuprofen softgels + Blister pack display + Cetirizine
            bayGroup.add(
              spawnBox(
                "boxIbuprofen",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.56,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxIbuprofen",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.42,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxIbuprofen",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.28,
              ),
            );
            bayGroup.add(spawnBlisterDisplay(false, 0.22, surfaceY, -0.1));
            bayGroup.add(spawnBlisterDisplay(true, 0.22, surfaceY, 0.06));
            bayGroup.add(
              spawnBox(
                "boxCetirizine",
                "boxSmall",
                0.22,
                surfaceY + 0.0325,
                0.24,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxCetirizine",
                "boxSmall",
                0.22,
                surfaceY + 0.0325,
                0.36,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxCetirizine",
                "boxSmall",
                0.22,
                surfaceY + 0.0325,
                0.48,
              ),
            );
          } else if (sIdx === 3) {
            // Rows of Ibuprofen + Syrup bottles
            bayGroup.add(
              spawnBox(
                "boxIbuprofen",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.56,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxIbuprofen",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                -0.42,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxIbuprofen",
                "boxStd",
                0.12,
                surfaceY + 0.0425,
                -0.42,
              ),
            );
            bayGroup.add(spawnSyrupBottle(0.22, surfaceY, -0.16));
            bayGroup.add(spawnSyrupBottle(0.22, surfaceY, -0.02));
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.2,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.34,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.48,
              ),
            );
          } else {
            // Upper & top shelf: OTC pain and fever boxes
            for (let i = -0.56; i <= 0.56; i += 0.14) {
              bayGroup.add(
                spawnBox("boxIbuprofen", "boxStd", 0.2, surfaceY + 0.0425, i),
              );
            }
          }
        } else if (bIdx === 2) {
          // ================= BAY 2: WELLNESS, VITAMINS & HERBAL AYURVEDA =================
          if (sIdx === 0 || sIdx === 1) {
            // Supplement jars (Multivitamin & Omega-3)
            for (let i = -0.55; i <= 0.55; i += 0.15) {
              const isOmega = i > 0;
              bayGroup.add(
                spawnJar(
                  isOmega ? "jarLabelOmega" : "jarLabelMultivitamin",
                  "jarGoldCap",
                  isOmega,
                  0.22,
                  surfaceY,
                  i,
                ),
              );
            }
          } else if (sIdx === 2) {
            // Eye-Level: Mixed Jars + Daily Care Cartons
            bayGroup.add(
              spawnJar(
                "jarLabelMultivitamin",
                "jarGoldCap",
                false,
                0.22,
                surfaceY,
                -0.54,
              ),
            );
            bayGroup.add(
              spawnJar(
                "jarLabelMultivitamin",
                "jarGoldCap",
                false,
                0.22,
                surfaceY,
                -0.38,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxCetirizine",
                "boxSmall",
                0.22,
                surfaceY + 0.0325,
                -0.18,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxCetirizine",
                "boxSmall",
                0.22,
                surfaceY + 0.0325,
                -0.06,
              ),
            );
            bayGroup.add(
              spawnJar(
                "jarLabelOmega",
                "jarGoldCap",
                true,
                0.22,
                surfaceY,
                0.14,
              ),
            );
            bayGroup.add(
              spawnJar(
                "jarLabelOmega",
                "jarGoldCap",
                true,
                0.22,
                surfaceY,
                0.3,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.5,
              ),
            );
          } else if (sIdx === 3) {
            // Wellness bottles & canisters
            for (let i = -0.55; i <= 0.55; i += 0.16) {
              bayGroup.add(
                spawnJar(
                  "jarLabelMultivitamin",
                  "jarGoldCap",
                  false,
                  0.22,
                  surfaceY,
                  i,
                ),
              );
            }
          } else {
            // Upper tiers: Wellness cartons
            for (let i = -0.56; i <= 0.56; i += 0.14) {
              bayGroup.add(
                spawnBox(
                  "boxCetirizine",
                  "boxSmall",
                  0.2,
                  surfaceY + 0.0325,
                  i,
                ),
              );
            }
          }
        } else {
          // ================= BAY 3: PERSONAL HYGIENE & MEDICAL SUPPLIES =================
          if (sIdx === 0 || sIdx === 1) {
            // Antiseptic & skin solutions
            for (let i = -0.55; i <= 0.55; i += 0.16) {
              bayGroup.add(spawnSyrupBottle(0.22, surfaceY, i));
            }
          } else if (sIdx === 2) {
            // Dermatology Cream slender horizontal boxes + Gauze cartons
            bayGroup.add(
              spawnBox(
                "boxDermatology",
                "boxSlim",
                0.22,
                surfaceY + 0.025,
                -0.52,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxDermatology",
                "boxSlim",
                0.22,
                surfaceY + 0.025,
                -0.32,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxDermatology",
                "boxSlim",
                0.22,
                surfaceY + 0.025,
                -0.12,
              ),
            );
            bayGroup.add(spawnBlisterDisplay(false, 0.22, surfaceY, 0.1));
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.32,
              ),
            );
            bayGroup.add(
              spawnBox(
                "boxParacetamol",
                "boxStd",
                0.22,
                surfaceY + 0.0425,
                0.5,
              ),
            );
          } else {
            // Medical supplies & hygiene cartons
            for (let i = -0.54; i <= 0.54; i += 0.18) {
              bayGroup.add(
                spawnBox("boxDermatology", "boxSlim", 0.2, surfaceY + 0.025, i),
              );
            }
          }
        }
      });

      shelvesGroup.add(bayGroup);
    });

    scene.add(shelvesGroup);
  }

  // ==========================================================================
  // 7. RECEPTION COUNTER (With POS Terminal, Vitrine & Rx Medo Card Branding)
  // ==========================================================================
  function buildReceptionCounter() {
    counterGroup = new THREE.Group();
    counterGroup.position.set(-1.35, 0, 0.4);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
    });
    const navyBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.4,
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf7c43d,
      metalness: 0.8,
      roughness: 0.25,
    });

    // Main Counter Front (X: 2.5m, Y: 1.02m, Z: 0.65m)
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.02, 0.65),
      bodyMat,
    );
    counterBody.position.set(0, 0.51, 0);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    counterGroup.add(counterBody);

    // Navy Kickplate Base
    const kickplate = new THREE.Mesh(
      new THREE.BoxGeometry(2.52, 0.09, 0.67),
      navyBaseMat,
    );
    kickplate.position.set(0, 0.045, 0);
    counterGroup.add(kickplate);

    // Warm Gold Accent Trim Strip
    const goldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(2.52, 0.03, 0.67),
      goldAccentMat,
    );
    goldTrim.position.set(0, 0.94, 0);
    counterGroup.add(goldTrim);

    // Polished Quartz Countertop
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xfafefa,
      roughness: 0.12,
      metalness: 0.05,
    });
    const countertop = new THREE.Mesh(
      new THREE.BoxGeometry(2.62, 0.06, 0.76),
      topMat,
    );
    countertop.position.set(0, 1.05, 0);
    countertop.castShadow = true;
    countertop.receiveShadow = true;
    counterGroup.add(countertop);

    // Rx Medo Card Emblem on Counter Front Panel
    const emblemGroup = new THREE.Group();
    emblemGroup.position.set(0, 0.55, 0.33);

    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.3,
    });
    const plaque = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.015, 32),
      plaqueMat,
    );
    plaque.rotation.x = Math.PI / 2;
    emblemGroup.add(plaque);

    const crossMat = new THREE.MeshStandardMaterial({
      color: 0x35c99a,
      emissive: 0x35c99a,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.02),
      crossMat,
    );
    emblemGroup.add(crossV);
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 0.02),
      crossMat,
    );
    emblemGroup.add(crossH);

    counterGroup.add(emblemGroup);

    // Countertop POS Terminal
    const posGroup = new THREE.Group();
    posGroup.position.set(0.6, 1.08, -0.05);

    const posMat = new THREE.MeshStandardMaterial({
      color: 0x222a36,
      roughness: 0.35,
      metalness: 0.6,
    });
    const posBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.03, 20),
      posMat,
    );
    posBase.position.set(0, 0.015, 0);
    posGroup.add(posBase);

    const posPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.22, 16),
      posMat,
    );
    posPillar.position.set(0, 0.14, 0);
    posGroup.add(posPillar);

    const monitorBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.38, 0.03),
      posMat,
    );
    monitorBezel.position.set(0, 0.32, 0);
    monitorBezel.rotation.x = -0.15;
    posGroup.add(monitorBezel);

    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 512;
    screenCanvas.height = 340;
    const sCtx = screenCanvas.getContext("2d");
    sCtx.fillStyle = "#0f1f38";
    sCtx.fillRect(0, 0, 512, 340);
    sCtx.fillStyle = "#1B2F59";
    sCtx.fillRect(0, 0, 512, 45);
    sCtx.fillStyle = "#35C99A";
    sCtx.font = "bold 16px Poppins, sans-serif";
    sCtx.fillText("Rx Medo Card POS • Active Station #01", 20, 28);
    sCtx.fillStyle = "#7CC4E8";
    sCtx.font = "13px Poppins, sans-serif";
    sCtx.fillText("Prescription Verification: READY", 20, 75);
    sCtx.fillStyle = "#FFFFFF";
    sCtx.font = "12px Poppins, sans-serif";
    sCtx.fillText("• Amoxicillin 500mg — Batch #RX-9941 [In Stock]", 20, 110);
    sCtx.fillText("• Paracetamol 650mg — Batch #RX-4412 [In Stock]", 20, 140);
    sCtx.fillText("• Cetirizine 10mg — Batch #RX-2108 [In Stock]", 20, 170);
    sCtx.fillText("• Vitamin C 500mg Chewable [Verified]", 20, 200);
    sCtx.fillStyle = "rgba(53, 201, 154, 0.2)";
    sCtx.fillRect(20, 230, 472, 80);
    sCtx.strokeStyle = "#35C99A";
    sCtx.strokeRect(20, 230, 472, 80);
    sCtx.fillStyle = "#35C99A";
    sCtx.font = "bold 14px Poppins, sans-serif";
    sCtx.fillText("Member Discount: 20% APPLIED", 40, 265);
    sCtx.fillStyle = "#FFFFFF";
    sCtx.font = "12px Poppins, sans-serif";
    sCtx.fillText("Cold-Chain Safety Seal: VERIFIED & ACTIVE", 40, 290);

    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.54, 0.34),
      new THREE.MeshBasicMaterial({ map: screenTex }),
    );
    screenMesh.position.set(0, 0.32, 0.018);
    screenMesh.rotation.x = -0.15;
    posGroup.add(screenMesh);

    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.14), posMat);
    kb.position.set(0, 0.008, 0.22);
    posGroup.add(kb);

    counterGroup.add(posGroup);

    // Glass Prescription Showcase (Vitrine) on Left Side of Desk
    const glassShowcaseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      metalness: 0.85,
    });
    const vitrine = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.26, 0.38),
      glassShowcaseMat,
    );
    vitrine.position.set(-0.7, 1.2, 0);
    counterGroup.add(vitrine);

    // Inside Vitrine: Realistic sample blister packs
    const vitrineBlister1 = spawnBlisterDisplay(true, -0.82, 1.08, -0.05);
    counterGroup.add(vitrineBlister1);
    const vitrineBlister2 = spawnBlisterDisplay(false, -0.6, 1.08, -0.05);
    counterGroup.add(vitrineBlister2);

    // Countertop Authentic Medicines next to Pharmacist
    const deskBox = spawnBox("boxParacetamol", "boxStd", -0.16, 1.122, 0.15);
    deskBox.rotation.y = 0.35;
    counterGroup.add(deskBox);

    const deskSyrup = spawnSyrupBottle(0.02, 1.08, 0.16);
    counterGroup.add(deskSyrup);

    scene.add(counterGroup);
  }

  // ==========================================================================
  // 8. BROWSE BY MEDICINE CATEGORY WALL BOARD (Mounted on Right Wall)
  // ==========================================================================
  function buildCategorySignboard() {
    categoryBoardGroup = new THREE.Group();

    const boardCanvas = document.createElement("canvas");
    boardCanvas.width = 2048;
    boardCanvas.height = 1280;
    const ctx = boardCanvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 2048, 1280);

    ctx.strokeStyle = "rgba(209, 240, 231, 0.35)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 2048; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1280);
      ctx.stroke();
    }

    ctx.fillStyle = "#1B2F59";
    ctx.fillRect(0, 0, 2048, 190);

    ctx.fillStyle = "#35C99A";
    ctx.fillRect(0, 182, 2048, 8);

    ctx.fillStyle = "#F7C43D";
    ctx.fillRect(80, 65, 20, 60);
    ctx.fillRect(60, 85, 60, 20);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 50px Poppins, sans-serif";
    ctx.fillText("BROWSE BY MEDICINE CATEGORY", 165, 110);

    ctx.fillStyle = "#7CC4E8";
    ctx.font = "500 24px Poppins, sans-serif";
    ctx.fillText(
      "Rx Medo Card Verified Pharmaceutical Network • Save Up to 20% on Every Order",
      168,
      155,
    );

    const categories = [
      {
        title: "Prescription Medicines",
        desc: "Wide range of verified prescription medications at member discounted prices with batch traceability.",
        badge: "Verified Rx",
        color: "#35C99A",
        icon: "💊",
      },
      {
        title: "Over-the-Counter (OTC)",
        desc: "Pain relief, cold, flu, fever, antacids, and everyday first-line healthcare essentials ready on demand.",
        badge: "OTC Ready",
        color: "#7CC4E8",
        icon: "🛡️",
      },
      {
        title: "Health Supplements",
        desc: "Vitamins, minerals, omega-3 fatty acids, and wellness formulations for active daily vitality.",
        badge: "Wellness",
        color: "#F7C43D",
        icon: "✨",
      },
      {
        title: "Ayurvedic Products",
        desc: "Authentic herbal extracts and time-tested traditional formulations certified for organic purity.",
        badge: "Pure Herbal",
        color: "#2bb381",
        icon: "🌿",
      },
      {
        title: "Personal Care",
        desc: "Therapeutic skincare, dermatology lotions, oral care, and gentle mother & baby hygiene essentials.",
        badge: "Daily Care",
        color: "#00c9a7",
        icon: "💧",
      },
      {
        title: "Medical Supplies",
        desc: "Clinical bandages, digital thermometers, blood pressure monitors, pulse oximeters & clinic essentials.",
        badge: "Clinical Grade",
        color: "#e056fd",
        icon: "🩹",
      },
    ];

    const cardW = 600;
    const cardH = 460;
    const startX = 64;
    const startY = 240;
    const gapX = 48;
    const gapY = 50;

    categories.forEach((cat, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(27, 47, 89, 0.08)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 20);
      ctx.fill();
      ctx.shadowColor = "transparent";

      ctx.strokeStyle = "#D1F0E7";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = cat.color;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, 8, [20, 20, 0, 0]);
      ctx.fill();

      ctx.fillStyle = cat.color + "18";
      ctx.beginPath();
      ctx.arc(x + 56, y + 68, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cat.icon, x + 56, y + 78);

      ctx.fillStyle = cat.color + "22";
      ctx.beginPath();
      ctx.roundRect(x + cardW - 170, y + 44, 135, 34, 17);
      ctx.fill();
      ctx.fillStyle = "#1B2F59";
      ctx.font = "bold 16px Poppins, sans-serif";
      ctx.fillText(cat.badge, x + cardW - 102, y + 67);

      ctx.textAlign = "left";
      ctx.fillStyle = "#1B2F59";
      ctx.font = "bold 30px Poppins, sans-serif";
      ctx.fillText(cat.title, x + 34, y + 160);

      ctx.fillStyle = "#4a6185";
      ctx.font = "400 21px Poppins, sans-serif";
      wrapText(ctx, cat.desc, x + 34, y + 215, cardW - 68, 34);

      ctx.fillStyle = cat.color;
      ctx.font = "bold 20px Poppins, sans-serif";
      ctx.fillText("Available at Partner Pharmacies →", x + 34, y + cardH - 38);
    });

    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.anisotropy = 8;

    const boardWidth = 3.0;
    const boardHeight = 1.9;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
      metalness: 0.6,
    });
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, boardHeight + 0.1, boardWidth + 0.1),
      frameMat,
    );
    frameMesh.position.set(4.9, 1.7, -1.0);
    frameMesh.castShadow = true;
    categoryBoardGroup.add(frameMesh);

    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.35,
      metalness: 0.02,
    });
    const boardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(boardWidth, boardHeight),
      boardMat,
    );
    boardMesh.rotation.y = -Math.PI / 2;
    boardMesh.position.set(4.87, 1.7, -1.0);
    boardMesh.receiveShadow = true;
    categoryBoardGroup.add(boardMesh);

    const boltGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.06, 16);
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xf7c43d,
      metalness: 0.85,
      roughness: 0.2,
    });
    const offsets = [
      [1.7 + boardHeight / 2 - 0.08, -1.0 - boardWidth / 2 + 0.08],
      [1.7 + boardHeight / 2 - 0.08, -1.0 + boardWidth / 2 - 0.08],
      [1.7 - boardHeight / 2 + 0.08, -1.0 - boardWidth / 2 + 0.08],
      [1.7 - boardHeight / 2 + 0.08, -1.0 + boardWidth / 2 - 0.08],
    ];
    offsets.forEach((off) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(4.88, off[0], off[1]);
      categoryBoardGroup.add(bolt);
    });

    scene.add(categoryBoardGroup);
  }

  // ==========================================================================
  // 9. FOREGROUND WOODEN CONSULTATION TABLE & PHYSICAL 3D GUIDEBOOK
  // ==========================================================================
  function buildConsultationArea() {
    tableGroup = new THREE.Group();
    tableGroup.position.set(-0.85, 0, 2.4);

    const textureLoader = new THREE.TextureLoader();

    const woodTex = textureLoader.load("images/wood_table_texture.jpg");
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(2, 1.5);
    woodTex.anisotropy = 8;

    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.35,
      metalness: 0.05,
    });

    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.045, 0.95),
      tableMat,
    );
    tableTop.position.set(0, 0.78, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const legGeo = new THREE.CylinderGeometry(0.035, 0.024, 0.76, 16);
    const ferruleGeo = new THREE.CylinderGeometry(0.026, 0.024, 0.08, 16);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf7c43d,
      metalness: 0.85,
      roughness: 0.2,
    });

    const legPositions = [
      [-0.72, 0.38, -0.4],
      [0.72, 0.38, -0.4],
      [-0.72, 0.38, 0.4],
      [0.72, 0.38, 0.4],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      tableGroup.add(leg);

      const ferrule = new THREE.Mesh(ferruleGeo, brassMat);
      ferrule.position.set(pos[0], 0.04, pos[2]);
      tableGroup.add(ferrule);
    });

    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.65,
    });
    const chairBackMat = new THREE.MeshStandardMaterial({
      color: 0x142342,
      roughness: 0.65,
    });

    const seat1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.06, 0.48),
      chairMat,
    );
    seat1.position.set(0, 0.46, -0.68);
    tableGroup.add(seat1);

    const back1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.46, 0.05),
      chairBackMat,
    );
    back1.position.set(0, 0.68, -0.9);
    tableGroup.add(back1);

    const stethMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
      metalness: 0.7,
    });
    const stethRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.012, 12, 24),
      stethMat,
    );
    stethRing.rotation.x = Math.PI / 2;
    stethRing.position.set(0.55, 0.81, 0.15);
    tableGroup.add(stethRing);

    const notepad = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.01, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    notepad.position.set(0.55, 0.81, -0.2);
    notepad.rotation.y = -0.15;
    tableGroup.add(notepad);

    // PHYSICAL 3D GUIDEBOOK ON TABLETOP (Starts Closed)
    closedBook3DGroup = new THREE.Group();
    closedBook3DGroup.position.set(0, 0.805, 0);

    const bookWidth = 0.52;
    const bookDepth = 0.36;
    const bookThickness = 0.032;

    const navyLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f59,
      roughness: 0.35,
      metalness: 0.15,
    });
    const bottomCover = new THREE.Mesh(
      new THREE.BoxGeometry(bookWidth, 0.008, bookDepth),
      navyLeatherMat,
    );
    bottomCover.position.set(0, 0.004, 0);
    closedBook3DGroup.add(bottomCover);

    const pageBlockMat = new THREE.MeshStandardMaterial({
      color: 0xfaf9f5,
      roughness: 0.7,
    });
    const pageBlock = new THREE.Mesh(
      new THREE.BoxGeometry(
        bookWidth - 0.02,
        bookThickness - 0.012,
        bookDepth - 0.015,
      ),
      pageBlockMat,
    );
    pageBlock.position.set(0.005, bookThickness / 2, 0);
    closedBook3DGroup.add(pageBlock);

    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(
        bookThickness / 2,
        bookThickness / 2,
        bookDepth,
        16,
      ),
      navyLeatherMat,
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.set(-bookWidth / 2, bookThickness / 2, 0);
    closedBook3DGroup.add(spine);

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xf7c43d,
      metalness: 0.8,
      roughness: 0.3,
    });
    const ribbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.002, 0.12),
      ribbonMat,
    );
    ribbon.position.set(0.12, 0.015, bookDepth / 2 + 0.04);
    ribbon.rotation.y = 0.2;
    closedBook3DGroup.add(ribbon);

    const coverHingeGroup = new THREE.Group();
    coverHingeGroup.position.set(-bookWidth / 2, bookThickness, 0);

    const coverCanvas = document.createElement("canvas");
    coverCanvas.width = 1024;
    coverCanvas.height = 720;
    const cCtx = coverCanvas.getContext("2d");

    cCtx.fillStyle = "#1B2F59";
    cCtx.fillRect(0, 0, 1024, 720);

    cCtx.strokeStyle = "#F7C43D";
    cCtx.lineWidth = 8;
    cCtx.strokeRect(36, 36, 952, 648);
    cCtx.lineWidth = 2;
    cCtx.strokeRect(52, 52, 920, 616);

    cCtx.fillStyle = "#F7C43D";
    cCtx.fillRect(497, 180, 30, 80);
    cCtx.fillRect(472, 205, 80, 30);

    cCtx.fillStyle = "#FFFFFF";
    cCtx.font = "bold 44px Poppins, sans-serif";
    cCtx.textAlign = "center";
    cCtx.fillText("Rx Medo Card", 512, 330);

    cCtx.fillStyle = "#F7C43D";
    cCtx.font = "600 30px Poppins, sans-serif";
    cCtx.fillText("OFFICIAL PHARMACY GUIDEBOOK", 512, 380);

    cCtx.fillStyle = "#D1F0E7";
    cCtx.font = "400 20px Poppins, sans-serif";
    cCtx.fillText(
      "Doorstep Delivery • Partner Network • Quality Healthcare",
      512,
      430,
    );

    const coverTex = new THREE.CanvasTexture(coverCanvas);
    const coverMat = new THREE.MeshStandardMaterial({
      map: coverTex,
      roughness: 0.32,
      metalness: 0.12,
    });

    bookCoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bookWidth, 0.008, bookDepth),
      coverMat,
    );
    bookCoverMesh.position.set(bookWidth / 2, 0.004, 0);
    bookCoverMesh.castShadow = true;
    coverHingeGroup.add(bookCoverMesh);

    closedBook3DGroup.add(coverHingeGroup);
    tableGroup.add(closedBook3DGroup);

    scene.add(tableGroup);
  }

  // ==========================================================================
  // 10. LIVING PHARMACIST CHARACTER (Natural Animation, Blinking, Gesturing)
  // ==========================================================================
  function buildPharmacistCharacter() {
    const textureLoader = new THREE.TextureLoader();

    pharmacist.group = new THREE.Group();
    pharmacist.group.position.set(-1.35, 0.0, -0.15);

    pharmacist.idleTex = textureLoader.load("images/pharmacist_avatar.png");
    pharmacist.idleTex.anisotropy = 8;

    pharmacist.idleBlinkTex = textureLoader.load(
      "images/pharmacist_avatar_blink.png",
    );
    pharmacist.idleBlinkTex.anisotropy = 8;

    pharmacist.pointTex = textureLoader.load("images/pharmacist_pointing.png");
    pharmacist.pointTex.anisotropy = 8;

    pharmacist.pointBlinkTex = textureLoader.load(
      "images/pharmacist_pointing_blink.png",
    );
    pharmacist.pointBlinkTex.anisotropy = 8;

    const charGeo = new THREE.PlaneGeometry(0.62, 1.0);

    const idleMat = new THREE.MeshStandardMaterial({
      map: pharmacist.idleTex,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.4,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    pharmacist.idleMesh = new THREE.Mesh(charGeo, idleMat);
    pharmacist.idleMesh.position.set(0, 1.32, 0);
    pharmacist.idleMesh.castShadow = true;
    pharmacist.group.add(pharmacist.idleMesh);

    const pointMat = new THREE.MeshStandardMaterial({
      map: pharmacist.pointTex,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.4,
      metalness: 0.02,
      side: THREE.DoubleSide,
      opacity: 0.0,
    });
    pharmacist.pointMesh = new THREE.Mesh(charGeo, pointMat);
    pharmacist.pointMesh.position.set(0, 1.32, 0.001);
    pharmacist.pointMesh.castShadow = true;
    pharmacist.pointMesh.visible = false;
    pharmacist.group.add(pharmacist.pointMesh);

    const legMat = new THREE.MeshStandardMaterial({
      color: 0x172847,
      roughness: 0.5,
    });
    const leftLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.075, 0.85, 14),
      legMat,
    );
    leftLeg.position.set(-0.12, 0.42, 0);
    pharmacist.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.075, 0.85, 14),
      legMat,
    );
    rightLeg.position.set(0.12, 0.42, 0);
    pharmacist.group.add(rightLeg);

    scene.add(pharmacist.group);
  }

  // ==========================================================================
  // 11. INDOOR LUSH BOTANICAL PLANTS (Fiddle Leaf Fig & Monstera in Ceramic Pots)
  // ==========================================================================
  function buildIndoorPlants() {
    plantsGroup = new THREE.Group();

    const planterMatWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
    });
    const planterMatBrass = new THREE.MeshStandardMaterial({
      color: 0xf7c43d,
      metalness: 0.85,
      roughness: 0.25,
    });
    const leafMatMatte = new THREE.MeshStandardMaterial({
      color: 0x228b55,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const leafMatGlossy = new THREE.MeshStandardMaterial({
      color: 0x1f7a4a,
      roughness: 0.25,
      side: THREE.DoubleSide,
    });

    // Plant 1: Large Fiddle Leaf Fig near window entrance (X: 3.8, Z: 3.2)
    const figGroup = new THREE.Group();
    figGroup.position.set(3.8, 0, 3.2);

    const pot1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.52, 24),
      planterMatWhite,
    );
    pot1.position.set(0, 0.26, 0);
    pot1.castShadow = true;
    figGroup.add(pot1);

    const stand1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.12, 24),
      planterMatBrass,
    );
    stand1.position.set(0, 0.06, 0);
    figGroup.add(stand1);

    const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, 1.4, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.8,
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.95, 0);
    stem.castShadow = true;
    figGroup.add(stem);

    for (let i = 0; i < 9; i++) {
      const angle = i * 0.72;
      const y = 0.65 + i * 0.12;
      const leafGeo = new THREE.SphereGeometry(0.22, 8, 8);
      leafGeo.scale(1.4, 0.08, 0.9);
      const leaf = new THREE.Mesh(leafGeo, leafMatMatte);
      leaf.position.set(Math.cos(angle) * 0.28, y, Math.sin(angle) * 0.28);
      leaf.rotation.set(0.35, angle, 0.3);
      leaf.castShadow = true;
      figGroup.add(leaf);
    }
    plantsGroup.add(figGroup);

    // Plant 2: Potted Monstera near consultation table (X: -2.8, Z: 2.8)
    const monsteraGroup = new THREE.Group();
    monsteraGroup.position.set(-2.8, 0, 2.8);

    const pot2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.44, 24),
      planterMatWhite,
    );
    pot2.position.set(0, 0.22, 0);
    pot2.castShadow = true;
    monsteraGroup.add(pot2);

    for (let i = 0; i < 7; i++) {
      const angle = i * 0.9;
      const y = 0.45 + (i % 3) * 0.14;
      const mLeafGeo = new THREE.SphereGeometry(0.24, 8, 8);
      mLeafGeo.scale(1.3, 0.06, 0.85);
      const mLeaf = new THREE.Mesh(mLeafGeo, leafMatGlossy);
      mLeaf.position.set(Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3);
      mLeaf.rotation.set(-0.25, angle, 0.4);
      mLeaf.castShadow = true;
      monsteraGroup.add(mLeaf);
    }
    plantsGroup.add(monsteraGroup);

    scene.add(plantsGroup);
  }

  // ==========================================================================
  // 12. GSAP SCROLLTRIGGER FIRST-PERSON CAMERA JOURNEY (Responsive Desktop & Mobile)
  // ==========================================================================
  function initScrollJourney() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.warn("GSAP or ScrollTrigger not loaded, using fallback");
      initNativeScrollFallback();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Prevent address bar hide/show from triggering jarring scroll recalculations on mobile devices
    ScrollTrigger.config({ ignoreMobileResize: true });

    function setupCameraTimeline(tl, isMobile) {
      if (isMobile) {
        // --- MOBILE PORTRAIT CAMERA PATH ---
        // S1 -> S2: Step forward to Reception desk (pharmacist head & pointing arm clearly visible above bottom cards)
        tl.to(
          camera.position,
          {
            x: -0.88,
            y: 1.64,
            z: 2.3,
            ease: "power1.inOut",
            duration: 0.16,
          },
          0,
        );
        tl.to(
          cameraTarget,
          {
            x: -1.35,
            y: 1.4,
            z: -0.15,
            ease: "power1.inOut",
            duration: 0.16,
          },
          0,
        );

        // Dwell at Reception (p: 0.16 -> 0.30): Pharmacist welcomes visitor warmly
        tl.to(
          camera.position,
          {
            x: -0.92,
            y: 1.64,
            z: 2.22,
            ease: "none",
            duration: 0.14,
          },
          0.16,
        );
        tl.to(
          cameraTarget,
          {
            x: -1.35,
            y: 1.4,
            z: -0.15,
            ease: "none",
            duration: 0.14,
          },
          0.16,
        );

        // S2 -> S3: Glide across aisle & turn squarely toward Category Board
        // Stepped back along X to 0.75 so the entire 2.8m board easily fits on narrow screens
        tl.to(
          camera.position,
          {
            x: 0.75,
            y: 1.64,
            z: -0.55,
            ease: "power2.inOut",
            duration: 0.14,
          },
          0.3,
        );
        tl.to(
          cameraTarget,
          {
            x: 4.88,
            y: 1.65,
            z: -0.95,
            ease: "power2.inOut",
            duration: 0.14,
          },
          0.3,
        );

        // Dwell at Category Board (p: 0.44 -> 0.54): Squarely framed, arm pointing
        tl.to(
          camera.position,
          {
            x: 0.85,
            y: 1.64,
            z: -0.55,
            ease: "none",
            duration: 0.1,
          },
          0.44,
        );
        tl.to(
          cameraTarget,
          {
            x: 4.88,
            y: 1.65,
            z: -0.95,
            ease: "none",
            duration: 0.1,
          },
          0.44,
        );

        // S3 -> S4: Glide toward Foreground Consultation Table
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.54,
            z: 3.45,
            ease: "power2.inOut",
            duration: 0.13,
          },
          0.54,
        );
        tl.to(
          cameraTarget,
          {
            x: -0.85,
            y: 1.2,
            z: 1.85,
            ease: "power2.inOut",
            duration: 0.13,
          },
          0.54,
        );

        // Settle directly into reading perspective above tabletop guidebook (p: 0.67 -> 0.73)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.42,
            z: 3.25,
            ease: "power1.out",
            duration: 0.06,
          },
          0.67,
        );
        tl.to(
          cameraTarget,
          {
            x: -0.85,
            y: 0.78,
            z: 2.35,
            ease: "power1.out",
            duration: 0.06,
          },
          0.67,
        );

        // S5: Steady Focus on Tabletop Guidebook Spreads (p: 0.73 -> 0.99)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.4,
            z: 3.22,
            ease: "none",
            duration: 0.26,
          },
          0.73,
        );
        tl.to(
          cameraTarget,
          {
            x: -0.85,
            y: 0.78,
            z: 2.35,
            ease: "none",
            duration: 0.26,
          },
          0.73,
        );

        // Release to content (p: 0.99 -> 1.00)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.46,
            z: 3.28,
            ease: "power1.in",
            duration: 0.01,
          },
          0.99,
        );
      } else {
        // --- 100% EXACT DESKTOP CAMERA PATH (PRESERVED DOWN TO EVERY DECIMAL) ---
        // SCENE 1 -> 2: Step forward from Entrance into Pharmacy Reception (p: 0.00 -> 0.16)
        tl.to(
          camera.position,
          {
            x: -0.75,
            y: 1.58,
            z: 2.05,
            ease: "power1.inOut",
            duration: 0.16,
          },
          0,
        );
        tl.to(
          cameraTarget,
          {
            x: -1.35,
            y: 1.35,
            z: -0.15,
            ease: "power1.inOut",
            duration: 0.16,
          },
          0,
        );

        // Dwell at Reception (p: 0.16 -> 0.30): Pharmacist welcomes visitor warmly
        tl.to(
          camera.position,
          {
            x: -0.8,
            y: 1.58,
            z: 1.95,
            ease: "none",
            duration: 0.14,
          },
          0.16,
        );
        tl.to(
          cameraTarget,
          {
            x: -1.35,
            y: 1.35,
            z: -0.15,
            ease: "none",
            duration: 0.14,
          },
          0.16,
        );

        // SCENE 2 -> 3: Glide across aisle & turn squarely toward Category Board (p: 0.30 -> 0.44)
        tl.to(
          camera.position,
          {
            x: 1.25,
            y: 1.7,
            z: -0.65,
            ease: "power2.inOut",
            duration: 0.14,
          },
          0.3,
        );
        tl.to(
          cameraTarget,
          {
            x: 4.88,
            y: 1.7,
            z: -1.0,
            ease: "power2.inOut",
            duration: 0.14,
          },
          0.3,
        );

        // Dwell at Category Board (p: 0.44 -> 0.54): Squarely framed, arm pointing
        tl.to(
          camera.position,
          {
            x: 1.35,
            y: 1.7,
            z: -0.65,
            ease: "none",
            duration: 0.1,
          },
          0.44,
        );
        tl.to(
          cameraTarget,
          {
            x: 4.88,
            y: 1.7,
            z: -1.0,
            ease: "none",
            duration: 0.1,
          },
          0.44,
        );

        // SCENE 3 -> 4: Glide toward the Foreground Consultation Table (p: 0.54 -> 0.67)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.5,
            z: 3.25,
            ease: "power2.inOut",
            duration: 0.13,
          },
          0.54,
        );
        tl.to(
          cameraTarget,
          {
            x: -0.85,
            y: 1.25,
            z: 1.8,
            ease: "power2.inOut",
            duration: 0.13,
          },
          0.54,
        );

        // Settle directly into reading perspective above tabletop guidebook (p: 0.67 -> 0.73)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.38,
            z: 3.08,
            ease: "power1.out",
            duration: 0.06,
          },
          0.67,
        );
        tl.to(
          cameraTarget,
          {
            x: -0.85,
            y: 0.8,
            z: 2.4,
            ease: "power1.out",
            duration: 0.06,
          },
          0.67,
        );

        // SCENE 5: Steady Focus on Consultation Table & Guidebook Spreads (p: 0.73 -> 0.99)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.36,
            z: 3.06,
            ease: "none",
            duration: 0.26,
          },
          0.73,
        );
        tl.to(
          cameraTarget,
          {
            x: -0.85,
            y: 0.8,
            z: 2.4,
            ease: "none",
            duration: 0.26,
          },
          0.73,
        );

        // Release to content (p: 0.99 -> 1.00)
        tl.to(
          camera.position,
          {
            x: -0.85,
            y: 1.42,
            z: 3.12,
            ease: "power1.in",
            duration: 0.01,
          },
          0.99,
        );
      }
    }

    if (typeof gsap.matchMedia === "function") {
      const mm = gsap.matchMedia();

      // Desktop & Tablet Landscape (min-width: 768px)
      mm.add("(min-width: 768px)", function () {
        camera.position.set(-0.25, 1.62, 4.3);
        cameraTarget.set(-0.3, 1.45, 0.5);

        scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            pin: viewport,
            start: "top top",
            end: "+=480%",
            scrub: 0.35,
            anticipatePin: 1,
            onUpdate: function (self) {
              scrollProgress = self.progress;
              updateScrollStages(self.progress);
            },
          },
        });

        setupCameraTimeline(scrollTimeline, false);

        return function () {
          if (scrollTimeline) scrollTimeline.kill();
        };
      });

      // Mobile Portrait (max-width: 767px)
      mm.add("(max-width: 767px)", function () {
        camera.position.set(-0.25, 1.64, 4.55);
        cameraTarget.set(-0.3, 1.45, 0.5);

        scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            pin: viewport,
            start: "top top",
            end: "+=480%",
            scrub: 0.35,
            anticipatePin: 1,
            onUpdate: function (self) {
              scrollProgress = self.progress;
              updateScrollStages(self.progress);
            },
          },
        });

        setupCameraTimeline(scrollTimeline, true);

        return function () {
          if (scrollTimeline) scrollTimeline.kill();
        };
      });
    } else {
      // Fallback if matchMedia is unavailable
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        camera.position.set(-0.25, 1.64, 4.55);
      } else {
        camera.position.set(-0.25, 1.62, 4.3);
      }
      cameraTarget.set(-0.3, 1.45, 0.5);

      scrollTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          pin: viewport,
          start: "top top",
          end: "+=480%",
          scrub: 0.35,
          anticipatePin: 1,
          onUpdate: function (self) {
            scrollProgress = self.progress;
            updateScrollStages(self.progress);
          },
        },
      });

      setupCameraTimeline(scrollTimeline, isMobile);
    }
  }

  // ==========================================================================
  // 13. UPDATE UI STAGES, CHARACTER GESTURES & GUIDEBOOK ACCORDING TO SCROLL
  // ==========================================================================
  function updateScrollStages(p) {
    if (progressLine) {
      progressLine.style.width = Math.min(100, Math.max(0, p * 100)) + "%";
    }

    // 1. Pharmacist Arm & Gaze Gesture Blending
    if (p < 0.16) {
      // Idle at Entrance
      pharmacist.targetBlend = 0;
      pharmacist.targetHeadYaw = 0;
      pharmacist.targetHeadPitch = 0;
    } else if (p >= 0.16 && p < 0.24) {
      // Welcoming Gaze at Reception Desk
      pharmacist.targetBlend = 0;
      pharmacist.targetHeadYaw = 0.12;
      pharmacist.targetHeadPitch = 0.03;
    } else if (p >= 0.24 && p < 0.32) {
      // Pharmacist raises arm and points toward Category Board while visitor is at reception
      pharmacist.targetBlend = (p - 0.24) / 0.08;
      pharmacist.targetHeadYaw = 0.45 * pharmacist.targetBlend;
      pharmacist.targetHeadPitch = -0.02;
    } else if (p >= 0.32 && p <= 0.54) {
      // Firmly pointing at Category Board as camera turns and inspects the categories
      pharmacist.targetBlend = 1.0;
      pharmacist.targetHeadYaw = 0.48;
      pharmacist.targetHeadPitch = -0.02;
    } else if (p > 0.54 && p < 0.64) {
      // Arm relaxes naturally back down to neutral as visitor walks to table
      pharmacist.targetBlend = Math.max(0, 1.0 - (p - 0.54) / 0.1);
      pharmacist.targetHeadYaw = 0.48 * pharmacist.targetBlend;
      pharmacist.targetHeadPitch = 0;
    } else {
      // Neutral resting pose
      pharmacist.targetBlend = 0;
      pharmacist.targetHeadYaw = 0;
      pharmacist.targetHeadPitch = 0;
    }

    // 2. Tabletop 3D Guidebook Cover Opening
    if (bookCoverMesh) {
      if (p < 0.66) {
        bookCoverMesh.rotation.z = 0; // Firmly closed
        if (closedBook3DGroup) closedBook3DGroup.visible = true;
      } else if (p >= 0.66 && p < 0.73) {
        // Hinges open 180 degrees smoothly onto the tabletop
        const openProgress = (p - 0.66) / 0.07;
        bookCoverMesh.rotation.z = -openProgress * Math.PI;
        if (closedBook3DGroup) closedBook3DGroup.visible = true;
      } else {
        bookCoverMesh.rotation.z = -Math.PI; // Fully open
        if (closedBook3DGroup) closedBook3DGroup.visible = false;
      }
    }

    // 3. Stage Overlays & Active Book Spreads Switching
    if (p < 0.16) {
      setActiveStage("entrance");
    } else if (p >= 0.16 && p < 0.3) {
      setActiveStage("reception");
    } else if (p >= 0.3 && p < 0.54) {
      setActiveStage("categories");
    } else if (p >= 0.54 && p < 0.7) {
      setActiveStage("partners");
    } else {
      setActiveStage("book");

      // Book Page Spreads on the Table
      if (p >= 0.7 && p < 0.78) {
        showBookSpread(0); // Page 1: Careplus Delivery & Cold Chain
      } else if (p >= 0.78 && p < 0.85) {
        showBookSpread(1); // Page 2: Partner Pharmacies (Aman Medico's & RX Healthcare)
      } else if (p >= 0.85 && p < 0.92) {
        showBookSpread(2); // Page 3: How It Works (4 Steps)
      } else {
        showBookSpread(3); // Page 4: Why Choose Us (Trust Pillars)
      }
    }
  }

  function setActiveStage(stage) {
    if (stageEntrance)
      stageEntrance.classList.toggle("active", stage === "entrance");
    if (stageReception)
      stageReception.classList.toggle("active", stage === "reception");
    if (stageCategories)
      stageCategories.classList.toggle("active", stage === "categories");
    if (stagePartners)
      stagePartners.classList.toggle("active", stage === "partners");
    if (stageBook) stageBook.classList.toggle("active", stage === "book");
  }

  function showBookSpread(index) {
    if (currentActiveSpread === index) return;
    currentActiveSpread = index;

    bookSpreads.forEach((spread, i) => {
      spread.classList.toggle("active", i === index);
    });

    const dots = document.querySelectorAll(".rx-spread-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  window.pharmacyTurnPage = function (delta) {
    const base = currentActiveSpread >= 0 ? currentActiveSpread : 0;
    const next = (base + delta + 4) % 4;
    showBookSpread(next);
  };

  window.pharmacySetBookSpread = function (index) {
    showBookSpread(index);
  };

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // ==========================================================================
  // 14. REAL-TIME CHARACTER ANIMATION (Breathing, Blinking, Postural Sway)
  // ==========================================================================
  let lastTime = performance.now();

  function updateCharacter(timeSeconds, delta) {
    if (!pharmacist.group || !pharmacist.idleMesh) return;

    // 1. Natural Breathing Cycle (~0.2 Hz)
    const breath = Math.sin(timeSeconds * 1.8);
    const scaleY = 1.0 + breath * 0.008;
    const scaleX = 1.0 + breath * 0.004;
    const posY = 1.32 + breath * 0.003;

    pharmacist.idleMesh.scale.set(scaleX, scaleY, 1.0);
    pharmacist.idleMesh.position.y = posY;

    if (pharmacist.pointMesh) {
      pharmacist.pointMesh.scale.set(scaleX, scaleY, 1.0);
      pharmacist.pointMesh.position.y = posY;
    }

    // 2. Postural Weight Shift / Sway (~0.05 Hz)
    const sway = Math.sin(timeSeconds * 0.5);
    pharmacist.group.rotation.y = sway * 0.012 + pharmacist.headYaw;
    pharmacist.group.position.x = -1.35 + sway * 0.005;

    // 3. Smooth Head / Gaze Orientation Interpolation
    pharmacist.headYaw +=
      (pharmacist.targetHeadYaw - pharmacist.headYaw) * 0.08;
    pharmacist.headPitch +=
      (pharmacist.targetHeadPitch - pharmacist.headPitch) * 0.08;

    // 4. Smooth Gesture Blend Factor Interpolation
    pharmacist.blendFactor +=
      (pharmacist.targetBlend - pharmacist.blendFactor) * 0.12;

    // 5. Update Mesh Opacities for Seamless Gesture Cross-Fade
    if (pharmacist.idleMesh && pharmacist.pointMesh) {
      const pFactor = Math.max(0, Math.min(1, pharmacist.blendFactor));
      pharmacist.idleMesh.material.opacity = 1.0 - pFactor;
      pharmacist.pointMesh.material.opacity = pFactor;

      pharmacist.idleMesh.visible = pFactor < 0.99;
      pharmacist.pointMesh.visible = pFactor > 0.01;
    }

    // 6. Natural Eye Blinking System (every 3.2 - 4.5 seconds, lasts 160ms)
    pharmacist.blinkTimer += delta;
    if (
      !pharmacist.isBlinking &&
      pharmacist.blinkTimer >= pharmacist.nextBlinkTime
    ) {
      pharmacist.isBlinking = true;
      pharmacist.blinkTimer = 0;
      pharmacist.blinkPhase = 0;
      pharmacist.nextBlinkTime = 3.2 + Math.random() * 1.6;
    }

    let isEyesClosed = false;
    if (pharmacist.isBlinking) {
      pharmacist.blinkPhase += delta / pharmacist.blinkDuration;
      if (pharmacist.blinkPhase <= 1.0) {
        isEyesClosed =
          pharmacist.blinkPhase > 0.15 && pharmacist.blinkPhase < 0.85;
      } else {
        pharmacist.isBlinking = false;
        isEyesClosed = false;
      }
    }

    // Zero-stall blink texture swap: only swap when state changes!
    if (pharmacist.lastBlinkClosed !== isEyesClosed) {
      pharmacist.lastBlinkClosed = isEyesClosed;
      if (
        pharmacist.idleMesh &&
        pharmacist.idleTex &&
        pharmacist.idleBlinkTex
      ) {
        pharmacist.idleMesh.material.map = isEyesClosed
          ? pharmacist.idleBlinkTex
          : pharmacist.idleTex;
      }
      if (
        pharmacist.pointMesh &&
        pharmacist.pointTex &&
        pharmacist.pointBlinkTex
      ) {
        pharmacist.pointMesh.material.map = isEyesClosed
          ? pharmacist.pointBlinkTex
          : pharmacist.pointTex;
      }
    }
  }

  // ==========================================================================
  // 15. ANIMATION RENDER LOOP (Optimized GC & LookAt)
  // ==========================================================================
  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    const timeSeconds = now * 0.001;

    // Smooth mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Update Living Pharmacist Character
    updateCharacter(timeSeconds, delta);

    // Dynamic Camera LookAt with Mouse Parallax (Zero garbage collection)
    if (camera) {
      dynamicLookTarget.set(
        cameraTarget.x + mouse.x * 0.04,
        cameraTarget.y + mouse.y * 0.03,
        cameraTarget.z,
      );
      camera.lookAt(dynamicLookTarget);
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  let resizeDebounceTimer = null;
  function onWindowResize() {
    updateCameraFraming();
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(function () {
      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.refresh();
      }
    }, 150);
  }

  function onMouseMove(e) {
    mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
  }

  // Touch Swipe Gesture for Tabletop Guidebook Spreads on Mobile
  function initBookTouchSwipe() {
    const bookStage = document.getElementById("stageBook");
    if (!bookStage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    bookStage.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true },
    );

    bookStage.addEventListener(
      "touchend",
      function (e) {
        if (e.changedTouches && e.changedTouches.length === 1) {
          touchEndX = e.changedTouches[0].clientX;
          touchEndY = e.changedTouches[0].clientY;
          const diffX = touchEndX - touchStartX;
          const diffY = touchEndY - touchStartY;
          // Check if movement is predominantly horizontal and over 40px
          if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
            if (diffX < 0) {
              // Swiped left -> next spread
              window.pharmacyTurnPage(1);
            } else {
              // Swiped right -> previous spread
              window.pharmacyTurnPage(-1);
            }
          }
        }
      },
      { passive: true },
    );
  }

  // Quick-Jump Navigation
  window.pharmacyScrollTo = function (target, isInstant = false) {
    let targetRatio = 0;
    if (target === "entrance") targetRatio = 0.05;
    else if (target === "reception") targetRatio = 0.22;
    else if (target === "categories") targetRatio = 0.44;
    else if (target === "partners") targetRatio = 0.62;
    else if (target === "book") targetRatio = 0.78;

    const st = scrollTimeline && scrollTimeline.scrollTrigger;
    if (st) {
      const scrollTarget = st.start + (st.end - st.start) * targetRatio;
      if (isInstant) {
        window.scrollTo(0, scrollTarget);
        st.scroll(scrollTarget);
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
        if (scrollTimeline) scrollTimeline.progress(targetRatio);
        updateScrollStages(targetRatio);
      } else {
        window.scrollTo({ top: scrollTarget, behavior: "smooth" });
      }
    } else if (container) {
      const sectionTop = container.offsetTop;
      const totalHeight = container.offsetHeight - window.innerHeight;
      const scrollTarget = sectionTop + totalHeight * targetRatio;
      window.scrollTo({
        top: scrollTarget,
        behavior: isInstant ? "auto" : "smooth",
      });
      updateScrollStages(targetRatio);
    }
  };

  // Synchronous Programmatic Progress Helper (used for testing and direct inspection)
  window.pharmacySetProgress = function (ratio) {
    const clamped = Math.max(0, Math.min(1, ratio));
    const st = scrollTimeline && scrollTimeline.scrollTrigger;
    if (st) {
      const scrollTarget = st.start + (st.end - st.start) * clamped;
      window.scrollTo(0, scrollTarget);
      st.scroll(scrollTarget);
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
    }
    if (scrollTimeline) {
      scrollTimeline.progress(clamped);
    }
    updateScrollStages(clamped);
  };

  // Native Scroll Fallback
  function initNativeScrollFallback() {
    window.addEventListener("scroll", function () {
      const rect = container.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, -rect.top / (rect.height - window.innerHeight)),
      );
      updateScrollStages(progress);
    });
  }

  // Experience Bootstrap
  function startExperience() {
    init3D();
    initScrollJourney();
    initBookTouchSwipe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startExperience);
  } else {
    startExperience();
  }

  window.addEventListener("load", function () {
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  });

  setTimeout(function () {
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  }, 450);

  setTimeout(function () {
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  }, 1200);
})();
