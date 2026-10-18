"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { tokens } from "@/lib/config/theme";

/**
 * Interactive, procedural 3D graphics card.
 *
 * Modelled from primitives only, so there are no model downloads and the hero
 * stays small. The card can be dragged to rotate and clicked to explode into its
 * layers (shroud, fans, heatsink, PCB, backplate) then clicked again to close.
 *
 * The scene is only mounted on large screens without a reduced-motion
 * preference, and it is paused whenever it scrolls out of view or the tab is
 * hidden.
 */

const CARD_W = 3.6;
const CARD_H = 1.9;

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

/** Circuit-board texture for the GPU die face. */
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

const BODY = "#1E232A";
const BODY_LIGHT = "#2A313B";
const METAL = "#2A3027";
const FIN = "#313830";
const GOLD = "#C9A24A";

/** A twin-fan GPU cooler: perimeter shroud bars plus two spinning fans. */
function Shroud({
  fanRefs,
}: {
  fanRefs: [RefObject<Group | null>, RefObject<Group | null>];
}) {
  const bars: Array<[number, number, number, number]> = [
    [CARD_W, 0.18, 0, CARD_H / 2 - 0.09],
    [CARD_W, 0.18, 0, -CARD_H / 2 + 0.09],
    [0.16, CARD_H, -CARD_W / 2 + 0.08, 0],
    [0.16, CARD_H, CARD_W / 2 - 0.08, 0],
    [0.16, CARD_H, 0, 0],
  ];

  const blades = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * Math.PI * 2;
        return {
          angle,
          x: Math.cos(angle) * 0.4,
          y: Math.sin(angle) * 0.4,
        };
      }),
    [],
  );

  return (
    <group>
      {bars.map(([w, h, x, y], index) => (
        <mesh key={`bar-${index}`} position={[x, y, 0.02]}>
          <boxGeometry args={[w, h, 0.34]} />
          <meshStandardMaterial color={BODY} metalness={0.6} roughness={0.42} />
        </mesh>
      ))}

      {/* Accent strip along the lower shroud */}
      <mesh position={[0, -CARD_H / 2 + 0.19, 0.2]}>
        <boxGeometry args={[CARD_W - 0.5, 0.03, 0.02]} />
        <meshBasicMaterial color={tokens.color.primary} />
      </mesh>

      {[-0.86, 0.86].map((x, index) => (
        <group key={`fan-${x}`} position={[x, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          {/* Frame ring */}
          <mesh>
            <cylinderGeometry args={[0.7, 0.7, 0.3, 32, 1, true]} />
            <meshStandardMaterial color={BODY_LIGHT} metalness={0.55} roughness={0.5} side={DoubleSide} />
          </mesh>

          {/* Rotor: hub + blades */}
          <group ref={fanRefs[index]}>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.17, 0.17, 0.32, 20]} />
              <meshStandardMaterial color="#0E1013" metalness={0.75} roughness={0.3} />
            </mesh>
            {blades.map((blade) => (
              <mesh
                key={`blade-${blade.angle.toFixed(2)}`}
                position={[blade.x, 0.01, blade.y]}
                rotation={[0, -blade.angle, 0]}
              >
                <boxGeometry args={[0.34, 0.03, 0.16]} />
                <meshStandardMaterial color={BODY_LIGHT} metalness={0.4} roughness={0.6} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Dense fin stack that sits between the PCB and the shroud. */
function Heatsink() {
  const fins = useMemo(
    () => Array.from({ length: 26 }, (_, index) => -CARD_W / 2 + 0.2 + index * 0.125),
    [],
  );
  return (
    <group>
      {fins.map((x) => (
        <mesh key={`fin-${x.toFixed(2)}`} position={[x, 0, 0]}>
          <boxGeometry args={[0.045, CARD_H - 0.34, 0.3]} />
          <meshStandardMaterial color={FIN} metalness={0.7} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/** Printed circuit board with die, memory packages, PCIe fingers and connectors. */
function Board({ circuitTexture }: { circuitTexture: CanvasTexture | null }) {
  const memory = useMemo(
    () => [
      [-1.25, 0.5],
      [-1.25, -0.5],
      [1.25, 0.5],
      [1.25, -0.5],
      [-0.75, 0.62],
      [0.75, 0.62],
      [-0.75, -0.62],
      [0.75, -0.62],
    ],
    [],
  );

  return (
    <group>
      {/* PCB substrate */}
      <mesh>
        <boxGeometry args={[CARD_W - 0.1, CARD_H - 0.1, 0.07]} />
        <meshStandardMaterial color="#0E100D" metalness={0.35} roughness={0.7} />
      </mesh>

      {/* GPU die + frame */}
      <mesh position={[0, 0.05, 0.06]}>
        <boxGeometry args={[0.92, 0.92, 0.06]} />
        <meshStandardMaterial color="#171A15" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0.1]}>
        <boxGeometry args={[0.78, 0.78, 0.04]} />
        <meshStandardMaterial
          color="#141712"
          metalness={0.85}
          roughness={0.3}
          map={circuitTexture}
          emissiveMap={circuitTexture}
          emissive={new Color(tokens.color.primary)}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Memory packages */}
      {memory.map(([x, y]) => (
        <mesh key={`mem-${x}-${y}`} position={[x ?? 0, y ?? 0, 0.06]}>
          <boxGeometry args={[0.4, 0.2, 0.05]} />
          <meshStandardMaterial color="#161A15" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}

      {/* PCIe gold fingers along the bottom edge */}
      <mesh position={[0, -CARD_H / 2 + 0.06, 0]}>
        <boxGeometry args={[1.5, 0.22, 0.1]} />
        <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.28} />
      </mesh>

      {/* Display outputs bracket on the left */}
      <mesh position={[-CARD_W / 2 + 0.04, 0, 0.16]}>
        <boxGeometry args={[0.06, CARD_H - 0.3, 0.5]} />
        <meshStandardMaterial color="#2A2E28" metalness={0.8} roughness={0.4} />
      </mesh>
      {[-0.34, 0, 0.34].map((y) => (
        <mesh key={`port-${y}`} position={[-CARD_W / 2 + 0.09, y, 0.16]}>
          <boxGeometry args={[0.04, 0.14, 0.22]} />
          <meshStandardMaterial color="#07090A" metalness={0.2} roughness={0.9} />
        </mesh>
      ))}

      {/* 12V power connector on the top edge */}
      <mesh position={[0.55, CARD_H / 2 - 0.08, 0.03]}>
        <boxGeometry args={[0.62, 0.16, 0.24]} />
        <meshStandardMaterial color="#0C0E10" metalness={0.4} roughness={0.7} />
      </mesh>

      {/* VRM row */}
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={`vrm-${index}`} position={[-1.1 + index * 0.22, CARD_H / 2 - 0.32, 0.06]}>
          <boxGeometry args={[0.14, 0.1, 0.05]} />
          <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Backplate() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[CARD_W - 0.06, CARD_H - 0.12, 0.05]} />
        <meshStandardMaterial color="#191D21" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[1.1, 0.3, 0.02]} />
        <meshBasicMaterial color={tokens.color.primary} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function GpuCard({ interactionRef }: { interactionRef: RefObject<HTMLDivElement | null> }) {
  const root = useRef<Group>(null);
  const shroud = useRef<Group>(null);
  const heatsink = useRef<Group>(null);
  const board = useRef<Group>(null);
  const backplate = useRef<Group>(null);
  const fanLeft = useRef<Group>(null);
  const fanRight = useRef<Group>(null);

  const circuitTexture = useCircuitTexture();

  const rotation = useRef({ x: -0.22, y: 0.5 });
  const target = useRef({ x: -0.22, y: 0.5 });
  const dragging = useRef(false);
  const explodeTarget = useRef(false);
  const explodeAmount = useRef(0);
  const gesture = useRef({ x: 0, y: 0, moved: 0, startedAt: 0 });

  useEffect(() => {
    const element = interactionRef.current;
    if (!element) return;

    element.style.cursor = "grab";

    const onPointerDown = (event: PointerEvent) => {
      dragging.current = true;
      gesture.current = {
        x: event.clientX,
        y: event.clientY,
        moved: 0,
        startedAt: performance.now(),
      };
      element.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - gesture.current.x;
      const dy = event.clientY - gesture.current.y;
      gesture.current.x = event.clientX;
      gesture.current.y = event.clientY;
      gesture.current.moved += Math.abs(dx) + Math.abs(dy);
      target.current.y += dx * 0.007;
      target.current.x = MathUtils.clamp(target.current.x + dy * 0.006, -1, 1);
    };

    const onPointerUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      element.style.cursor = "grab";
      const wasTap =
        gesture.current.moved < 8 && performance.now() - gesture.current.startedAt < 600;
      if (wasTap) explodeTarget.current = !explodeTarget.current;
    };

    element.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      element.style.cursor = "";
    };
  }, [interactionRef]);

  useFrame((state, delta) => {
    // Gentle idle spin whenever the visitor is not dragging.
    if (!dragging.current) target.current.y += delta * 0.12;

    rotation.current.x = MathUtils.damp(rotation.current.x, target.current.x, 5, delta);
    rotation.current.y = MathUtils.damp(rotation.current.y, target.current.y, 5, delta);

    if (root.current) {
      root.current.rotation.x = rotation.current.x;
      root.current.rotation.y = rotation.current.y;
      root.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
    }

    explodeAmount.current = MathUtils.damp(
      explodeAmount.current,
      explodeTarget.current ? 1 : 0,
      6,
      delta,
    );
    const amount = explodeAmount.current;

    if (shroud.current) shroud.current.position.z = 0.34 + amount * 1.2;
    if (heatsink.current) heatsink.current.position.z = 0.1 + amount * 0.6;
    if (board.current) board.current.position.z = -0.02 - amount * 0.38;
    if (backplate.current) backplate.current.position.z = -0.1 - amount * 1;
    if (root.current) root.current.scale.setScalar(1.02 - amount * 0.2);

    const spin = delta * (1.1 + amount * 6);
    if (fanLeft.current) fanLeft.current.rotation.y += spin;
    if (fanRight.current) fanRight.current.rotation.y -= spin;
  });

  return (
    <group ref={root} scale={1.02}>
      <group ref={shroud}>
        <Shroud fanRefs={[fanLeft, fanRight]} />
      </group>
      <group ref={heatsink} position={[0, 0, 0.1]}>
        <Heatsink />
      </group>
      <group ref={board}>
        <Board circuitTexture={circuitTexture} />
      </group>
      <group ref={backplate} position={[0, 0, -0.1]}>
        <Backplate />
      </group>
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
  const interactionRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={interactionRef} className="h-full w-full touch-none">
      <Canvas
        dpr={[1, 1.6]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0.35, 5.9], fov: 34 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0, 0);
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          onReady?.();
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3.6, 5.2, 4.2]} intensity={2.4} color="#FFF6D6" />
        <directionalLight position={[-3.4, 1.4, 2.6]} intensity={0.35} color="#F5E642" />
        <directionalLight position={[-2.5, 3.5, -4.5]} intensity={1.6} color="#F4F4EF" />
        <pointLight position={[-3.6, 1.8, 2.4]} intensity={10} distance={16} color="#F5E642" />
        <pointLight position={[3.2, -1.2, 3.2]} intensity={6} distance={14} color="#FFF27A" />
        <GpuCard interactionRef={interactionRef} />
      </Canvas>
    </div>
  );
}
