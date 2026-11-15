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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xcbd8ff, 1.35));
    const keyLight = new THREE.PointLight(0xd5ff83, 42, 12);
    keyLight.position.set(2.7, 2.4, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6d9eff, 30, 12);
    rimLight.position.set(-3, -1.6, 1.5);
    scene.add(rimLight);

    const coreMaterial = new THREE.MeshPhysicalMaterial({ color: 0x354a32, metalness: 0.68, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.14, emissive: 0x324823, emissiveIntensity: 0.78 });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), coreMaterial);
    group.add(core);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), new THREE.MeshStandardMaterial({ color: 0xdafa91, metalness: 0.52, roughness: 0.23, emissive: 0x668928, emissiveIntensity: 0.55, flatShading: true }));
    inner.position.z = 1.1;
    group.add(inner);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xb8e86a, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.013, 8, 180), ringMaterial);
    ringA.rotation.set(0.82, 0.16, 0.28);
    group.add(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.008, 8, 180), new THREE.MeshBasicMaterial({ color: 0x87a9ff, transparent: true, opacity: 0.46 }));
    ringB.rotation.set(-0.56, 0.6, -0.48);
    group.add(ringB);

    const dots = [];
    const dotMaterials = [0xe0ff9c, 0x8fb4ff, 0xc6a8ff].map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    for (let index = 0; index < 18; index += 1) {
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (index / 17) * 2;
      const radius = Math.sqrt(1 - y * y);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(index % 4 === 0 ? 0.055 : 0.032, 10, 10), dotMaterials[index % dotMaterials.length]);
      dot.position.set(Math.cos(angle) * radius * 2.35, y * 2.35, Math.sin(angle) * radius * 1.15);
      scene.add(dot);
      dots.push(dot);
    }

    const starCount = 180;
    const positions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 8.4;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 6.5;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 3.2 - 0.7;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xb8c8e8, size: 0.018, transparent: true, opacity: 0.7, sizeAttenuation: true });
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

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const render = (time = 0) => {
      const seconds = time / 1000;
      core.rotation.y = seconds * 0.13;
      core.rotation.x = Math.sin(seconds * 0.2) * 0.08;
      inner.rotation.y = -seconds * 0.19;
      inner.rotation.x = seconds * 0.12;
      ringA.rotation.z = 0.28 + Math.sin(seconds * 0.22) * 0.07;
      ringB.rotation.y = 0.6 + seconds * 0.055;
      group.position.y = Math.sin(seconds * 0.45) * 0.07;
      stars.rotation.y = seconds * 0.008;
      renderer.render(scene, camera);
    };
    if (reduceMotion) render();
    else renderer.setAnimationLoop(render);

    return () => {
      observer.disconnect();
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
