"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Path,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";
import { tokens } from "@/lib/config/theme";

/**
 * Interactive, procedural 3D graphics card.
 *
 * Modelled from primitives and extruded rounded profiles only, so there are no
 * model downloads and the hero stays small. The card can be dragged to rotate
 * and clicked to explode into its layers (shroud, fans, heatsink, PCB,
 * backplate), then clicked again to close.
 *
 * The scene is only mounted on large screens without a reduced-motion
 * preference, and it is paused whenever it scrolls out of view or the tab is
 * hidden.
 */

const CARD_W = 3.6;
const CARD_H = 1.9;
const CORNER_RADIUS = 0.18;
const SHROUD_DEPTH = 0.36;
const FAN_OFFSET = 0.86;
const FAN_RADIUS = 0.72;

const BODY = "#2C323A";
const BODY_LIGHT = "#39414C";
const BODY_DARK = "#15181D";
const METAL = "#2A3027";
const FIN = "#343B33";
const GOLD = "#C9A24A";
const COPPER = "#B87333";
const PRIMARY = new Color(tokens.color.primary);

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

/** Rounded rectangle in the XY plane, used for every extruded card layer. */
function roundedRectShape(width: number, height: number, radius: number): Shape {
  const halfW = width / 2;
  const halfH = height / 2;
  const r = Math.max(0, Math.min(radius, halfW, halfH));
  const shape = new Shape();

  shape.moveTo(-halfW + r, -halfH);
  shape.lineTo(halfW - r, -halfH);
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
  shape.lineTo(halfW, halfH - r);
  shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
  shape.lineTo(-halfW + r, halfH);
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
  shape.lineTo(-halfW, -halfH + r);
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
  shape.closePath();

  return shape;
}

/** Release manually-created geometry when a component unmounts. */
function useDispose(geometry: BufferGeometry) {
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
}

/** Extruded rounded slab: the soft-edged building block for every layer. */
function RoundedSlab({
  width,
  height,
  depth,
  radius = CORNER_RADIUS,
  position = [0, 0, 0],
  color,
  metalness = 0.65,
  roughness = 0.4,
}: {
  width: number;
  height: number;
  depth: number;
  radius?: number;
  position?: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  const geometry = useMemo(() => {
    const result = new ExtrudeGeometry(roundedRectShape(width, height, radius), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 12,
    });
    result.translate(0, 0, -depth / 2);
    result.computeVertexNormals();
    return result;
  }, [width, height, depth, radius]);

  useDispose(geometry);

  return (
    <mesh geometry={geometry} position={position}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
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

/** Countersunk fastener, face pointing along +Z unless flipped. */
function Screw({
  position,
  flip = false,
}: {
  position: [number, number, number];
  flip?: boolean;
}) {
  return (
    <group position={position} rotation={[flip ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.045, 0.022, 6]} />
        <meshStandardMaterial color="#5A6169" metalness={0.95} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.055, 0.006, 0.012]} />
        <meshStandardMaterial color="#0A0C0E" metalness={0.3} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** One axial fan: housing ring, pitched blades, hub cap and accent ring. */
function Fan({ x, fanRef }: { x: number; fanRef: RefObject<Group | null> | undefined }) {
  const blades = useMemo(
    () => Array.from({ length: 11 }, (_, index) => (index / 11) * Math.PI * 2),
    [],
  );

  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.705, 0.705, 0.3, 48, 1, true]} />
        <meshStandardMaterial
          color={BODY_LIGHT}
          metalness={0.65}
          roughness={0.4}
          side={DoubleSide}
        />
      </mesh>

      <group ref={fanRef} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.19, 0.205, 0.3, 24]} />
          <meshStandardMaterial color="#101318" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.168, 0]}>
          <cylinderGeometry args={[0.145, 0.145, 0.024, 28]} />
          <meshStandardMaterial color="#1A1F25" metalness={0.9} roughness={0.24} />
        </mesh>
        {blades.map((angle) => (
          <group key={angle.toFixed(3)} rotation={[0, -angle, 0]}>
            <mesh position={[0.42, 0.01, 0]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.44, 0.022, 0.2]} />
              <meshStandardMaterial color={BODY_LIGHT} metalness={0.45} roughness={0.55} />
            </mesh>
          </group>
        ))}
      </group>

      <mesh position={[0, 0, 0.185]}>
        <torusGeometry args={[0.688, 0.01, 8, 72]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.19]}>
        <ringGeometry args={[0.132, 0.158, 32]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Rounded shroud with two fan cut-outs plus trim, logo and fasteners. */
function Shroud({
  fanRefs,
}: {
  fanRefs: [RefObject<Group | null>, RefObject<Group | null>];
}) {
  const frame = useMemo(() => {
    const shape = roundedRectShape(CARD_W, CARD_H, CORNER_RADIUS);
    [-FAN_OFFSET, FAN_OFFSET].forEach((x) => {
      const hole = new Path();
      hole.absarc(x, 0, FAN_RADIUS, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    });

    const result = new ExtrudeGeometry(shape, {
      depth: SHROUD_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 28,
    });
    result.translate(0, 0, -SHROUD_DEPTH / 2);
    result.computeVertexNormals();
    return result;
  }, []);

  useDispose(frame);

  return (
    <group>
      <mesh geometry={frame}>
        <meshStandardMaterial color={BODY} metalness={0.62} roughness={0.44} />
      </mesh>

      {[-FAN_OFFSET, FAN_OFFSET].map((x, index) => (
        <Fan key={x} x={x} fanRef={fanRefs[index]} />
      ))}

      {/* Machined trim along the top and bottom edges */}
      {[CARD_H / 2 - 0.035, -CARD_H / 2 + 0.035].map((y) => (
        <mesh key={`trim-${y}`} position={[0, y, SHROUD_DEPTH / 2]}>
          <boxGeometry args={[CARD_W - 0.42, 0.018, 0.01]} />
          <meshStandardMaterial color="#6A727C" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}

      {/* Accent line along the lower shroud */}
      <mesh position={[0, -CARD_H / 2 + 0.16, SHROUD_DEPTH / 2 + 0.005]}>
        <boxGeometry args={[CARD_W - 0.62, 0.022, 0.012]} />
        <meshBasicMaterial color={PRIMARY} toneMapped={false} />
      </mesh>

      {/* Centre logo diamond */}
      <group
        position={[0, 0, SHROUD_DEPTH / 2 + 0.012]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <mesh>
          <boxGeometry args={[0.13, 0.13, 0.016]} />
          <meshStandardMaterial
            color={PRIMARY}
            metalness={0.3}
            roughness={0.35}
            emissive={PRIMARY}
            emissiveIntensity={0.25}
          />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[0.056, 0.056, 0.012]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>

      {/* Vent ticks on the centre bar */}
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={`vent-${index}`}
          position={[0, -0.44 + index * 0.085, SHROUD_DEPTH / 2 + 0.004]}
        >
          <boxGeometry args={[0.16, 0.016, 0.008]} />
          <meshBasicMaterial color={PRIMARY} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      ))}

      {/* Corner fasteners */}
      <Screw position={[-1.56, 0.72, SHROUD_DEPTH / 2 + 0.006]} />
      <Screw position={[1.56, 0.72, SHROUD_DEPTH / 2 + 0.006]} />
      <Screw position={[-1.56, -0.72, SHROUD_DEPTH / 2 + 0.006]} />
      <Screw position={[1.56, -0.72, SHROUD_DEPTH / 2 + 0.006]} />
    </group>
  );
}

/** Dense fin stack with heat pipes that sits between the PCB and the shroud. */
function Heatsink() {
  const fins = useMemo(
    () => Array.from({ length: 30 }, (_, index) => -CARD_W / 2 + 0.22 + index * 0.108),
    [],
  );

  return (
    <group>
      {fins.map((x) => (
        <mesh key={`fin-${x.toFixed(2)}`} position={[x, 0, 0]}>
          <boxGeometry args={[0.032, CARD_H - 0.42, 0.24]} />
          <meshStandardMaterial color={FIN} metalness={0.72} roughness={0.44} />
        </mesh>
      ))}

      {[-CARD_W / 2 + 0.18, CARD_W / 2 - 0.18].map((x) => (
        <mesh key={`endplate-${x}`} position={[x, 0, 0]}>
          <boxGeometry args={[0.06, CARD_H - 0.34, 0.26]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}

      {/* Heat pipes running the length of the card */}
      {[-0.6, -0.2, 0.2, 0.6].map((y) => (
        <mesh key={`pipe-${y}`} position={[0, y, -0.13]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, CARD_W - 0.46, 12]} />
          <meshStandardMaterial color={COPPER} metalness={0.95} roughness={0.3} />
        </mesh>
      ))}

      {/* Cold plate over the die */}
      <mesh position={[0, 0.02, -0.135]}>
        <boxGeometry args={[1.06, 0.92, 0.045]} />
        <meshStandardMaterial color={COPPER} metalness={0.9} roughness={0.32} />
      </mesh>
    </group>
  );
}

/** Printed circuit board with die, memory packages, PCIe fingers and connectors. */
function Board({ circuitTexture }: { circuitTexture: CanvasTexture | null }) {
  const memory = useMemo<Array<[number, number]>>(
    () => [
      [-1.3, 0.52],
      [-1.3, -0.52],
      [1.3, 0.52],
      [1.3, -0.52],
      [-0.8, 0.64],
      [0.8, 0.64],
      [-0.8, -0.64],
      [0.8, -0.64],
    ],
    [],
  );

  return (
    <group>
      <RoundedSlab
        width={CARD_W - 0.12}
        height={CARD_H - 0.12}
        depth={0.08}
        radius={0.15}
        color="#0E100D"
        metalness={0.38}
        roughness={0.7}
      />

      {/* GPU die + frame */}
      <mesh position={[0, 0.05, 0.05]}>
        <boxGeometry args={[0.96, 0.96, 0.06]} />
        <meshStandardMaterial color="#171A15" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0.09]}>
        <boxGeometry args={[0.8, 0.8, 0.035]} />
        <meshStandardMaterial
          color="#141712"
          metalness={0.85}
          roughness={0.3}
          map={circuitTexture}
          emissiveMap={circuitTexture}
          emissive={PRIMARY}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Memory packages */}
      {memory.map(([x, y]) => (
        <group key={`mem-${x}-${y}`} position={[x, y, 0.055]}>
          <mesh>
            <boxGeometry args={[0.42, 0.21, 0.055]} />
            <meshStandardMaterial color="#161A15" metalness={0.6} roughness={0.48} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.34, 0.13, 0.004]} />
            <meshBasicMaterial color={PRIMARY} transparent opacity={0.12} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* VRM chokes */}
      {Array.from({ length: 8 }).map((_, index) => (
        <mesh
          key={`vrm-${index}`}
          position={[-1.18 + index * 0.19, CARD_H / 2 - 0.3, 0.06]}
        >
          <boxGeometry args={[0.15, 0.12, 0.075]} />
          <meshStandardMaterial color={METAL} metalness={0.55} roughness={0.55} />
        </mesh>
      ))}

      {/* Decoupling capacitors under the memory row */}
      {Array.from({ length: 10 }).map((_, index) => (
        <mesh
          key={`cap-${index}`}
          position={[-1.2 + index * 0.1, -0.78, 0.06]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.028, 0.028, 0.1, 10]} />
          <meshStandardMaterial color="#23262B" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}

      {/* PCIe gold fingers along the bottom edge */}
      {Array.from({ length: 24 }).map((_, index) => (
        <mesh
          key={`finger-${index}`}
          position={[-0.9 + index * 0.078, -CARD_H / 2 + 0.13, 0.02]}
        >
          <boxGeometry args={[0.046, 0.16, 0.09]} />
          <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.26} />
        </mesh>
      ))}

      {/* Display outputs bracket on the left */}
      <mesh position={[-CARD_W / 2 + 0.035, 0, 0.12]}>
        <boxGeometry args={[0.07, CARD_H - 0.26, 0.46]} />
        <meshStandardMaterial color="#2A2E28" metalness={0.8} roughness={0.4} />
      </mesh>
      {[-0.35, 0, 0.35].map((y) => (
        <mesh key={`port-${y}`} position={[-CARD_W / 2 + 0.08, y, 0.12]}>
          <boxGeometry args={[0.04, 0.16, 0.2]} />
          <meshStandardMaterial color="#07090A" metalness={0.2} roughness={0.9} />
        </mesh>
      ))}
      {[-0.52, -0.3, -0.08, 0.14, 0.36].map((y) => (
        <mesh key={`bracket-vent-${y}`} position={[-CARD_W / 2 + 0.08, y, 0.12]}>
          <boxGeometry args={[0.04, 0.018, 0.12]} />
          <meshStandardMaterial color="#0B0D0C" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}

      {/* 12V power connector with pins */}
      <group position={[0.55, CARD_H / 2 - 0.12, 0.05]}>
        <mesh>
          <boxGeometry args={[0.72, 0.22, 0.26]} />
          <meshStandardMaterial color="#0C0E10" metalness={0.45} roughness={0.62} />
        </mesh>
        {Array.from({ length: 12 }).map((_, index) => {
          const column = index % 6;
          const row = Math.floor(index / 6);
          return (
            <mesh
              key={`pin-${index}`}
              position={[-0.25 + column * 0.1, 0.03 - row * 0.08, 0.135]}
            >
              <boxGeometry args={[0.045, 0.04, 0.01]} />
              <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.3} />
            </mesh>
          );
        })}
      </group>

      {/* Board silkscreen accent */}
      <mesh position={[0.95, -0.78, 0.042]}>
        <boxGeometry args={[0.7, 0.012, 0.004]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Backplate() {
  return (
    <group>
      <RoundedSlab
        width={CARD_W - 0.08}
        height={CARD_H - 0.16}
        depth={0.06}
        radius={0.16}
        color="#1B1F24"
        metalness={0.68}
        roughness={0.42}
      />

      {/* Vent slots */}
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={`slot-${index}`} position={[1.16, -0.48 + index * 0.16, -0.04]}>
          <boxGeometry args={[0.78, 0.04, 0.012]} />
          <meshStandardMaterial color="#080A0B" metalness={0.3} roughness={0.85} />
        </mesh>
      ))}

      {/* Accent strip */}
      <mesh position={[-1.0, 0.66, -0.04]}>
        <boxGeometry args={[0.9, 0.022, 0.01]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {/* Recessed centre plate */}
      <mesh position={[0, -0.05, -0.04]}>
        <boxGeometry args={[0.72, 0.26, 0.012]} />
        <meshStandardMaterial color="#101317" metalness={0.7} roughness={0.5} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={`plate-line-${index}`} position={[0, 0.02 - index * 0.05, -0.047]}>
          <boxGeometry args={[0.44, 0.012, 0.006]} />
          <meshBasicMaterial
            color={PRIMARY}
            transparent
            opacity={0.3 - index * 0.07}
            toneMapped={false}
          />
        </mesh>
      ))}

      <Screw position={[-1.56, -0.72, -0.04]} flip />
      <Screw position={[1.56, -0.72, -0.04]} flip />
      <Screw position={[-1.56, 0.72, -0.04]} flip />
      <Screw position={[1.56, 0.72, -0.04]} flip />
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

    if (shroud.current) shroud.current.position.z = 0.34 + amount * 1;
    if (heatsink.current) heatsink.current.position.z = 0.1 + amount * 0.5;
    if (board.current) board.current.position.z = -0.02 - amount * 0.34;
    if (backplate.current) backplate.current.position.z = -0.1 - amount * 1;
    if (root.current) root.current.scale.setScalar(1.02 - amount * 0.34);

    const spin = delta * (1.1 + amount * 6);
    if (fanLeft.current) fanLeft.current.rotation.y += spin;
    if (fanRight.current) fanRight.current.rotation.y -= spin;
  });

  return (
    <group ref={root} scale={1.02}>
      <group ref={shroud} position={[0, 0, 0.34]}>
        <Shroud fanRefs={[fanLeft, fanRight]} />
      </group>
      <group ref={heatsink} position={[0, 0, 0.1]}>
        <Heatsink />
      </group>
      <group ref={board} position={[0, 0, -0.02]}>
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
        <ambientLight intensity={0.95} />
        <directionalLight position={[3.6, 5.2, 4.2]} intensity={2.5} color="#FFF6D6" />
        <directionalLight position={[-3.4, 1.6, 2.8]} intensity={0.5} color="#F5E642" />
        <directionalLight position={[-2.5, 3.5, -4.5]} intensity={1.5} color="#F4F4EF" />
        <directionalLight position={[0.4, 0.6, 5]} intensity={0.55} color="#DCE0E6" />
        <pointLight position={[-3.6, 1.8, 2.4]} intensity={2.5} distance={16} color="#F5E642" />
        <pointLight position={[3.2, -1.2, 3.2]} intensity={1.6} distance={14} color="#FFF27A" />
        <GpuCard interactionRef={interactionRef} />
      </Canvas>
    </div>
  );
}
