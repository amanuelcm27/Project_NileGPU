"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GpuSchematic } from "@/components/visuals/GpuSchematic";
import { Corners } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils/cn";

/**
 * The 3D board is loaded lazily and only where it is worth its cost:
 * a large viewport, no reduced-motion preference and a working WebGL context.
 * The SVG schematic underneath means the hero is complete without it, and the
 * crossfade happens in place, so there is no layout shift.
 */
const GpuScene = dynamic(() => import("@/components/visuals/GpuScene"), {
  ssr: false,
  loading: () => null,
});

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return false;
    // Release the probe context instead of consuming a browser context slot.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const annotations = [
  { label: "GPU COMPUTE", position: "left-4 top-4" },
  { label: "AI WORKLOADS", position: "right-4 top-4" },
  { label: "HIGH-VRAM ACCESS", position: "left-4 bottom-4" },
  { label: "EARLY ACCESS", position: "right-4 bottom-4" },
];

export function GpuVisual({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [sceneMounted, setSceneMounted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [visible, setVisible] = useState(true);

  // Decide once, after the first paint, whether the 3D scene should run. This is
  // deferred to a frame callback so the initial render matches the server output,
  // and the three.js bundle itself is only fetched once the browser is idle, so
  // it never competes with hydration or the first meaningful render.
  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      if (reduced || !wide || !hasWebGL()) return;

      setEligible(true);
      const mount = () => {
        if (!cancelled) setSceneMounted(true);
      };

      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(mount, { timeout: 2500 });
      } else {
        timeoutHandle = window.setTimeout(mount, 1200);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
    };
  }, []);

  // Pause rendering when the visual scrolls away or the tab is backgrounded.
  useEffect(() => {
    if (!eligible) return;
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(entry.isIntersecting && document.visibilityState === "visible");
      },
      { threshold: 0.05 },
    );
    observer.observe(element);

    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [eligible]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "panel clip-corner relative isolate aspect-6/5 w-full overflow-hidden sm:aspect-16/11 lg:aspect-6/5",
        className,
      )}
    >
      <div aria-hidden className="grid-backdrop absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(245,230,66,0.09),transparent_62%)]"
      />

      {/* Static schematic — always rendered */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-700 sm:p-8",
          sceneReady ? "opacity-0" : "opacity-100",
        )}
      >
        <GpuSchematic className="max-h-full" />
      </div>

      {/* 3D scene — lazily loaded, crossfades in place */}
      {eligible && sceneMounted ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            sceneReady ? "opacity-100" : "opacity-0",
          )}
        >
          <GpuScene active={visible} onReady={() => setSceneReady(true)} />
        </div>
      ) : null}

      <div aria-hidden className="scanline pointer-events-none" />

      {/* Interaction hint — only meaningful once the 3D card is live */}
      {sceneReady ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="label-mono-sm border border-line/70 bg-obsidian/70 px-3 py-1.5 text-muted backdrop-blur-[2px]">
            DRAG TO ROTATE · CLICK TO EXPLODE
          </span>
        </div>
      ) : null}

      {/* Technical annotations */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {annotations.map((annotation) => (
          <span
            key={annotation.label}
            className={cn(
              "label-mono-sm absolute text-primary/80 mix-blend-difference",
              annotation.position,
            )}
          >
            {annotation.label}
          </span>
        ))}
      </div>

      <Corners />

      {/* Panel header strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-b border-line/70 bg-obsidian/55 px-4 py-2.5 backdrop-blur-[2px]">
        <span className="label-mono-sm text-muted">ACCELERATOR / COMPUTE PLANE</span>
        <span className="label-mono-sm flex items-center gap-2 text-primary">
          <span aria-hidden className="animate-beacon h-1.5 w-1.5 bg-primary" />
          {sceneReady ? "INTERACTIVE" : "SCHEMATIC"}
        </span>
      </div>
    </div>
  );
}
