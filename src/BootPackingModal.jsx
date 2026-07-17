import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/*
 * 3D "how it all fits in the boot" visualiser.
 *
 * All dimensions are REAL, in centimetres (1 three.js unit = 1 cm):
 *  - Boot (3rd row folded): depth 42" = 106.7, height 31" = 78.7,
 *    max width 44.5" = 113, between wheel wells 42" = 106.7,
 *    wheel-well height ≈ 14" = 35.6.
 *  - Suitcase (Xiaomi): 498 × 315 × 768 mm → 50 × 31.5 × 77 cm (×4).
 *  - Skis: 2 pairs ~165 cm.
 *
 * Local axes inside `world`: X = width, Y = depth (0 at the tailgate,
 * +Y toward the seats), Z = height (0 = load floor). The `world` group is
 * rotated so Z points up on screen, and positioned so the CENTER OF THE
 * BOOT sits at the scene origin — the orbit target.
 *
 * Packing (collision-free at true scale):
 *  - 4 cases lie flat, 2 side-by-side × 2 layers (stack top = 65 cm),
 *    pushed toward the seats so the stack clears the raked tailgate glass.
 *  - Skis go in LAST: they lie flat on top of the stack, rotated diagonally
 *    to gain length, tips passing over the folded seat area (165 > 106.7,
 *    so they cannot be fully contained in the boot).
 */

// ── Boot interior (cm) ──
const BOOT = {
  wMax: 113,       // 44.5" widest point
  wWells: 106.7,   // 42" clear width between the wheel wells
  depth: 106.7,    // 42" depth with 3rd row folded
  height: 78.7,    // 31" opening height
  wellH: 35.6,     // ~14" wheel-well height
  slantDrop: 22,   // roof/hatch drop toward the rear opening
  slantRun: 30,    // depth over which the rear slant happens
};

// ── Suitcase (cm), laid flat: 50 (X) × 77 (Y) footprint, 31.5 tall ──
const CASE = { w: 50, thick: 31.5, tall: 77 };

// ── Ski bundle (cm) ──
const SKI = { len: 165, w: 13, thick: 9 };

// Floating text label as a sprite (always faces the camera).
function makeLabel(text, color = '#0f172a', bg = 'rgba(255,255,255,0.92)', scale = 0.38) {
  const pad = 24;
  const font = 'bold 46px -apple-system, Segoe UI, Roboto, sans-serif';
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = font;
  const w = ctx.measureText(text).width;
  c.width = w + pad * 2;
  c.height = 78;
  ctx.font = font;
  ctx.fillStyle = bg;
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(c.width, 0, c.width, c.height, r);
  ctx.arcTo(c.width, c.height, 0, c.height, r);
  ctx.arcTo(0, c.height, 0, 0, r);
  ctx.arcTo(0, 0, c.width, 0, r);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, c.height / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
  );
  sprite.scale.set((c.width / c.height) * 26 * scale, 26 * scale, 1);
  sprite.renderOrder = 999;
  return sprite;
}

// Engineering-style dimension: a line from `a` to `b` with tick marks at BOTH
// ends (perpendicular, along `tickDir`) and a label at the midpoint.
function makeDim(parent, a, b, tickDir, text, labelOffset = new THREE.Vector3(), color = '#475569') {
  const mat = new THREE.LineBasicMaterial({ color });
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const tick = new THREE.Vector3(...tickDir).setLength(4);

  const pts = [
    va, vb, // main line
    va.clone().sub(tick), va.clone().add(tick), // start tick
    vb.clone().sub(tick), vb.clone().add(tick), // end tick
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  parent.add(new THREE.LineSegments(geo, mat));

  const label = makeLabel(text, color, 'rgba(255,255,255,0.95)');
  label.position.copy(va.clone().add(vb).multiplyScalar(0.5).add(new THREE.Vector3(...labelOffset)));
  parent.add(label);
}

// Translucent, edge-outlined box (center-positioned).
function makeBox(size, pos, { color, opacity = 0.8, edge = '#1e293b' }) {
  const g = new THREE.BoxGeometry(size.x, size.y, size.z);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      color, transparent: true, opacity, roughness: 0.65, metalness: 0.05,
    })
  ));
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(g),
    new THREE.LineBasicMaterial({ color: edge })
  ));
  group.position.set(pos.x, pos.y, pos.z);
  return group;
}

export default function BootPackingModal({ onClose }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const skiGroupRef = useRef(null);
  const [showSkis, setShowSkis] = React.useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef2f7');

    // Near plane of 5 (not 1) keeps depth precision high → no z-flicker.
    const camera = new THREE.PerspectiveCamera(42, width / height, 5, 3000);
    camera.position.set(190, 130, 250);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const world = new THREE.Group();
    world.rotation.x = -Math.PI / 2; // local Z becomes "up" on screen
    scene.add(world);

    // Lights
    scene.add(new THREE.HemisphereLight('#ffffff', '#b8c2cc', 1.05));
    const dir = new THREE.DirectionalLight('#ffffff', 1.5);
    dir.position.set(180, 260, 320);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight('#ffffff', 0.5);
    dir2.position.set(-200, -160, 180);
    scene.add(dir2);

    const halfW = BOOT.wMax / 2;
    const D = BOOT.depth;
    const H = BOOT.height;

    // ───────── Boot shell: one extruded side profile ─────────
    // Single solid (floor → seat back → roof → raked tailgate), so the slant
    // is part of the shape instead of a separate overlapping panel.
    {
      const prof = new THREE.Shape();
      prof.moveTo(0, 0);                       // tailgate sill
      prof.lineTo(D, 0);                       // floor
      prof.lineTo(D, H);                       // seat backs
      prof.lineTo(BOOT.slantRun, H);           // flat roof
      prof.lineTo(0, H - BOOT.slantDrop);      // raked tailgate glass
      prof.closePath();

      const geo = new THREE.ExtrudeGeometry(prof, { depth: BOOT.wMax, bevelEnabled: false });
      // Remap axes: profile-x → depth (Y), profile-y → height (Z), extrusion → width (X)
      const m = new THREE.Matrix4();
      m.set(
        0, 0, 1, 0,
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
      );
      geo.applyMatrix4(m);
      geo.translate(-halfW, 0, 0);

      const shell = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: '#b6c6d8',
        transparent: true,
        opacity: 0.13,
        side: THREE.DoubleSide,
        depthWrite: false, // translucent shell never fights the solid items
        roughness: 0.5,
      }));
      world.add(shell);
      world.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 15),
        new THREE.LineBasicMaterial({ color: '#334155' })
      ));
    }

    // Load floor (slightly above z=0 so it never z-fights the shell bottom)
    {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(BOOT.wMax - 1, D - 1),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.95, side: THREE.DoubleSide })
      );
      floor.position.set(0, D / 2, 0.2);
      world.add(floor);
    }

    // ───────── Wheel wells (true 3.15 cm intrusion per side) ─────────
    const wellIntrude = (BOOT.wMax - BOOT.wWells) / 2;
    const wellLen = 60;
    const wellY = D - wellLen / 2 - 5; // over the rear axle, toward the seats
    for (const side of [-1, 1]) {
      world.add(makeBox(
        { x: wellIntrude, y: wellLen, z: BOOT.wellH },
        { x: side * (halfW - wellIntrude / 2), y: wellY, z: BOOT.wellH / 2 },
        { color: '#9aa7b4', opacity: 0.9, edge: '#475569' }
      ));
    }

    // ───────── Suitcases: 2 side-by-side × 2 layers, lying flat ─────────
    // Pushed toward the seats (front face at y=25) so the 65 cm stack top
    // clears the raked glass (slant height at y=25 is ~75 cm). The 103 cm
    // total width fits between the wells (106.7 cm).
    const caseColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
    const gap = 2;
    const stackFrontY = 25;
    const caseY = stackFrontY + CASE.tall / 2;
    const baseZ = 0.4;
    const layout = [
      { x: -(CASE.w / 2 + gap / 2), z: baseZ + CASE.thick / 2 },
      { x: +(CASE.w / 2 + gap / 2), z: baseZ + CASE.thick / 2 },
      { x: -(CASE.w / 2 + gap / 2), z: baseZ + CASE.thick + gap + CASE.thick / 2 },
      { x: +(CASE.w / 2 + gap / 2), z: baseZ + CASE.thick + gap + CASE.thick / 2 },
    ];
    layout.forEach((p, i) => {
      world.add(makeBox(
        { x: CASE.w, y: CASE.tall, z: CASE.thick },
        { x: p.x, y: caseY, z: p.z },
        { color: caseColors[i], opacity: 0.75 }
      ));
    });
    const stackTopZ = baseZ + CASE.thick * 2 + gap; // ≈ 65.4

    // ───────── Skis: loaded LAST, flat on the stack, diagonal ─────────
    // 165 cm > any boot dimension, so they lie on top of the cases and run
    // diagonally (rear-left → front-right) to gain length; the tips extend
    // past the seat backs. Tails start at y=28, clear of the raked glass.
    // The whole group can be toggled off from the UI.
    const skiGroup = new THREE.Group();
    world.add(skiGroup);
    skiGroupRef.current = skiGroup;
    const skiZ = stackTopZ + SKI.thick / 2 + 0.6;
    const tail = new THREE.Vector2(-45, 28);
    const dxy = new THREE.Vector2(90, Math.sqrt(SKI.len * SKI.len - 90 * 90)); // (90, ~138.3)
    const tip = tail.clone().add(dxy);
    const yaw = -Math.atan2(dxy.x, dxy.y);
    const mid = tail.clone().add(tip).multiplyScalar(0.5);
    const perp = new THREE.Vector2(-dxy.y, dxy.x).normalize().multiplyScalar(6);
    for (const s of [1, -1]) {
      const ski = makeBox(
        { x: SKI.w, y: SKI.len, z: SKI.thick },
        { x: mid.x + perp.x * s, y: mid.y + perp.y * s, z: skiZ },
        { color: '#7c3aed', opacity: 0.85, edge: '#4c1d95' }
      );
      ski.rotation.z = yaw;
      skiGroup.add(ski);
    }

    // ───────── Dimension lines (with start/end ticks) ─────────
    // Boot depth — along the left side at floor level
    makeDim(world,
      [-halfW - 10, 0, 0], [-halfW - 10, D, 0],
      [1, 0, 0], 'Boot depth 106.7 cm (42")', [0, 0, 8]);
    // Boot max width — across the front of the tailgate at floor level
    makeDim(world,
      [-halfW, -12, 0], [halfW, -12, 0],
      [0, 1, 0], 'Max width 113 cm (44.5")', [0, 0, 8]);
    // Boot height — vertical at the left-rear (seat-back) corner
    makeDim(world,
      [-halfW - 10, D, 0], [-halfW - 10, D, H],
      [1, 0, 0], 'Height 78.7 cm (31")', [-12, 0, 0]);
    // Wheel-well height — vertical beside the right well
    makeDim(world,
      [halfW + 8, wellY, 0], [halfW + 8, wellY, BOOT.wellH],
      [1, 0, 0], 'Wheel well 35.6 cm (14")', [14, 0, 0]);
    // Suitcase length — along the top-left edge of the stack
    makeDim(world,
      [-56, stackFrontY, stackTopZ + 1], [-56, stackFrontY + CASE.tall, stackTopZ + 1],
      [1, 0, 0], 'Suitcase 77 cm', [-8, 0, 6], '#b91c1c');
    // Suitcase height — vertical at the front-right corner of the stack
    // (each case is 31.5 cm thick lying flat; two layers + gap = 65 cm)
    makeDim(world,
      [56, stackFrontY, baseZ], [56, stackFrontY, baseZ + CASE.thick],
      [0, 1, 0], 'Case height 31.5 cm', [16, 0, 0], '#b91c1c');
    makeDim(world,
      [62, stackFrontY, baseZ], [62, stackFrontY, stackTopZ],
      [0, 1, 0], 'Stack 65 cm', [16, 0, 8], '#b91c1c');
    // Ski length — hovering just above the skis, following their diagonal
    makeDim(skiGroup,
      [tail.x, tail.y, skiZ + 10], [tip.x, tip.y, skiZ + 10],
      [0, 0, 1], 'Skis 165 cm ×2', [0, 0, 8], '#6d28d9');

    // Stack summary label
    const stackLabel = makeLabel('4 × suitcase 50 × 31.5 × 77 cm', '#7f1d1d', 'rgba(254,226,226,0.95)');
    stackLabel.position.set(0, caseY, stackTopZ + 22);
    world.add(stackLabel);

    // Center the BOOT (not the whole scene contents) at the origin, so the
    // camera orbits around the middle of the boot.
    // world is rotated -90° about X, so local (x, y, z) → scene (x, z, -y).
    world.position.set(0, -H / 2, D / 2);

    // Ground grid for spatial reference
    const grid = new THREE.GridHelper(700, 28, '#cbd5e1', '#dde5ee');
    grid.position.y = -H / 2 - 1;
    scene.add(grid);

    // ───────── Controls ─────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // = center of the boot
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 120;
    controls.maxDistance = 800;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;
    controls.update();
    controlsRef.current = controls;

    const stopAuto = () => { controls.autoRotate = false; };
    renderer.domElement.addEventListener('pointerdown', stopAuto);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', stopAuto);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Toggle ski visibility without rebuilding the scene
  useEffect(() => {
    if (skiGroupRef.current) skiGroupRef.current.visible = showSkis;
  }, [showSkis]);

  const resetView = () => {
    const c = controlsRef.current;
    if (!c) return;
    c.autoRotate = true;
    c.object.position.set(190, 130, 250);
    c.target.set(0, 0, 0);
    c.update();
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="glass-panel boot-modal"
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="boot-modal-head">
          <h2>🧳 Fitting it all in the boot</h2>
          <p>Drag to rotate · scroll to zoom · real dimensions, 1 : 1</p>
        </div>

        <div className="boot-canvas" ref={mountRef} />

        <div className="boot-legend">
          <span><i style={{ background: '#ef4444' }} /> 4 × suitcase 50·31.5·77 cm</span>
          <span><i style={{ background: '#7c3aed' }} /> 2 × skis 165 cm</span>
          <span><i style={{ background: '#9aa7b4' }} /> wheel wells</span>
        </div>
        <p className="boot-note">
          Load order: suitcases first — lying flat, 2 + 2, pushed forward so
          the 65 cm stack clears the raked tailgate glass. Skis go in last,
          flat on top of the stack and turned diagonal to gain length; at
          165 cm they're longer than the boot, so the tips extend past the
          seat backs. The ~25 cm gap by the tailgate takes boot bags and
          soft items.
        </p>

        <div className="boot-controls">
          <button className="boot-reset" onClick={resetView}>
            <RotateCcw size={14} /> Reset view
          </button>
          <button
            className={`boot-reset boot-ski-toggle${showSkis ? ' is-on' : ''}`}
            onClick={() => setShowSkis((v) => !v)}
          >
            🎿 {showSkis ? 'Hide skis' : 'Show skis'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
