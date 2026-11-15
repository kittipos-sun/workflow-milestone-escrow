import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LockKeyhole } from "lucide-react";

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    const stage = new THREE.Group();
    stage.rotation.set(-0.12, -0.18, -0.04);
    scene.add(stage);

    scene.add(new THREE.AmbientLight(0xeaf2f5, 1.6));
    const key = new THREE.DirectionalLight(0xfff0ce, 2.1);
    key.position.set(-2.4, 3.2, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fb9d1, 1.25);
    fill.position.set(3, -1.5, 3);
    scene.add(fill);

    const addBox = (parent, size, position, color, material = {}) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size[0], size[1], size[2]),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.04, ...material }),
      );
      mesh.position.set(position[0], position[1], position[2]);
      parent.add(mesh);
      return mesh;
    };

    // A contract folio, its pages and the escrow seal are decorative.
    addBox(stage, [1.98, 2.52, 0.14], [0, 0, -0.19], 0x183c51, { roughness: 0.6 });
    addBox(stage, [1.9, 2.45, 0.06], [0.035, -0.015, -0.085], 0xd8e3e8);
    addBox(stage, [1.82, 2.37, 0.055], [0.025, -0.005, -0.015], 0xf7f9f8);

    addBox(stage, [0.78, 0.1, 0.025], [-0.43, 0.9, 0.025], 0x24669b, { roughness: 0.45 });
    addBox(stage, [0.18, 0.1, 0.03], [0.68, 0.9, 0.03], 0xe0b85a, { roughness: 0.4, metalness: 0.22 });

    const ink = 0x9bb0bb;
    [-0.18, -0.39, -0.6, -0.81].forEach((y, index) => {
      addBox(stage, [index === 0 ? 1.25 : 1.48, 0.045, 0.02], [-0.07, y, 0.03], ink);
    });
    [-0.29, -0.5, -0.71].forEach((y) => {
      addBox(stage, [0.78, 0.028, 0.018], [-0.42, y, 0.03], 0xc5d1d5);
    });

    const seal = new THREE.Group();
    seal.position.set(0.74, -0.78, 0.21);
    stage.add(seal);
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.1, 40),
      new THREE.MeshStandardMaterial({ color: 0xd4aa50, roughness: 0.3, metalness: 0.62 }),
    );
    coin.rotation.x = Math.PI / 2;
    seal.add(coin);
    const inset = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.105, 40),
      new THREE.MeshStandardMaterial({ color: 0xf1d580, roughness: 0.34, metalness: 0.48 }),
    );
    inset.rotation.x = Math.PI / 2;
    inset.position.z = 0.012;
    seal.add(inset);

    const shackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.035, 9, 24),
      new THREE.MeshStandardMaterial({ color: 0x214b63, roughness: 0.42, metalness: 0.22 }),
    );
    shackle.position.set(0, 0.075, 0.095);
    seal.add(shackle);
    addBox(seal, [0.25, 0.2, 0.09], [0, -0.075, 0.11], 0x214b63, { roughness: 0.42, metalness: 0.22 });
    addBox(seal, [0.035, 0.07, 0.012], [0, -0.06, 0.16], 0xf1d580, { roughness: 0.38, metalness: 0.28 });

    camera.position.set(0, 0, 5.35);
    camera.lookAt(0, 0, 0);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      width = rect.width;
      height = rect.height;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.1 : 1.35));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitHeight = 2.85 / (2 * Math.tan(fov / 2));
      const fitWidth = 2.65 / (2 * Math.tan(fov / 2) * camera.aspect);
      camera.position.z = Math.max(fitHeight, fitWidth) * 1.12;
      camera.updateProjectionMatrix();
      if (reduced || !inView || document.hidden) draw(0);
    };

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery?.matches ?? false;
    let inView = true;
    let pointerX = 0;
    let pointerY = 0;
    const target = { x: 0, y: 0 };
    const draw = (time = 0) => {
      if (!width || !height) return;
      const t = reduced ? 0 : time / 1000;
      const desiredX = -0.12 + target.y * 0.1 + Math.sin(t * 0.32) * 0.025;
      const desiredY = -0.18 + target.x * 0.12 + Math.sin(t * 0.25) * 0.045;
      stage.rotation.x += (desiredX - stage.rotation.x) * (reduced ? 1 : 0.055);
      stage.rotation.y += (desiredY - stage.rotation.y) * (reduced ? 1 : 0.055);
      stage.position.y = reduced ? 0 : Math.sin(t * 0.55) * 0.035;
      renderer.render(scene, camera);
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
        if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
        else if (object.material) object.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return available
    ? <canvas ref={canvasRef} className="escrow-scene" aria-hidden="true"/>
    : <div className="scene-fallback" aria-hidden="true"><LockKeyhole size={30}/></div>;
}