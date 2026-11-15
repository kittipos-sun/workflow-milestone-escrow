import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LockKeyhole } from "lucide-react";

/** Decorative contract folio: meaningful escrow information remains in HTML. */
export default function EscrowScene() {
  const canvasRef = useRef(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setAvailable(false);
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    const folio = new THREE.Group();
    folio.rotation.set(-0.12, -0.18, -0.04);
    scene.add(folio);

    scene.add(new THREE.AmbientLight(0x95b7d7, 1.15));
    const keyLight = new THREE.DirectionalLight(0xbce6ff, 2.4);
    keyLight.position.set(-2.5, 3.6, 4.5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4f8dff, 1.3);
    rimLight.position.set(3, -1.5, 2.5);
    scene.add(rimLight);

    const addBox = (parent, size, position, color, options = {}) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.18, ...options }),
      );
      mesh.position.set(...position);
      parent.add(mesh);
      return mesh;
    };

    // An obsidian agreement folio with cyan rule marks and a warm escrow seal.
    addBox(folio, [2.04, 2.56, 0.16], [0, 0, -0.2], 0x16263a, { roughness: 0.38, metalness: 0.3 });
    addBox(folio, [1.94, 2.47, 0.065], [0.035, -0.015, -0.085], 0x20354b, { roughness: 0.56 });
    addBox(folio, [1.84, 2.37, 0.055], [0.025, -0.005, -0.012], 0x0d1825, { roughness: 0.48 });
    addBox(folio, [0.76, 0.075, 0.025], [-0.44, 0.9, 0.025], 0x59c7ff, { emissive: 0x1379ad, emissiveIntensity: 0.45, roughness: 0.35 });
    addBox(folio, [0.2, 0.075, 0.028], [0.67, 0.9, 0.027], 0xf2c35f, { emissive: 0x7e5313, emissiveIntensity: 0.28, roughness: 0.32, metalness: 0.48 });

    const ruleColors = [0x85a9c8, 0x60819d, 0x60819d, 0x60819d];
    [-0.17, -0.39, -0.61, -0.83].forEach((y, index) => {
      addBox(folio, [index === 0 ? 1.24 : 1.43, 0.034, 0.018], [-0.075, y, 0.03], ruleColors[index], {
        emissive: 0x164263,
        emissiveIntensity: 0.18,
        roughness: 0.4,
      });
    });
    [-0.28, -0.5, -0.72].forEach((y) => {
      addBox(folio, [0.72, 0.022, 0.015], [-0.42, y, 0.03], 0x3e5c76, { roughness: 0.5 });
    });

    const seal = new THREE.Group();
    seal.position.set(0.73, -0.76, 0.2);
    folio.add(seal);
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.105, 40),
      new THREE.MeshStandardMaterial({ color: 0xdcae48, roughness: 0.27, metalness: 0.68, emissive: 0x513007, emissiveIntensity: 0.3 }),
    );
    coin.rotation.x = Math.PI / 2;
    seal.add(coin);
    const inset = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.11, 40),
      new THREE.MeshStandardMaterial({ color: 0xffd877, roughness: 0.28, metalness: 0.55, emissive: 0x70430a, emissiveIntensity: 0.22 }),
    );
    inset.rotation.x = Math.PI / 2;
    inset.position.z = 0.014;
    seal.add(inset);

    const lockMaterial = new THREE.MeshStandardMaterial({ color: 0x162b3e, roughness: 0.28, metalness: 0.44, emissive: 0x0c3552, emissiveIntensity: 0.4 });
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.033, 9, 24), lockMaterial);
    shackle.position.set(0, 0.075, 0.096);
    seal.add(shackle);
    addBox(seal, [0.24, 0.19, 0.09], [0, -0.075, 0.105], 0x172e42, { roughness: 0.3, metalness: 0.42, emissive: 0x0d4260, emissiveIntensity: 0.38 });
    addBox(seal, [0.032, 0.065, 0.014], [0, -0.06, 0.157], 0xffd877, { roughness: 0.24, metalness: 0.42, emissive: 0xa76d15, emissiveIntensity: 0.45 });

    // Thin orbit tracks and two motes make the lock read as an active escrow.
    const orbitPivot = new THREE.Group();
    orbitPivot.position.copy(seal.position);
    folio.add(orbitPivot);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x60ceff, transparent: true, opacity: 0.46 });
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.009, 6, 72), ringMaterial);
    orbitRing.position.z = 0.06;
    orbitPivot.add(orbitRing);
    const farRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.006, 5, 72),
      new THREE.MeshBasicMaterial({ color: 0x778cff, transparent: true, opacity: 0.34 }),
    );
    farRing.rotation.set(0.42, -0.36, 0.25);
    farRing.position.z = 0.04;
    orbitPivot.add(farRing);
    const mote = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.045, 1),
      new THREE.MeshBasicMaterial({ color: 0xa8ecff }),
    );
    orbitPivot.add(mote);
    const moteTwo = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd77c }),
    );
    moteTwo.position.set(-0.58, 0.04, 0.04);
    orbitPivot.add(moteTwo);
    const sealLight = new THREE.PointLight(0x36adff, 1.8, 1.8);
    sealLight.position.set(0.73, -0.76, 0.65);
    scene.add(sealLight);

    camera.position.set(0, 0, 5.35);
    camera.lookAt(0, 0, 0);

    let width = 0;
    let height = 0;
    let reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    let inView = true;
    const target = { x: 0, y: 0 };

    const draw = (time = 0) => {
      if (!width || !height) return;
      const t = reduced ? 0 : time / 1000;
      const desiredX = -0.12 + target.y * 0.09 + Math.sin(t * 0.29) * 0.024;
      const desiredY = -0.18 + target.x * 0.11 + Math.sin(t * 0.23) * 0.04;
      folio.rotation.x += (desiredX - folio.rotation.x) * (reduced ? 1 : 0.055);
      folio.rotation.y += (desiredY - folio.rotation.y) * (reduced ? 1 : 0.055);
      folio.position.y = reduced ? 0 : Math.sin(t * 0.56) * 0.032;
      orbitRing.rotation.z = reduced ? 0 : t * 0.2;
      farRing.rotation.z = reduced ? 0.25 : 0.25 - t * 0.115;
      mote.position.set(Math.cos(t * 1.1) * 0.58, Math.sin(t * 1.1) * 0.58, 0.1 + Math.sin(t * 1.8) * 0.035);
      mote.rotation.x = t * 0.8;
      mote.rotation.y = t * 1.1;
      seal.rotation.z = reduced ? 0 : Math.sin(t * 0.48) * 0.028;
      sealLight.intensity = reduced ? 1.65 : 1.5 + (Math.sin(t * 1.5) + 1) * 0.22;
      renderer.render(scene, camera);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      width = rect.width;
      height = rect.height;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.25));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitHeight = 2.85 / (2 * Math.tan(fov / 2));
      const fitWidth = 2.65 / (2 * Math.tan(fov / 2) * camera.aspect);
      camera.position.z = Math.max(fitHeight, fitWidth) * 1.12;
      camera.updateProjectionMatrix();
      if (reduced || !inView || document.hidden) draw(0);
    };
    const syncLoop = () => {
      if (reduced || !inView || document.hidden) {
        renderer.setAnimationLoop(null);
        draw(0);
      } else {
        renderer.setAnimationLoop(draw);
      }
    };
    const onPointerMove = (event) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
      target.y = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
    };
    const onPointerLeave = () => { target.x = 0; target.y = 0; };
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotionChange = (event) => { reduced = event.matches; syncLoop(); };
    const onVisibility = () => syncLoop();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave);
    const viewObserver = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncLoop();
    }) : null;
    viewObserver?.observe(host);
    if (motionQuery?.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else motionQuery?.addListener?.(onMotionChange);
    document.addEventListener("visibilitychange", onVisibility);
    syncLoop();

    return () => {
      observer.disconnect();
      viewObserver?.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener("change", onMotionChange);
      else motionQuery?.removeListener?.(onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.setAnimationLoop(null);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else if (object.material) object.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return available
    ? <canvas ref={canvasRef} className="escrow-scene" aria-hidden="true"/>
    : <div className="scene-fallback" aria-hidden="true"><LockKeyhole size={30}/></div>;
}
