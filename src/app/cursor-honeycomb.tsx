"use client";

import { useEffect, useRef } from "react";
import styles from "./home-hero.module.css";

const cellWidth = 60;
const cellRadius = cellWidth / Math.sqrt(3);
const hoverRadius = 72;
const pulseSpeed = 600; // Pixels per second.

type Point = { x: number; y: number };
type Cell = Point & { path: Path2D; hover: number };
type Pulse = Point & { started: number; reach: number };

function smooth(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function pulseDistance(now: number, pulse: Pulse) {
  return ((now - pulse.started) / 1000) * pulseSpeed;
}

export function CursorHoneycomb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cells: Cell[] = [];
    let ambientRegions: Cell[][] = [];
    let remainingRegions: Cell[][] = [];
    let previousRegion: Cell[] | undefined;
    let grid = new Path2D();
    let width = 0;
    let height = 0;
    let pointer: Point | null = null;
    let frame = 0;
    let previousFrame = 0;
    let nextAmbient = 0;
    let visible = true;
    let pulses: Pulse[] = [];

    const startPulse = ({ x, y }: Point, started: number) => {
      pulses = pulses.slice(-7);
      pulses.push({ x, y, started, reach: Math.hypot(width, height) });
    };

    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const elapsed = previousFrame ? now - previousFrame : 16;
      previousFrame = now;

      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      context.strokeStyle = "#FFFFFF";
      context.globalAlpha = 0.09;
      context.stroke(grid);

      if (motion.matches) return;

      if (now >= nextAmbient && ambientRegions.length) {
        if (!remainingRegions.length) {
          remainingRegions = [...ambientRegions];
          if (previousRegion && remainingRegions.length > 1) {
            remainingRegions.splice(remainingRegions.indexOf(previousRegion), 1);
            remainingRegions.unshift(previousRegion);
          }
        }
        const first = remainingRegions.length > 1 && remainingRegions[0] === previousRegion ? 1 : 0;
        const index = first + Math.floor(Math.random() * (remainingRegions.length - first));
        const [region] = remainingRegions.splice(index, 1);
        previousRegion = region;
        const cell = region[Math.floor(Math.random() * region.length)];
        startPulse(cell, now);
        nextAmbient = now + 2200 + Math.random() * 1200;
      }

      pulses = pulses.filter(pulse => pulseDistance(now, pulse) < pulse.reach + cellWidth);
      context.strokeStyle = "#FFC800";
      context.fillStyle = "#FFC800";

      for (const cell of cells) {
        const proximity = pointer ? smooth(1 - Math.hypot(cell.x - pointer.x, cell.y - pointer.y) / hoverRadius) : 0;
        const easing = proximity > cell.hover ? 24 : 30;
        cell.hover += (proximity - cell.hover) * (1 - Math.exp(-elapsed / easing));
        let level = cell.hover * 0.48;
        for (const pulse of pulses) {
          const wave = pulseDistance(now, pulse);
          const distance = Math.hypot(cell.x - pulse.x, cell.y - pulse.y);
          const crest = (distance - wave) / (cellWidth * 0.75);
          const envelope = 1 - smooth(wave / pulse.reach);
          level = Math.max(level, envelope * Math.exp(-crest * crest));
        }
        if (level < 0.006) continue;

        context.globalAlpha = level * 0.07;
        context.fill(cell.path);
        context.globalAlpha = level;
        context.stroke(cell.path);
      }

      frame = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      cells = [];
      grid = new Path2D();
      const regions: Cell[][] = Array.from({ length: 9 }, () => []);

      const rowStep = cellRadius * 1.5;
      for (let row = 0; row * rowStep - cellRadius < height; row++) {
        const y = row * rowStep;
        for (let x = (row % 2) * cellWidth / 2 - cellWidth; x - cellWidth / 2 < width; x += cellWidth) {
          const path = new Path2D();
          for (let side = 0; side < 6; side++) {
            const angle = (side - 1.5) * Math.PI / 3;
            const cornerX = x + Math.cos(angle) * cellRadius;
            const cornerY = y + Math.sin(angle) * cellRadius;
            if (side === 0) path.moveTo(cornerX, cornerY);
            else path.lineTo(cornerX, cornerY);
          }
          path.closePath();
          grid.addPath(path);
          const cell = { x, y, path, hover: 0 };
          cells.push(cell);
          if (x >= cellRadius && x <= width - cellRadius && y >= cellRadius && y <= height - cellRadius) {
            regions[Math.floor(y * 3 / height) * 3 + Math.floor(x * 3 / width)].push(cell);
          }
        }
      }
      ambientRegions = regions.filter(region => region.length > 0);
      remainingRegions = [];
      previousRegion = undefined;
      wake();
    };

    const locate = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      return x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height ? { x, y } : null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && !motion.matches) pointer = locate(event);
    };
    const clearPointer = () => { pointer = null; };
    const onPress = (event: PointerEvent) => {
      const point = locate(event);
      if (!point || motion.matches || event.button !== 0) return;
      startPulse(point, performance.now());
      wake();
    };
    const onMotionChange = () => {
      clearPointer();
      pulses = [];
      for (const cell of cells) cell.hover = 0;
      wake();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    intersection.observe(canvas);
    const scroller = canvas.closest("[data-page-scroll]");
    scroller?.addEventListener("scroll", clearPointer, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onPress, { passive: true });
    document.documentElement.addEventListener("pointerleave", clearPointer);
    document.addEventListener("visibilitychange", wake);
    motion.addEventListener("change", onMotionChange);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      scroller?.removeEventListener("scroll", clearPointer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onPress);
      document.documentElement.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("visibilitychange", wake);
      motion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div className={styles.honeycomb}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}
