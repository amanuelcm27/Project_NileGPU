"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Mesh,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { tokens } from "@/lib/config/theme";

/**
 * Lightweight, procedural 3D acceleration board.
 *
 * Everything is generated from primitive geometry and a canvas-generated circuit
 * texture — there are no model downloads, so the scene stays small and the
 * first meaningful paint is not blocked. The scene is only mounted on large
 * screens without a reduced-motion preference, and it is paused whenever it
 * scrolls out of view or the tab is hidden.
 */

/** Deterministic PRNG so the board looks identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useCircuitTexture(): CanvasTexture | null {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const random = mulberry32(20261018);

    ctx.fillStyle = "#0C0E0C";
    ctx.fillRect(0, 0, size, size);

    // Layout floorplan blocks
    ctx.strokeStyle = "rgba(245, 230, 66, 0.10)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 16; i += 1) {
      const p = (i * size) / 16;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Functional blocks (scheduler, tensor cores, memory controllers)
    for (let block = 0; block < 34; block += 1) {
      const w = 26 + random() * 84;
      const h = 22 + random() * 70;
      const x = Math.round(random() * (size - w));
      const y = Math.round(random() * (size - h));
      ctx.fillStyle = `rgba(245, 230, 66, ${0.03 + random() * 0.05})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(245, 230, 66, 0.22)";
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    // Manhattan-routed traces
    ctx.lineWidth = 1.4;
    for (let trace = 0; trace < 120; trace += 1) {
      ctx.strokeStyle = `rgba(245, 230, 66, ${0.06 + random() * 0.24})`;
      let x = Math.round(random() * size);
      let y = Math.round(random() * size);
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 2 + Math.floor(random() * 3);
      for (let step = 0; step < steps; step += 1) {
        if (random() > 0.5) {
          x += (random() > 0.5 ? 1 : -1) * (18 + random() * 70);
        } else {
          y += (random() > 0.5 ? 1 : -1) * (18 + random() * 70);
        }
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const canvasTexture = new CanvasTexture(canvas);
    canvasTexture.wrapS = RepeatWrapping;
    canvasTexture.wrapT = RepeatWrapping;
    canvasTexture.colorSpace = SRGBColorSpace;
    canvasTexture.anisotropy = 4;
    return canvasTexture;
  }, []);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}

function buildTraceGeometry(): BufferGeometry {
  const points: number[] = [];
  const random = mulberry32(77);
  const y = 0.1;

  for (let index = 0; index < 30; index += 1) {
    const z = -1.15 + random() * 2.3;
    const direction = random() > 0.5 ? 1 : -1;
    const start = direction * (0.85 + random() * 0.2);
    const end = direction * (1.5 + random() * 1.1);
    points.push(start, y, z, end, y, z);
  }

  for (let index = 0; index < 18; index += 1) {
    const x = -2.1 + random() * 4.2;
    points.push(x, y, -1.2, x, y, -0.95 - random() * 0.5);
    points.push(x, y, 1.2, x, y, 0.95 + random() * 0.5);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

function useFinGeometry() {
  return useMemo(() => {
    const geometry = new BoxGeometry(0.035, 0.16, 0.46);
    return geometry;
  }, []);
}

function Accelerator() {
  const group = useRef<Group>(null);
  const scan = useRef<Mesh>(null);
  const circuitTexture = useCircuitTexture();
  const textureRef = useRef<CanvasTexture | null>(null);
  const traces = useMemo(() => buildTraceGeometry(), []);
  const finGeometry = useFinGeometry();

  useEffect(() => {
    textureRef.current = circuitTexture;
  }, [circuitTexture]);

  useEffect(() => {
    return () => {
      traces.dispose();
      finGeometry.dispose();
    };
  }, [traces, finGeometry]);

  const fins = useMemo(
    () => Array.from({ length: 40 }, (_, index) => -2.35 + index * 0.12),
    [],
  );

  useFrame((state, delta) => {
    const current = group.current;
    if (!current) return;

    const time = state.clock.elapsedTime;
    const targetY = Math.sin(time * 0.16) * 0.32 + state.pointer.x * 0.14;
    const targetX = -0.26 + Math.sin(time * 0.22) * 0.03 - state.pointer.y * 0.06;

    current.rotation.y = MathUtils.damp(current.rotation.y, targetY, 2.4, delta);
    current.rotation.x = MathUtils.damp(current.rotation.x, targetX, 2.4, delta);
    current.position.y = Math.sin(time * 0.46) * 0.05;

    if (textureRef.current) {
      textureRef.current.offset.y = (time * 0.045) % 1;
    }

    if (scan.current) {
      scan.current.position.z = ((time * 0.22) % 1) * 2.4 - 1.2;
    }
  });

  return (
    <group ref={group} rotation={[-0.26, 0, 0]}>
      {/* Substrate */}
      <mesh>
        <boxGeometry args={[5, 0.16, 2.6]} />
        <meshStandardMaterial color="#121412" metalness={0.45} roughness={0.62} />
      </mesh>

      {/* Edge accent under the substrate */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[5.06, 0.04, 2.66]} />
        <meshBasicMaterial color={tokens.color.primary} transparent opacity={0.35} />
      </mesh>

      {/* Compute die */}
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[1.55, 0.18, 1.55]} />
        <meshStandardMaterial
          color="#141712"
          metalness={0.85}
          roughness={0.3}
          map={circuitTexture}
          emissiveMap={circuitTexture}
          emissive={new Color(tokens.color.primary)}
          emissiveIntensity={0.75}
        />
      </mesh>

      {/* Die frame */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.78, 0.1, 1.78]} />
        <meshStandardMaterial color="#1C2018" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Memory stacks */}
      {[
        [-1.7, -0.62],
        [-1.7, 0.62],
        [1.7, -0.62],
        [1.7, 0.62],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x ?? 0, 0.15, z ?? 0]}>
          <boxGeometry args={[0.86, 0.14, 1.05]} />
          <meshStandardMaterial color="#171A15" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}

      {/* Power stage */}
      {Array.from({ length: 14 }).map((_, index) => (
        <mesh key={`p-${index}`} position={[-2.1 + index * 0.32, 0.1, -1.1]}>
          <boxGeometry args={[0.2, 0.06, 0.14]} />
          <meshStandardMaterial color="#1E221A" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* Cooling fin rows along the board edges */}
      {fins.map((x) => (
        <mesh
          key={`f-${x.toFixed(2)}-a`}
          position={[x, 0.12, 1.18]}
          geometry={finGeometry}
        >
          <meshStandardMaterial color="#20241C" metalness={0.55} roughness={0.5} />
        </mesh>
      ))}
      {fins.map((x) => (
        <mesh
          key={`f-${x.toFixed(2)}-b`}
          position={[x, 0.12, -1.18]}
          geometry={finGeometry}
        >
          <meshStandardMaterial color="#20241C" metalness={0.55} roughness={0.5} />
        </mesh>
      ))}

      {/* Board-level routing */}
      <lineSegments geometry={traces}>
        <lineBasicMaterial color={tokens.color.primary} transparent opacity={0.32} />
      </lineSegments>

      {/* Scanning plane */}
      <mesh ref={scan} position={[0, 0.28, 0]}>
        <planeGeometry args={[4.8, 2.4]} />
        <meshBasicMaterial
          color={tokens.color.primaryBright}
          transparent
          opacity={0.06}
          blending={AdditiveBlending}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function GpuScene({
  active = true,
  onReady,
}: {
  active?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0.2, 2.9, 5.5], fov: 32 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0.1, 0);
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        onReady?.();
      }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3.6, 5.2, 2.6]} intensity={2.4} color="#FFF6D6" />
      <directionalLight position={[-3.4, 1.4, -2.6]} intensity={0.7} color="#F5E642" />
      <pointLight position={[-3.6, 1.8, -1.4]} intensity={26} distance={16} color="#F5E642" />
      <pointLight position={[3.2, -1.2, 3.2]} intensity={12} distance={14} color="#FFF27A" />
      <Accelerator />
    </Canvas>
  );
}
