import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EscrowScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8.4);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.1 : 1.35));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xd7e5dc, 1.25));
    const keyLight = new THREE.PointLight(0xcde5aa, 34, 12);
    keyLight.position.set(2.7, 2.4, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x8daeb8, 24, 12);
    rimLight.position.set(-3, -1.6, 1.5);
    scene.add(rimLight);

    const vault = new THREE.Group();
    group.add(vault);
    const coreMaterial = new THREE.MeshPhysicalMaterial({ color: 0x246a52, metalness: 0.34, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.18, emissive: 0x102c20, emissiveIntensity: 0.3, transparent: true, opacity: 0.76 });
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), coreMaterial);
    vault.add(core);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry), new THREE.LineBasicMaterial({ color: 0xcde8a8, transparent: true, opacity: 0.88 }));
    frame.scale.setScalar(1.002);
    vault.add(frame);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.17, 48), new THREE.MeshPhysicalMaterial({ color: 0xd1ad6c, metalness: 0.78, roughness: 0.22, clearcoat: 1, emissive: 0x483518, emissiveIntensity: 0.2 }));
    coin.rotation.x = Math.PI / 2;
    coin.position.z = 0.98;
    vault.add(coin);
    const mark = new THREE.Group();
    const markMaterial = new THREE.MeshBasicMaterial({ color: 0xf8e6bb });
    const markTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), markMaterial);
    markTop.scale.set(0.58, 0.88, 0.15);
    markTop.position.y = 0.09;
    const markBottom = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), markMaterial);
    markBottom.scale.set(0.58, 0.78, 0.15);
    markBottom.position.y = -0.15;
    mark.add(markTop, markBottom);
    mark.position.set(0, 0, 1.08);
    vault.add(mark);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x6e9e74, transparent: true, opacity: 0.58, side: THREE.DoubleSide });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.015, 8, 144), ringMaterial);
    ringA.rotation.set(0.82, 0.16, 0.28);
    group.add(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.01, 8, 144), new THREE.MeshBasicMaterial({ color: 0x7191a1, transparent: true, opacity: 0.38 }));
    ringB.rotation.set(-0.56, 0.6, -0.48);
    group.add(ringB);

    const dotMaterials = [0xd3e5ae, 0x90b6c6, 0xc9ad84].map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.84 }));
    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (index / 11) * 2;
      const radius = Math.sqrt(1 - y * y);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(index % 4 === 0 ? 0.055 : 0.032, 10, 10), dotMaterials[index % dotMaterials.length]);
      dot.position.set(Math.cos(angle) * radius * 2.35, y * 2.35, Math.sin(angle) * radius * 1.15);
      scene.add(dot);
    }

    const starCount = 90;
    const positions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 8.4;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 6.5;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 3.2 - 0.7;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0x8fa599, size: 0.018, transparent: true, opacity: 0.58, sizeAttenuation: true });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const render = (time = 0) => {
      const seconds = time / 1000;
      vault.rotation.y = seconds * 0.12;
      vault.rotation.x = Math.sin(seconds * 0.2) * 0.055;
      coin.rotation.z = Math.sin(seconds * 0.32) * 0.035;
      ringA.rotation.z = 0.28 + Math.sin(seconds * 0.22) * 0.07;
      ringB.rotation.y = 0.6 + seconds * 0.055;
      group.position.y = Math.sin(seconds * 0.45) * 0.07;
      stars.rotation.y = seconds * 0.008;
      renderer.render(scene, camera);
    };
    let shouldReduceMotion = motionQuery?.matches ?? false;
    const syncAnimation = () => {
      if (shouldReduceMotion || document.hidden) {
        renderer.setAnimationLoop(null);
        render();
      } else {
        renderer.setAnimationLoop(render);
      }
    };
    const onMotionChange = (event) => {
      shouldReduceMotion = event.matches;
      syncAnimation();
    };
    const onVisibilityChange = () => syncAnimation();
    if (motionQuery?.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else motionQuery?.addListener?.(onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    syncAnimation();

    return () => {
      observer.disconnect();
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener("change", onMotionChange);
      else motionQuery?.removeListener?.(onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.setAnimationLoop(null);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="escrow-scene" aria-hidden="true"/>;
}
