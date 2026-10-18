"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Decorative compute-activity waveform.
 *
 * Drawn on a 2D canvas: a single requestAnimationFrame loop that pauses when the
 * panel is off-screen or the tab is hidden, and renders one static frame when
 * the visitor prefers reduced motion. The values are illustrative — the panel
 * says so — and no measurement is implied.
 */
export function WaveformCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let phase = 0;
    let running = false;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const mid = height / 2;

      // Baseline grid
      context.strokeStyle = "rgba(48, 52, 42, 0.75)";
      context.lineWidth = 1;
      for (let row = 1; row < 4; row += 1) {
        const y = (height / 4) * row;
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
      }

      // Filled area under the waveform
      context.beginPath();
      context.moveTo(0, mid);
      const samples = Math.max(48, Math.floor(width / 6));
      for (let index = 0; index <= samples; index += 1) {
        const x = (index / samples) * width;
        const t = index / samples;
        const wave =
          Math.sin(t * 11 + phase) * 0.34 +
          Math.sin(t * 27 - phase * 1.7) * 0.16 +
          Math.sin(t * 53 + phase * 0.6) * 0.07;
        context.lineTo(x, mid - wave * (height * 0.44));
      }
      context.lineTo(width, mid);
      context.closePath();
      const fill = context.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, "rgba(245, 230, 66, 0.22)");
      fill.addColorStop(1, "rgba(245, 230, 66, 0.01)");
      context.fillStyle = fill;
      context.fill();

      // Waveform line
      context.beginPath();
      for (let index = 0; index <= samples; index += 1) {
        const x = (index / samples) * width;
        const t = index / samples;
        const wave =
          Math.sin(t * 11 + phase) * 0.34 +
          Math.sin(t * 27 - phase * 1.7) * 0.16 +
          Math.sin(t * 53 + phase * 0.6) * 0.07;
        const y = mid - wave * (height * 0.44);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = "#F5E642";
      context.lineWidth = 1.6;
      context.stroke();

      // Sweep marker
      const markerX = ((phase * 34) % width + width) % width;
      context.fillStyle = "rgba(255, 242, 122, 0.85)";
      context.fillRect(markerX, 0, 1, height);
    };

    const loop = () => {
      phase += 0.014;
      draw();
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      frame = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    resize();
    draw();

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && document.visibilityState === "visible") start();
        else stop();
      },
      { threshold: 0.15 },
    );
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    const onResize = () => {
      resize();
      draw();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      role="presentation"
    />
  );
}
