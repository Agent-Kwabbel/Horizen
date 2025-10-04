import { useEffect, useRef } from "react";

export default function BackgroundBlobs() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    const CFG = {
      blobCount: 6,

      radiusBaseVmin: 0.67,
      radiusJitter: 0.24,
      wanderAmpVmin: 0.2,
      wanderSpeed: 0.25,

      hueMin: 225,
      hueMax: 295,
      hueDriftSpeed: 0.06,
      hueDriftSpan: 0.55,

      edgeSpring: 0.006,
      bounceDamping: 0.86,

      globalAlpha: 0.22,
      bgTop: "#0a0f1c",
      bgBottom: "#070914",

      maxDpr: 2,
      fpsMinMs: 14,

      easterEggOdds: 0.05,
    } as const;

    const AURORA = {
      bgTop: "#041528",
      bgBottom: "#020812",
      mainHueMin: 95,
      mainHueMax: 160,
      accentHueMin: 300,
      accentHueMax: 330,
      accentChance: 0.2,
      hueDriftSpeed: 0.07,
      hueDriftSpan: 0.75,
    } as const;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isAurora = Math.random() < CFG.easterEggOdds;

    const THEME = isAurora
      ? {
          bgTop: AURORA.bgTop,
          bgBottom: AURORA.bgBottom,
          hueMin: AURORA.mainHueMin,
          hueMax: AURORA.mainHueMax,
          hueDriftSpeed: AURORA.hueDriftSpeed,
          hueDriftSpan: AURORA.hueDriftSpan,
          accentHueMin: AURORA.accentHueMin,
          accentHueMax: AURORA.accentHueMax,
          accentChance: AURORA.accentChance,
        }
      : {
          bgTop: CFG.bgTop,
          bgBottom: CFG.bgBottom,
          hueMin: CFG.hueMin,
          hueMax: CFG.hueMax,
          hueDriftSpeed: CFG.hueDriftSpeed,
          hueDriftSpan: CFG.hueDriftSpan,
          accentHueMin: CFG.hueMin,
          accentHueMax: CFG.hueMax,
          accentChance: 0,
        };

    const S = { w: 0, h: 0, vmin: 0, dpr: 1, t0: performance.now() };

    type BlobN = {
      u: number; v: number;
      rV: number;
      phase: number;
      hueSeed: number;
      accent: boolean;
      vx: number; vy: number;
    };
    const blobs: BlobN[] = [];

    const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
    const clampDpr = () => Math.max(1, Math.min(CFG.maxDpr, window.devicePixelRatio || 1));

    const resize = () => {
      S.w = window.innerWidth;
      S.h = window.innerHeight;
      S.vmin = Math.min(S.w, S.h);
      S.dpr = clampDpr();

      canvas.style.width = S.w + "px";
      canvas.style.height = S.h + "px";
      canvas.width = Math.floor(S.w * S.dpr);
      canvas.height = Math.floor(S.h * S.dpr);
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    };

    const initOnce = () => {
      blobs.length = 0;
      for (let i = 0; i < CFG.blobCount; i++) {
        const jitter = 1 - CFG.radiusJitter + Math.random() * 2 * CFG.radiusJitter;
        blobs.push({
          u: rnd(0.02, 0.98),
          v: rnd(0.02, 0.98),
          rV: CFG.radiusBaseVmin * jitter,
          phase: Math.random() * 1000,
          hueSeed: Math.random() * 1000,
          accent: isAurora && Math.random() < THEME.accentChance,
          vx: 0,
          vy: 0,
        });
      }
    };

    const toPx = (b: BlobN) => ({
      x: b.u * S.w,
      y: b.v * S.h,
      r: b.rV * S.vmin,
    });

    const fillBackground = () => {
      const g = ctx.createLinearGradient(0, 0, 0, S.h);
      g.addColorStop(0, THEME.bgTop);
      g.addColorStop(1, THEME.bgBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S.w, S.h);
    };

    const wander = (t: number, phase: number) => {
      const amp = CFG.wanderAmpVmin * S.vmin;
      const s = CFG.wanderSpeed;
      const wx = Math.sin(phase + t * s) + 0.5 * Math.sin(phase * 1.7 + t * s * 0.47);
      const wy = Math.cos(phase * 0.9 + t * s * 0.63) + 0.5 * Math.sin(phase * 1.3 + t * s * 0.31);
      return { dx: wx * amp, dy: wy * amp };
    };

    const edgeSpring = (x: number, y: number, r: number) => {
      const pad = Math.max(24, r * 0.25);
      const k = CFG.edgeSpring;
      let fx = 0, fy = 0;
      if (x < pad) fx += (pad - x) * k;
      if (x > S.w - pad) fx -= (x - (S.w - pad)) * k;
      if (y < pad) fy += (pad - y) * k;
      if (y > S.h - pad) fy -= (y - (S.h - pad)) * k;
      return { fx, fy };
    };

    const confine = (b: BlobN) => {
      const { x, y, r } = toPx(b);
      const pad = Math.max(24, r * 0.25);
      let nx = x, ny = y;
      let bx = false, by = false;
      if (nx < pad) { nx = pad; bx = true; }
      if (nx > S.w - pad) { nx = S.w - pad; bx = true; }
      if (ny < pad) { ny = pad; by = true; }
      if (ny > S.h - pad) { ny = S.h - pad; by = true; }
      if (bx) b.vx = -b.vx * CFG.bounceDamping;
      if (by) b.vy = -b.vy * CFG.bounceDamping;
      b.u = nx / S.w; b.v = ny / S.h;
    };

    const separationForce = (
      xi: number, yi: number, ri: number,
      xj: number, yj: number, rj: number
    ) => {
      const desired = (ri + rj) * 0.85;
      const dx = xi - xj, dy = yi - yj;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1e-6) return { fx: (Math.random() - 0.5) * 1e-3, fy: (Math.random() - 0.5) * 1e-3 };
      const d = Math.sqrt(d2);
      if (d >= desired) return { fx: 0, fy: 0 };
      const overlap = (desired - d) / desired;
      const strength = 0.003 * overlap;
      return { fx: (dx / d) * strength, fy: (dy / d) * strength };
    };

    const blobHue = (t: number, seed: number, accent: boolean) => {
      const min = accent ? THEME.accentHueMin : THEME.hueMin;
      const max = accent ? THEME.accentHueMax : THEME.hueMax;
      const span = (max - min) * Math.max(0, Math.min(1, THEME.hueDriftSpan));
      const mid = (min + max) / 2;
      const osc = Math.sin(seed + t * THEME.hueDriftSpeed);
      return mid + (osc * span) / 2;
    };

    const drawBlob = (x: number, y: number, r: number, hue: number) => {
      const grad = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
      const col = (a: number) => `hsla(${hue}, 95%, 65%, ${a})`;
      grad.addColorStop(0.0, col(CFG.globalAlpha));
      grad.addColorStop(0.6, col(CFG.globalAlpha * 0.35));
      grad.addColorStop(1.0, col(0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // One-time pre-spread to avoid initial clustering
    const relax = (iters = 50) => {
      for (let k = 0; k < iters; k++) {
        for (let i = 0; i < blobs.length; i++) {
          const bi = blobs[i];
          let xi = bi.u * S.w, yi = bi.v * S.h, ri = bi.rV * S.vmin;
          let fx = 0, fy = 0;
          for (let j = 0; j < blobs.length; j++) if (j !== i) {
            const bj = blobs[j];
            const xj = bj.u * S.w, yj = bj.v * S.h, rj = bj.rV * S.vmin;
            const s = separationForce(xi, yi, ri, xj, yj, rj);
            fx += s.fx; fy += s.fy;
          }
          xi = Math.min(S.w - 1, Math.max(1, xi + fx * S.vmin));
          yi = Math.min(S.h - 1, Math.max(1, yi + fy * S.vmin));
          bi.u = xi / S.w; bi.v = yi / S.h;
          confine(bi);
        }
      }
    };

    initOnce();
    resize();
    relax(50);

    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      if (now - last < CFG.fpsMinMs) { raf = requestAnimationFrame(tick); return; }
      const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
      last = now;
      const t = (now - S.t0) / 1000;

      fillBackground();
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const { x, y, r } = toPx(b);

        const w = wander(t, b.phase);
        const e = edgeSpring(x, y, r);

        let sfx = 0, sfy = 0;
        for (let j = 0; j < blobs.length; j++) {
          if (j === i) continue;
          const bj = blobs[j];
          const xj = bj.u * S.w, yj = bj.v * S.h, rj = bj.rV * S.vmin;
          const s = separationForce(x, y, r, xj, yj, rj);
          sfx += s.fx; sfy += s.fy;
        }

        const ax = (w.dx * 0.001 + e.fx + sfx) / Math.max(900, S.vmin);
        const ay = (w.dy * 0.001 + e.fy + sfy) / Math.max(900, S.vmin);

        b.vx = (b.vx + ax * S.vmin) * 0.986;
        b.vy = (b.vy + ay * S.vmin) * 0.986;

        const nx = x + b.vx * dt;
        const ny = y + b.vy * dt;

        b.u = nx / S.w;
        b.v = ny / S.h;

        confine(b);

        const hue = blobHue(t, b.hueSeed, b.accent);
        drawBlob(b.u * S.w, b.v * S.h, r, hue);
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };

    if (!reduceMotion) {
      raf = requestAnimationFrame((n) => { last = n; tick(n); });
    } else {
      fillBackground();
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const { x, y, r } = toPx(b);
        const hue = blobHue(0, b.hueSeed, b.accent);
        drawBlob(x, y, r, hue);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    const onResize = () => { resize(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 -z-10 w-screen h-screen pointer-events-none"
      aria-hidden="true"
    />
  );
}
