import { useCallback, useEffect, useRef, useState } from "react";

type Emotion = {
  name: string;
  hue: number;
  label: string;
  pulse: number;
  seekStr: number;
};

type PointerState = {
  x: number;
  y: number;
  active: boolean;
};

type ParticleRole = "seeker" | "spark";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
  role: ParticleRole;
  orbitAngle: number;
  orbitRadius: number;
  strand: number;
  helixPhase: number;
  glyphSeed: number;
};

type Ripple = {
  x: number;
  y: number;
  t: number;
  maxT: number;
};

type Singularity = {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  exploded: boolean;
  hue: number;
};

type Shockwave = {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  hue: number;
  power: number;
  kind: "beat" | "click";
};

type CoronationBurst = {
  age: number;
  maxAge: number;
  hue: number;
  power: number;
  phase: number;
  spikes: number;
};

type SizeState = {
  width: number;
  height: number;
  dpr: number;
};

type AudioRefs = {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  stream: MediaStream | null;
  source: MediaStreamAudioSourceNode | null;
  data: Uint8Array | null;
};

type BeatState = {
  cooldown: number;
  flash: number;
  lastPower: number;
};

const EMOTIONS: Emotion[] = [
  { name: "WONDER", hue: 200, label: "✦", pulse: 0.8, seekStr: 0.04 },
  { name: "JOY", hue: 55, label: "☀", pulse: 1.4, seekStr: 0.07 },
  { name: "DREAMING", hue: 270, label: "◈", pulse: 0.4, seekStr: 0.02 },
  { name: "ALERT", hue: 12, label: "⚡", pulse: 2.0, seekStr: 0.09 },
  { name: "SERENE", hue: 160, label: "∿", pulse: 0.3, seekStr: 0.01 },
  { name: "CURIOUS", hue: 310, label: "◎", pulse: 1.1, seekStr: 0.05 },
  { name: "SURGE", hue: 30, label: "⟁", pulse: 1.8, seekStr: 0.08 },
];

const TAU = Math.PI * 2;
const GLYPHS = ["0", "1", "A", "B", "C", "D", "E", "F", "7", "9"] as const;
const MAX_SEEKERS = 170;
const MAX_SPARKS = 220;

const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const smoothstep = (a: number, b: number, x: number) => {
  if (a === b) return x >= b ? 1 : 0;
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function heptaPoints(cx: number, cy: number, r: number, sides: number, twist = 0) {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (TAU * i) / sides - Math.PI / 2 + twist;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function pushParticle(store: Particle[], particle: Particle) {
  if (particle.role === "spark") {
    let sparkCount = 0;
    for (let i = 0; i < store.length; i++) {
      if (store[i].role === "spark") sparkCount += 1;
    }
    if (sparkCount >= MAX_SPARKS) {
      const idx = store.findIndex((p) => p.role === "spark");
      if (idx >= 0) store.splice(idx, 1);
    }
  }
  store.push(particle);
}

export default function JewbleSoulEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const lastTRef = useRef<number | null>(null);
  const emotionRef = useRef(0);
  const transRef = useRef(1);
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const singularitiesRef = useRef<Singularity[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const coronationsRef = useRef<CoronationBurst[]>([]);
  const sizeRef = useRef<SizeState>({ width: 0, height: 0, dpr: 1 });
  const audioRefs = useRef<AudioRefs>({ context: null, analyser: null, stream: null, source: null, data: null });
  const audioLevelRef = useRef(0);
  const bassLevelRef = useRef(0);
  const trebleLevelRef = useRef(0);
  const beatStateRef = useRef<BeatState>({ cooldown: 0, flash: 0, lastPower: 0 });
  const blinkRef = useRef({ timer: rand(60, 200), amount: 0 });

  const [emotion, setEmotion] = useState(0);
  const [showTooltip, setShowTooltip] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioSupported, setAudioSupported] = useState(true);

  const spawn = useCallback((count: number, cx?: number, cy?: number, burst = false, hue?: number, speedMul = 1) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const em = EMOTIONS[emotionRef.current];
    const store = particlesRef.current;

    for (let i = 0; i < count; i++) {
      const isSpark = burst && Math.random() < 0.8;
      const angle = burst ? (TAU * i) / Math.max(count, 1) + rand(-0.24, 0.24) : rand(0, TAU);
      const speed = (burst ? rand(2.6, 8.4) : rand(0.12, 0.42)) * speedMul;

      pushParticle(store, {
        x: cx ?? rand(width * 0.06, width * 0.94),
        y: cy ?? rand(height * 0.06, height * 0.94),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ax: 0,
        ay: 0,
        size: isSpark ? rand(1.5, 3.6) : rand(0.9, 2.2),
        life: isSpark ? rand(28, 72) : rand(200, 420),
        maxLife: isSpark ? rand(28, 72) : rand(200, 420),
        hue: hue ?? em.hue + rand(-40, 40),
        role: isSpark ? "spark" : "seeker",
        orbitAngle: rand(0, TAU),
        orbitRadius: rand(10, 42),
        strand: Math.floor(Math.random() * 7),
        helixPhase: rand(0, TAU),
        glyphSeed: Math.floor(rand(0, GLYPHS.length)),
      });
    }
  }, []);

  const triggerCoronationBurst = useCallback(
    (power: number, hue: number) => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      const cx = width * 0.5;
      const cy = height * 0.5;

      shockwavesRef.current.push(
        {
          x: cx,
          y: cy,
          age: 0,
          maxAge: 44 + power * 28,
          hue,
          power,
          kind: "beat",
        },
        {
          x: cx,
          y: cy,
          age: 0,
          maxAge: 60 + power * 34,
          hue: (hue + 28) % 360,
          power: power * 0.86,
          kind: "beat",
        }
      );
      if (shockwavesRef.current.length > 10) {
        shockwavesRef.current.splice(0, shockwavesRef.current.length - 10);
      }

      coronationsRef.current.push({
        age: 0,
        maxAge: 54 + power * 34,
        hue,
        power,
        phase: rand(0, TAU),
        spikes: 14,
      });
      if (coronationsRef.current.length > 4) coronationsRef.current.shift();

      beatStateRef.current.flash = Math.max(beatStateRef.current.flash, 0.6 + power * 0.8);
      beatStateRef.current.lastPower = power;
      spawn(42 + Math.floor(power * 72), cx, cy, true, hue, 1.15 + power * 0.95);
    },
    [spawn]
  );

  const disableAudioReactive = useCallback(async () => {
    const refs = audioRefs.current;
    try {
      refs.source?.disconnect();
      refs.analyser?.disconnect();
      refs.stream?.getTracks().forEach((track) => track.stop());
      if (refs.context && refs.context.state !== "closed") {
        await refs.context.close();
      }
    } catch {
    }
    audioRefs.current = { context: null, analyser: null, stream: null, source: null, data: null };
    audioLevelRef.current = 0;
    bassLevelRef.current = 0;
    trebleLevelRef.current = 0;
    beatStateRef.current = { cooldown: 0, flash: 0, lastPower: 0 };
    setAudioEnabled(false);
    setAudioSupported(true);
  }, []);

  const enableAudioReactive = useCallback(async () => {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) {
      setAudioSupported(false);
      return;
    }

    try {
      await disableAudioReactive();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const context = new AudioContextCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.84;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      audioRefs.current = {
        context,
        analyser,
        stream,
        source,
        data: new Uint8Array(analyser.frequencyBinCount),
      };

      if (context.state === "suspended") await context.resume();
      setAudioSupported(true);
      setAudioEnabled(true);
    } catch {
      setAudioSupported(false);
      await disableAudioReactive();
    }
  }, [disableAudioReactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: rect.width, height: rect.height, dpr };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const setEmotionState = (index: number) => {
      emotionRef.current = index;
      transRef.current = 0;
      setEmotion(index);
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };

    const onLeave = () => {
      pointerRef.current.active = false;
    };

    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const hue = EMOTIONS[emotionRef.current].hue;

      singularitiesRef.current.push({
        x,
        y,
        age: 0,
        maxAge: 78,
        exploded: false,
        hue,
      });

      shockwavesRef.current.push({
        x,
        y,
        age: 0,
        maxAge: 38,
        hue,
        power: 0.68,
        kind: "click",
      });
      if (shockwavesRef.current.length > 10) {
        shockwavesRef.current.splice(0, shockwavesRef.current.length - 10);
      }

      ripplesRef.current.push({ x, y, t: 0, maxT: 1.1 });
      if (ripplesRef.current.length > 6) ripplesRef.current.shift();
      setShowTooltip(false);
    };

    resize();
    particlesRef.current = [];
    singularitiesRef.current = [];
    shockwavesRef.current = [];
    coronationsRef.current = [];
    ripplesRef.current = [];
    lastTRef.current = null;
    spawn(120);

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove, { passive: true });
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);

    const emotionTimer = window.setInterval(() => {
      setEmotionState((emotionRef.current + 1) % EMOTIONS.length);
    }, 6000);

    const tick = (time: number) => {
      const { width: W, height: H } = sizeRef.current;
      if (!W || !H) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const last = lastTRef.current ?? time;
      const dt = clamp((time - last) / 16.667, 0.55, 2.1);
      lastTRef.current = time;
      frameRef.current += 1;
      transRef.current = clamp(transRef.current + 0.014 * dt, 0, 1);

      const refs = audioRefs.current;
      let measuredAudio = 0;
      let bassInstant = 0;
      let trebleInstant = 0;

      if (audioEnabled && refs.analyser && refs.data) {
        refs.analyser.getByteFrequencyData(refs.data);
        let weighted = 0;
        let total = 0;
        const bassBins = Math.max(6, Math.floor(refs.data.length * 0.14));
        const trebleStart = Math.floor(refs.data.length * 0.55);
        let bassSum = 0;
        let bassWeight = 0;
        let trebleSum = 0;
        let trebleWeight = 0;

        for (let i = 0; i < refs.data.length; i++) {
          const norm = refs.data[i] / 255;
          const weight = 1 + i / refs.data.length;
          weighted += refs.data[i] * weight;
          total += 255 * weight;

          if (i < bassBins) {
            const bw = 1.3 - i / bassBins;
            bassSum += norm * bw;
            bassWeight += bw;
          }
          if (i >= trebleStart) {
            const tw = 0.8 + (i - trebleStart) / Math.max(1, refs.data.length - trebleStart);
            trebleSum += norm * tw;
            trebleWeight += tw;
          }
        }

        measuredAudio = total ? weighted / total : 0;
        bassInstant = bassWeight ? bassSum / bassWeight : 0;
        trebleInstant = trebleWeight ? trebleSum / trebleWeight : 0;
      }

      const prevBass = bassLevelRef.current;
      audioLevelRef.current = lerp(audioLevelRef.current, measuredAudio, audioEnabled ? 0.18 : 0.06);
      bassLevelRef.current = lerp(bassLevelRef.current, bassInstant, audioEnabled ? 0.24 : 0.08);
      trebleLevelRef.current = lerp(trebleLevelRef.current, trebleInstant, audioEnabled ? 0.16 : 0.06);

      const audioLevel = audioLevelRef.current;
      const trebleLevel = trebleLevelRef.current;
      beatStateRef.current.cooldown = Math.max(0, beatStateRef.current.cooldown - dt);
      beatStateRef.current.flash = Math.max(0, beatStateRef.current.flash - 0.024 * dt);

      const bassDelta = bassInstant - prevBass;
      const beatEnergy = clamp((bassInstant - 0.18) * 2.4 + bassDelta * 5.2 + trebleInstant * 0.25, 0, 1);
      const beatThreshold = 0.34 - trebleLevel * 0.04;
      if (audioEnabled && beatStateRef.current.cooldown <= 0 && bassInstant > 0.22 && beatEnergy > beatThreshold) {
        const power = clamp(0.34 + beatEnergy * 0.92 + bassInstant * 0.35, 0.32, 1);
        triggerCoronationBurst(power, EMOTIONS[emotionRef.current].hue);
        beatStateRef.current.cooldown = 14 + (1 - power) * 18;
      }

      const beatFlash = beatStateRef.current.flash;
      const em = EMOTIONS[emotionRef.current];
      const tBlend = transRef.current;
      const pulse =
        1 +
        em.pulse * 0.038 * Math.sin(frameRef.current * 0.045 * (0.9 + em.pulse * 0.2)) +
        audioLevel * 0.22 +
        beatFlash * 0.18;
      const cx = W * 0.5;
      const cy = H * 0.5;
      const R = Math.min(W, H) * (0.29 + audioLevel * 0.02 + beatFlash * 0.018);
      const helixR = R * (0.97 + audioLevel * 0.12 + beatFlash * 0.08);
      const helixHeight = R * (0.78 + audioLevel * 0.18 + beatFlash * 0.11);
      const helixTime = frameRef.current * (0.019 + audioLevel * 0.012 + beatFlash * 0.008);
      const ptr = pointerRef.current;
      const moodMorph = 0.7 + em.pulse * 0.18 + audioLevel * 0.9 + beatFlash * 0.4;

      blinkRef.current.timer -= dt;
      if (blinkRef.current.timer <= 0) {
        blinkRef.current.timer = rand(90, 220) - audioLevel * 50 - beatFlash * 40;
      }
      const blinkWindow = smoothstep(0, 8, blinkRef.current.timer) * (1 - smoothstep(8, 18, blinkRef.current.timer));
      blinkRef.current.amount = audioLevel > 0.24 ? Math.max(0, 1 - audioLevel * 0.4) : 1 - blinkWindow;
      const eyeOpen = clamp(blinkRef.current.amount, 0.08, 1);

      const backgroundAlpha = clamp(0.17 - audioLevel * 0.04 - beatFlash * 0.03, 0.04, 0.22);
      ctx.fillStyle = `rgba(2,4,18,${backgroundAlpha})`;
      ctx.fillRect(0, 0, W, H);

      for (let ring = 4; ring >= 0; ring--) {
        const rr = (R * (0.28 + ring * 0.18)) * pulse;
        const alpha = (0.04 + ring * 0.028 + audioLevel * 0.04 + beatFlash * 0.06) * tBlend;
        const twist =
          frameRef.current * (0.0036 + audioLevel * 0.002 + beatFlash * 0.0012) * (ring % 2 === 0 ? 1 : -1) +
          ring * 0.36;
        const pts = heptaPoints(cx, cy, rr, 7, twist);

        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const [px, py] = pts[i];
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(${(em.hue + ring * 18) % 360}, 90%, ${68 + audioLevel * 8 + beatFlash * 10}%, ${alpha})`;
        ctx.lineWidth = 1 + ring * 0.24 + audioLevel * 0.9 + beatFlash * 0.7;
        ctx.shadowColor = `hsla(${em.hue}, 100%, 72%, ${0.35 + audioLevel * 0.2 + beatFlash * 0.22})`;
        ctx.shadowBlur = 8 + ring * 3 + audioLevel * 14 + beatFlash * 14;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (ring === 2) {
          for (let i = 0; i < pts.length; i++) {
            const [px, py] = pts[i];
            const gp = 0.7 + 0.45 * Math.sin(frameRef.current * 0.07 + i * 0.9) + audioLevel * 0.8 + beatFlash * 0.9;
            ctx.beginPath();
            ctx.arc(px, py, 2.8 * gp, 0, TAU);
            ctx.fillStyle = `hsla(${(em.hue + i * 48) % 360}, 100%, 80%, ${(0.65 + audioLevel * 0.12 + beatFlash * 0.18) * tBlend})`;
            ctx.shadowColor = `hsla(${(em.hue + i * 48) % 360}, 100%, 70%, 0.8)`;
            ctx.shadowBlur = 14 + audioLevel * 10 + beatFlash * 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.age += dt;
        const progress = clamp(sw.age / sw.maxAge, 0, 1);
        const eased = easeOutCubic(progress);
        const maxRadius = Math.min(W, H) * (sw.kind === "beat" ? 0.62 + sw.power * 0.1 : 0.34 + sw.power * 0.08);
        const radius = lerp(28, maxRadius, eased);
        const alpha = (1 - progress) * (0.34 + sw.power * 0.36);
        const segs = sw.kind === "beat" ? 21 : 14;

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, radius, 0, TAU);
        ctx.strokeStyle = `hsla(${sw.hue}, 100%, 74%, ${alpha})`;
        ctx.lineWidth = 1.8 + sw.power * 2.2;
        ctx.shadowColor = `hsla(${sw.hue}, 100%, 70%, ${alpha})`;
        ctx.shadowBlur = 16 + sw.power * 20;
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let s = 0; s < segs; s++) {
          const a = (TAU * s) / segs + frameRef.current * 0.004 * (sw.kind === "beat" ? 1 : -1);
          const dash = sw.kind === "beat" ? 9 + sw.power * 12 : 6 + sw.power * 6;
          const x0 = sw.x + Math.cos(a) * (radius - dash);
          const y0 = sw.y + Math.sin(a) * (radius - dash);
          const x1 = sw.x + Math.cos(a) * (radius + dash);
          const y1 = sw.y + Math.sin(a) * (radius + dash);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = `hsla(${(sw.hue + s * 3) % 360}, 100%, 80%, ${alpha * 0.8})`;
          ctx.lineWidth = 0.9 + sw.power * 0.8;
          ctx.stroke();
        }

        if (progress >= 1) shockwaves.splice(i, 1);
      }

      for (let s = 0; s < 7; s++) {
        const strandHue = (em.hue + s * 42) % 360;
        const baseAngle = (TAU * s) / 7;
        const offsetWave = Math.sin(helixTime * 1.2 + s * 0.8) * R * (0.035 + audioLevel * 0.02 + beatFlash * 0.02);

        ctx.beginPath();
        for (let step = 0; step < 110; step++) {
          const frac = step / 109;
          const a = baseAngle + frac * TAU * (1.8 + audioLevel * 0.35 + beatFlash * 0.18) + helixTime;
          const squash = 0.48 + 0.18 * Math.cos(frac * TAU * 2 + s * 0.7) + audioLevel * 0.06 + beatFlash * 0.04;
          const radiusBand = 0.7 + 0.25 * Math.sin(frac * TAU + s) + audioLevel * 0.08 + beatFlash * 0.08;
          const px = cx + Math.cos(a) * (helixR + offsetWave) * radiusBand;
          const py = cy + Math.sin(frac * TAU * 2 + helixTime + s) * helixHeight * squash * moodMorph * 0.92;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${strandHue}, 95%, ${68 + audioLevel * 8 + beatFlash * 8}%, ${(0.3 + audioLevel * 0.14 + beatFlash * 0.12) * tBlend})`;
        ctx.lineWidth = 1.6 + audioLevel * 1.4 + beatFlash * 1.2;
        ctx.shadowColor = `hsla(${strandHue}, 100%, 70%, ${0.5 + audioLevel * 0.2 + beatFlash * 0.2})`;
        ctx.shadowBlur = 12 + audioLevel * 12 + beatFlash * 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        for (let step = 0; step < 110; step++) {
          const frac = step / 109;
          const a = baseAngle - frac * TAU * (1.8 + audioLevel * 0.35 + beatFlash * 0.18) - helixTime * 0.92;
          const squash = 0.48 + 0.18 * Math.sin(frac * TAU * 2 + s * 0.9) + audioLevel * 0.06 + beatFlash * 0.04;
          const radiusBand = 0.7 + 0.25 * Math.cos(frac * TAU + s) + audioLevel * 0.08 + beatFlash * 0.08;
          const px = cx + Math.cos(a) * (helixR - offsetWave) * radiusBand;
          const py = cy + Math.sin(frac * TAU * 2 - helixTime - s * 0.4) * helixHeight * squash * moodMorph * 0.92;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${(strandHue + 18) % 360}, 95%, ${62 + audioLevel * 8 + beatFlash * 8}%, ${(0.22 + audioLevel * 0.12 + beatFlash * 0.12) * tBlend})`;
        ctx.lineWidth = 1.1 + audioLevel * 0.9 + beatFlash * 0.7;
        ctx.stroke();

        for (let n = 0; n < 9; n++) {
          const frac = n / 8;
          const phase = baseAngle + frac * TAU * 1.65 + helixTime;
          const x1 = cx + Math.cos(phase) * helixR * (0.74 + audioLevel * 0.05 + beatFlash * 0.04);
          const y1 = cy + Math.sin(frac * TAU * 2 + helixTime + s) * helixHeight * 0.44 * moodMorph;
          const x2 = cx + Math.cos(phase + Math.PI * 0.92) * helixR * (0.74 + audioLevel * 0.05 + beatFlash * 0.04);
          const y2 = cy + Math.sin(frac * TAU * 2 - helixTime - s * 0.4) * helixHeight * 0.44 * moodMorph;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `hsla(${strandHue}, 100%, 74%, ${0.09 + 0.08 * Math.sin(frameRef.current * 0.04 + n + s) + audioLevel * 0.16 + beatFlash * 0.18})`;
          ctx.lineWidth = 0.85 + audioLevel * 0.65 + beatFlash * 0.4;
          ctx.stroke();

          const nodePulse = 1 + 0.45 * Math.sin(frameRef.current * 0.08 + n * 0.9 + s) + audioLevel * 0.9 + beatFlash * 1.2;
          ctx.beginPath();
          ctx.arc(x1, y1, 2.1 * nodePulse, 0, TAU);
          ctx.fillStyle = `hsla(${strandHue}, 100%, 82%, ${(0.4 + audioLevel * 0.18 + beatFlash * 0.18) * tBlend})`;
          ctx.shadowColor = `hsla(${strandHue}, 100%, 72%, 0.8)`;
          ctx.shadowBlur = 12 + audioLevel * 10 + beatFlash * 10;
          ctx.fill();
          ctx.shadowBlur = 0;

          const glyph = GLYPHS[(n + s + Math.floor(frameRef.current * (0.08 + audioLevel * 0.18 + beatFlash * 0.16))) % GLYPHS.length];
          const flicker =
            0.16 +
            0.22 * Math.abs(Math.sin(frameRef.current * (0.09 + audioLevel * 0.08 + beatFlash * 0.08) + n * 1.7 + s)) +
            audioLevel * 0.22 +
            beatFlash * 0.2;
          ctx.font = `${Math.floor(R * (0.045 + audioLevel * 0.01 + beatFlash * 0.008))}px 'Courier New', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `hsla(${strandHue}, 100%, 75%, ${flicker})`;
          ctx.fillText(glyph, lerp(x1, x2, 0.5), lerp(y1, y2, 0.5));
        }
      }

      const coreR = R * (0.2 + audioLevel * 0.03 + beatFlash * 0.018) * pulse;
      const coreGlow = 26 + 22 * Math.sin(frameRef.current * 0.05) + audioLevel * 34 + beatFlash * 30;
      const eyeWidth = coreR * (1.48 + audioLevel * 0.1 + beatFlash * 0.08);
      const eyeHeight = coreR * (0.66 + eyeOpen * 0.26 + audioLevel * 0.06 + beatFlash * 0.08);
      const irisRx = coreR * (0.8 + audioLevel * 0.08 + beatFlash * 0.06);
      const irisRy = coreR * (0.56 + eyeOpen * 0.2 + audioLevel * 0.04 + beatFlash * 0.06);
      const slitBias = em.name === "ALERT" || em.name === "SURGE" ? 0.16 : em.name === "SERENE" ? 0.26 : 0.2;
      const pupilHalfWidth = coreR * clamp(slitBias - audioLevel * 0.06 - beatFlash * 0.08, 0.06, 0.28);
      const pupilHalfHeight = irisRy * (0.95 + beatFlash * 0.05);

      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 3, 0, TAU);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
      grad.addColorStop(0, `hsla(${em.hue}, 100%, 78%, ${(0.34 + audioLevel * 0.12 + beatFlash * 0.18) * tBlend})`);
      grad.addColorStop(0.42, `hsla(${(em.hue + 26) % 360}, 88%, 56%, ${(0.2 + audioLevel * 0.1 + beatFlash * 0.14) * tBlend})`);
      grad.addColorStop(1, `hsla(${em.hue}, 70%, 40%, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);

      ctx.beginPath();
      ctx.moveTo(-eyeWidth, 0);
      ctx.quadraticCurveTo(0, -eyeHeight, eyeWidth, 0);
      ctx.quadraticCurveTo(0, eyeHeight, -eyeWidth, 0);
      ctx.closePath();
      ctx.fillStyle = `hsla(${em.hue}, 100%, 92%, ${0.94 * tBlend})`;
      ctx.shadowColor = `hsla(${em.hue}, 100%, 70%, 0.95)`;
      ctx.shadowBlur = coreGlow;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-eyeWidth, 0);
      ctx.quadraticCurveTo(0, -eyeHeight, eyeWidth, 0);
      ctx.quadraticCurveTo(0, eyeHeight, -eyeWidth, 0);
      ctx.closePath();
      ctx.clip();

      const scleraGrad = ctx.createLinearGradient(0, -eyeHeight, 0, eyeHeight);
      scleraGrad.addColorStop(0, `hsla(${(em.hue + 18) % 360}, 100%, 96%, 0.95)`);
      scleraGrad.addColorStop(0.45, `hsla(${em.hue}, 100%, 86%, 0.88)`);
      scleraGrad.addColorStop(1, `hsla(${(em.hue + 180) % 360}, 60%, 78%, 0.78)`);
      ctx.fillStyle = scleraGrad;
      ctx.fillRect(-eyeWidth - 4, -eyeHeight - 4, eyeWidth * 2 + 8, eyeHeight * 2 + 8);

      const irisGrad = ctx.createRadialGradient(0, -coreR * 0.12, coreR * 0.06, 0, 0, irisRx * 1.15);
      irisGrad.addColorStop(0, `hsla(${(em.hue + 40) % 360}, 100%, 96%, 0.96)`);
      irisGrad.addColorStop(0.35, `hsla(${em.hue}, 100%, 72%, ${0.92 + audioLevel * 0.06 + beatFlash * 0.06})`);
      irisGrad.addColorStop(1, `hsla(${(em.hue + 170) % 360}, 100%, 24%, ${0.84 + beatFlash * 0.08})`);
      ctx.beginPath();
      ctx.ellipse(0, 0, irisRx, irisRy, 0, 0, TAU);
      ctx.fillStyle = irisGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, irisRx * 0.78, irisRy * 0.78, 0, 0, TAU);
      ctx.strokeStyle = `hsla(${(em.hue + 160) % 360}, 100%, 80%, ${0.5 + audioLevel * 0.12 + beatFlash * 0.14})`;
      ctx.lineWidth = 1.2 + audioLevel * 0.6 + beatFlash * 0.6;
      ctx.stroke();

      ctx.save();
      ctx.rotate(frameRef.current * (0.04 + audioLevel * 0.05 + beatFlash * 0.03));
      ctx.strokeStyle = `hsla(${(em.hue + 180) % 360}, 100%, 84%, ${(0.54 + audioLevel * 0.16 + beatFlash * 0.16) * tBlend})`;
      ctx.lineWidth = 0.9 + audioLevel * 0.7 + beatFlash * 0.8;
      for (let i = 0; i < 7; i++) {
        const a = (TAU * i) / 7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * coreR * 0.08, Math.sin(a) * coreR * 0.08);
        ctx.lineTo(Math.cos(a) * irisRx * 0.9, Math.sin(a) * irisRy * 0.9);
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(0, -pupilHalfHeight);
      ctx.bezierCurveTo(pupilHalfWidth, -pupilHalfHeight * 0.55, pupilHalfWidth, pupilHalfHeight * 0.55, 0, pupilHalfHeight);
      ctx.bezierCurveTo(-pupilHalfWidth, pupilHalfHeight * 0.55, -pupilHalfWidth, -pupilHalfHeight * 0.55, 0, -pupilHalfHeight);
      ctx.closePath();
      ctx.fillStyle = "rgb(2,4,18)";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -pupilHalfHeight * 0.86);
      ctx.lineTo(0, pupilHalfHeight * 0.86);
      ctx.strokeStyle = `hsla(${(em.hue + 200) % 360}, 100%, 86%, ${0.16 + audioLevel * 0.12 + beatFlash * 0.12})`;
      ctx.lineWidth = 0.7 + audioLevel * 0.35 + beatFlash * 0.35;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-eyeWidth * 0.24, -eyeHeight * 0.26, coreR * 0.24, coreR * 0.1, -0.38, 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${0.22 + audioLevel * 0.16 + beatFlash * 0.16})`;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeWidth * 0.18, eyeHeight * 0.14, coreR * 0.12, coreR * 0.05, 0.24, 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${0.08 + audioLevel * 0.08 + beatFlash * 0.08})`;
      ctx.fill();

      ctx.restore();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(cx - eyeWidth, cy);
      ctx.quadraticCurveTo(cx, cy - eyeHeight * 1.08, cx + eyeWidth, cy);
      ctx.strokeStyle = `hsla(${em.hue}, 100%, 70%, ${0.54 + beatFlash * 0.16})`;
      ctx.lineWidth = 1.6 + audioLevel * 0.8 + beatFlash * 0.8;
      ctx.shadowColor = `hsla(${em.hue}, 100%, 72%, ${0.45 + beatFlash * 0.2})`;
      ctx.shadowBlur = 10 + audioLevel * 8 + beatFlash * 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(cx - eyeWidth, cy);
      ctx.quadraticCurveTo(cx, cy + eyeHeight * 1.02, cx + eyeWidth, cy);
      ctx.strokeStyle = `hsla(${(em.hue + 24) % 360}, 100%, 66%, ${0.34 + audioLevel * 0.12 + beatFlash * 0.14})`;
      ctx.lineWidth = 1 + audioLevel * 0.5 + beatFlash * 0.5;
      ctx.stroke();

      const coronations = coronationsRef.current;
      for (let i = coronations.length - 1; i >= 0; i--) {
        const crown = coronations[i];
        crown.age += dt;
        const progress = clamp(crown.age / crown.maxAge, 0, 1);
        const burstEase = easeOutCubic(progress);
        const fade = 1 - progress;
        const topStart = -Math.PI * 0.93;
        const topEnd = -Math.PI * 0.07;
        const arcRadius = coreR * 3.35 + burstEase * R * (0.48 + crown.power * 0.42);
        const outerRadius = arcRadius + R * (0.12 + crown.power * 0.18);
        const alpha = fade * (0.24 + crown.power * 0.42);

        ctx.beginPath();
        for (let s = 0; s <= crown.spikes; s++) {
          const frac = s / crown.spikes;
          const a = lerp(topStart, topEnd, frac) + Math.sin(crown.phase + frac * TAU) * 0.01;
          const rr = s % 2 === 0 ? outerRadius + Math.sin(progress * TAU + s) * R * 0.02 : arcRadius;
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${crown.hue}, 100%, 80%, ${alpha})`;
        ctx.lineWidth = 1.5 + crown.power * 1.8;
        ctx.shadowColor = `hsla(${crown.hue}, 100%, 72%, ${alpha})`;
        ctx.shadowBlur = 16 + crown.power * 20;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(cx, cy, arcRadius * 0.98, topStart, topEnd);
        ctx.strokeStyle = `hsla(${(crown.hue + 28) % 360}, 100%, 70%, ${alpha * 0.82})`;
        ctx.lineWidth = 0.95 + crown.power * 1.1;
        ctx.stroke();

        for (let s = 0; s < 7; s++) {
          const frac = s / 6;
          const a = lerp(topStart + 0.05, topEnd - 0.05, frac);
          const peakR = outerRadius + R * (0.08 + crown.power * 0.1) * (0.7 + 0.3 * Math.sin(crown.phase + s));
          const baseR = arcRadius - R * 0.03;
          const x0 = cx + Math.cos(a) * baseR;
          const y0 = cy + Math.sin(a) * baseR;
          const x1 = cx + Math.cos(a) * peakR;
          const y1 = cy + Math.sin(a) * peakR;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = `hsla(${(crown.hue + s * 10) % 360}, 100%, 84%, ${alpha * 0.9})`;
          ctx.lineWidth = 1 + crown.power * 1.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x1, y1, 2.6 + crown.power * 3.6, 0, TAU);
          ctx.fillStyle = `hsla(${(crown.hue + s * 16) % 360}, 100%, 82%, ${alpha})`;
          ctx.shadowColor = `hsla(${(crown.hue + s * 16) % 360}, 100%, 72%, ${alpha})`;
          ctx.shadowBlur = 12 + crown.power * 14;
          ctx.fill();
          ctx.shadowBlur = 0;

          const glyph = GLYPHS[(s + Math.floor(frameRef.current * 0.14)) % GLYPHS.length];
          ctx.font = `${Math.max(11, Math.floor(R * (0.045 + crown.power * 0.012)))}px 'Courier New', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `hsla(${(crown.hue + 180) % 360}, 100%, 86%, ${alpha * 0.65})`;
          ctx.fillText(glyph, x1, y1 - 18 - crown.power * 14);
        }

        const haloPts = heptaPoints(cx, cy, arcRadius * (1.08 + crown.power * 0.08), 7, crown.phase + progress * 0.4);
        ctx.beginPath();
        haloPts.forEach(([px, py], idx) => {
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.strokeStyle = `hsla(${(crown.hue + 12) % 360}, 100%, 76%, ${alpha * 0.4})`;
        ctx.lineWidth = 1 + crown.power * 0.9;
        ctx.stroke();

        if (progress >= 1) coronations.splice(i, 1);
      }

      ctx.font = `bold ${Math.floor(coreR * (0.52 + audioLevel * 0.05 + beatFlash * 0.06))}px 'Courier New', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `hsla(${em.hue}, 100%, 95%, ${(0.52 + audioLevel * 0.22 + beatFlash * 0.24) * tBlend})`;
      ctx.fillText(em.label, cx, cy + coreR * 3.45);

      const gpR = R * 1.12 * (1 + 0.045 * Math.sin(frameRef.current * 0.05 * em.pulse) + audioLevel * 0.08 + beatFlash * 0.08);
      const gpA = 0.15 + 0.08 * Math.abs(Math.sin(frameRef.current * 0.05 * em.pulse)) + audioLevel * 0.14 + beatFlash * 0.16;
      ctx.beginPath();
      ctx.arc(cx, cy, gpR, 0, TAU);
      ctx.strokeStyle = `hsla(${em.hue}, 80%, 65%, ${gpA * tBlend})`;
      ctx.lineWidth = 2.2 + audioLevel * 1.2 + beatFlash * 1.4;
      ctx.shadowBlur = 20 + audioLevel * 18 + beatFlash * 18;
      ctx.shadowColor = `hsla(${em.hue}, 100%, 62%, 0.55)`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      for (let i = 0; i < 60; i++) {
        const a = (TAU * i) / 60;
        const big = i % 7 === 0;
        const r0 = gpR - (big ? 10 : 4);
        const r1 = gpR + (big ? 10 : 4);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.strokeStyle = `hsla(${(em.hue + (big ? 38 : 0)) % 360}, 92%, ${big ? 85 : 66}%, ${(big ? 0.62 : 0.22) * tBlend + audioLevel * 0.12 + beatFlash * 0.14})`;
        ctx.lineWidth = big ? 1.5 + audioLevel * 0.8 + beatFlash * 0.8 : 0.72 + audioLevel * 0.35 + beatFlash * 0.3;
        ctx.stroke();

        if (i % 5 === 0) {
          const glyph = GLYPHS[(i + Math.floor(frameRef.current * (0.12 + audioLevel * 0.2 + beatFlash * 0.22))) % GLYPHS.length];
          const gx = cx + Math.cos(a) * (gpR + 24 + audioLevel * 10 + beatFlash * 12);
          const gy = cy + Math.sin(a) * (gpR + 24 + audioLevel * 10 + beatFlash * 12);
          const flicker =
            0.12 +
            0.28 * Math.abs(Math.sin(frameRef.current * (0.11 + audioLevel * 0.12 + beatFlash * 0.1) + i)) +
            audioLevel * 0.22 +
            beatFlash * 0.18;
          ctx.font = `${Math.max(10, Math.floor(R * (0.05 + audioLevel * 0.01 + beatFlash * 0.012)))}px 'Courier New', monospace`;
          ctx.fillStyle = `hsla(${(em.hue + i * 2) % 360}, 100%, 76%, ${flicker})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(glyph, gx, gy);
        }
      }

      const singularities = singularitiesRef.current;
      for (let i = singularities.length - 1; i >= 0; i--) {
        const s = singularities[i];
        s.age += dt;
        const p = clamp(s.age / s.maxAge, 0, 1);
        const collapse = p < 0.68;
        const holeR = lerp(R * 0.16, R * 0.045, easeOutCubic(clamp(p / 0.68, 0, 1)));
        const horizonR = holeR * (1.6 + 0.8 * Math.sin(frameRef.current * 0.16 + i) + audioLevel * 0.4 + beatFlash * 0.2);

        ctx.beginPath();
        ctx.arc(s.x, s.y, horizonR, 0, TAU);
        ctx.strokeStyle = `hsla(${s.hue}, 100%, 72%, ${(1 - p) * (0.46 + audioLevel * 0.18 + beatFlash * 0.1)})`;
        ctx.lineWidth = 1.6 + audioLevel * 0.7 + beatFlash * 0.4;
        ctx.shadowColor = `hsla(${s.hue}, 100%, 70%, 0.7)`;
        ctx.shadowBlur = 18 + audioLevel * 10 + beatFlash * 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const blackGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, horizonR * 1.6);
        blackGrad.addColorStop(0, "rgba(0,0,0,0.95)");
        blackGrad.addColorStop(0.35, "rgba(0,0,0,0.88)");
        blackGrad.addColorStop(0.72, `hsla(${s.hue}, 100%, 62%, ${(1 - p) * (0.18 + audioLevel * 0.08 + beatFlash * 0.06)})`);
        blackGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, horizonR * 1.6, 0, TAU);
        ctx.fillStyle = blackGrad;
        ctx.fill();

        for (let j = 0; j < particlesRef.current.length; j++) {
          const part = particlesRef.current[j];
          const dx = s.x - part.x;
          const dy = s.y - part.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const influence = collapse ? R * 0.62 : R * 0.34;
          if (dist < influence) {
            const force = collapse
              ? (1 - dist / influence) * (0.22 + audioLevel * 0.08 + beatFlash * 0.04)
              : (1 - dist / influence) * -(0.16 + audioLevel * 0.04 + beatFlash * 0.03);
            const spin = collapse ? 0.11 + audioLevel * 0.05 + beatFlash * 0.03 : 0.04 + audioLevel * 0.02;
            const nx = dx / dist;
            const ny = dy / dist;
            part.ax += nx * force;
            part.ay += ny * force;
            part.ax += -ny * spin;
            part.ay += nx * spin;
          }
        }

        if (p > 0.68 && !s.exploded) {
          s.exploded = true;
          spawn(96, s.x, s.y, true, s.hue, 1.25 + audioLevel * 0.45 + beatFlash * 0.3);
          ripplesRef.current.push({ x: s.x, y: s.y, t: 0.05, maxT: 1.35 });
          if (ripplesRef.current.length > 6) ripplesRef.current.shift();
        }

        if (p >= 1) singularities.splice(i, 1);
      }

      const parts = particlesRef.current;
      let seekerCount = 0;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.role === "seeker") seekerCount += 1;

        if (p.role === "seeker") {
          const tx = ptr.active ? ptr.x : cx;
          const ty = ptr.active ? ptr.y : cy;
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const nx = dx / dist;
          const ny = dy / dist;

          const base = ptr.active ? em.seekStr : em.seekStr * 0.34;
          p.ax += nx * base;
          p.ay += ny * base;

          const strandAngle = (TAU * p.strand) / 7 + frameRef.current * (0.015 + audioLevel * 0.012 + beatFlash * 0.008) + p.helixPhase * 0.2;
          const hx = cx + Math.cos(strandAngle) * helixR * 0.54;
          const hy = cy + Math.sin(frameRef.current * (0.025 + audioLevel * 0.02 + beatFlash * 0.015) + p.strand) * helixHeight * 0.28 * moodMorph;
          p.ax += (hx - p.x) * (0.0009 + audioLevel * 0.0007 + beatFlash * 0.0004);
          p.ay += (hy - p.y) * (0.0009 + audioLevel * 0.0007 + beatFlash * 0.0004);

          if (dist < 92) {
            p.orbitAngle += (0.08 + audioLevel * 0.06 + beatFlash * 0.03) * dt * (p.strand % 2 === 0 ? 1 : -1);
            p.ax += (tx + Math.cos(p.orbitAngle) * p.orbitRadius - p.x) * (0.012 + audioLevel * 0.008 + beatFlash * 0.006);
            p.ay += (ty + Math.sin(p.orbitAngle) * p.orbitRadius - p.y) * (0.012 + audioLevel * 0.008 + beatFlash * 0.006);
          }
        }

        for (let w = 0; w < shockwaves.length; w++) {
          const sw = shockwaves[w];
          const progress = clamp(sw.age / sw.maxAge, 0, 1);
          const waveRadius = lerp(
            28,
            Math.min(W, H) * (sw.kind === "beat" ? 0.62 + sw.power * 0.1 : 0.34 + sw.power * 0.08),
            easeOutCubic(progress)
          );
          const dxw = p.x - sw.x;
          const dyw = p.y - sw.y;
          const distw = Math.hypot(dxw, dyw) || 0.001;
          const band = 14 + sw.power * 18;
          if (Math.abs(distw - waveRadius) < band) {
            const push = (1 - Math.abs(distw - waveRadius) / band) * (0.08 + sw.power * 0.18);
            const nxw = dxw / distw;
            const nyw = dyw / distw;
            p.ax += nxw * push;
            p.ay += nyw * push;
          }
        }

        if (p.role === "seeker") {
          p.vx = (p.vx + p.ax * dt) * (0.954 - audioLevel * 0.01);
          p.vy = (p.vy + p.ay * dt) * (0.954 - audioLevel * 0.01);
          p.hue = lerp(p.hue, (em.hue + p.strand * 18) % 360, 0.012 * dt + audioLevel * 0.01 + beatFlash * 0.01);
        } else {
          p.vx = (p.vx + p.ax * dt) * (0.988 - audioLevel * 0.01);
          p.vy = (p.vy + p.ay * dt) * (0.988 - audioLevel * 0.01);
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.ax = 0;
        p.ay = 0;
        p.life -= dt;

        const out = p.x < -70 || p.x > W + 70 || p.y < -70 || p.y > H + 70;
        if (p.life <= 0 || out) {
          parts.splice(i, 1);
          continue;
        }

        const alpha = clamp(p.life / p.maxLife, 0, 1);
        const size = p.size * (p.role === "spark" ? 1 + (1 - alpha) * 1.35 : 1 + audioLevel * 0.22 + beatFlash * 0.18);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, TAU);
        ctx.fillStyle = `hsla(${p.hue}, 100%, ${p.role === "spark" ? 80 : 72}%, ${alpha * (p.role === "spark" ? 0.96 : 0.66)})`;
        ctx.shadowBlur = (p.role === "spark" ? 18 : 9) + audioLevel * 10 + beatFlash * 10;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.role === "spark" && alpha > 0.24 && ((frameRef.current + p.glyphSeed) % 5 === 0)) {
          const glyph = GLYPHS[(p.glyphSeed + Math.floor(frameRef.current * (0.15 + audioLevel * 0.2 + beatFlash * 0.22))) % GLYPHS.length];
          ctx.font = `${Math.max(9, Math.floor(size * 4.2 + audioLevel * 5 + beatFlash * 5))}px 'Courier New', monospace`;
          ctx.fillStyle = `hsla(${p.hue}, 100%, 84%, ${alpha * (0.34 + audioLevel * 0.12 + beatFlash * 0.12)})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(glyph, p.x, p.y - 10 - audioLevel * 6 - beatFlash * 8);
        }
      }

      if (seekerCount < MAX_SEEKERS) {
        spawn(audioLevel > 0.16 || beatFlash > 0.1 ? 5 : 4);
      }

      if (ptr.active) {
        const pr = 24 + 5 * Math.sin(frameRef.current * 0.12) + audioLevel * 10 + beatFlash * 8;
        ctx.beginPath();
        ctx.arc(ptr.x, ptr.y, pr, 0, TAU);
        ctx.strokeStyle = `hsla(${em.hue}, 100%, 76%, ${0.34 + audioLevel * 0.1 + beatFlash * 0.12})`;
        ctx.lineWidth = 1.6 + audioLevel * 0.8 + beatFlash * 0.8;
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const a = (TAU * i) / 7 + frameRef.current * (0.03 + audioLevel * 0.02 + beatFlash * 0.016);
          ctx.beginPath();
          ctx.moveTo(ptr.x + Math.cos(a) * (pr - 5), ptr.y + Math.sin(a) * (pr - 5));
          ctx.lineTo(ptr.x + Math.cos(a) * (pr + 5), ptr.y + Math.sin(a) * (pr + 5));
          ctx.stroke();
        }
      }

      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.t += 0.03 * dt;
        const progress = clamp(r.t / r.maxT, 0, 1);
        const radius = lerp(24, 220 + audioLevel * 40 + beatFlash * 22, easeOutCubic(progress));
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, TAU);
        ctx.strokeStyle = `hsla(${em.hue}, 100%, 72%, ${(1 - progress) * (0.45 + audioLevel * 0.1 + beatFlash * 0.08)})`;
        ctx.lineWidth = 1.3 + (1 - progress) * 1.4 + audioLevel * 0.5 + beatFlash * 0.4;
        ctx.stroke();
        if (progress >= 1) ripples.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
      window.clearInterval(emotionTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [audioEnabled, spawn, triggerCoronationBurst]);

  useEffect(() => {
    return () => {
      void disableAudioReactive();
    };
  }, [disableAudioReactive]);

  const em = EMOTIONS[emotion];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "rgb(2,4,18)",
        overflow: "hidden",
        fontFamily: "'Courier New', monospace",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "rgba(2,4,18,0.7)",
          border: `1px solid hsla(${em.hue},80%,60%,0.4)`,
          borderRadius: 32,
          padding: "6px 18px",
          backdropFilter: "blur(8px)",
          transition: "border-color 1s",
        }}
      >
        {EMOTIONS.map((e, i) => (
          <button
            key={i}
            onClick={() => {
              emotionRef.current = i;
              transRef.current = 0;
              setEmotion(i);
            }}
            title={e.name}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: i === emotion ? `2px solid hsla(${e.hue},100%,70%,0.9)` : `1px solid hsla(${e.hue},60%,50%,0.3)`,
              background: i === emotion ? `hsla(${e.hue},80%,40%,0.6)` : "transparent",
              color: `hsl(${e.hue},100%,75%)`,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.4s",
              boxShadow: i === emotion ? `0 0 12px hsla(${e.hue},100%,60%,0.5)` : "none",
            }}
          >
            {e.label}
          </button>
        ))}

        <span
          style={{
            fontSize: 11,
            letterSpacing: 3,
            color: `hsla(${em.hue},90%,70%,0.9)`,
            marginLeft: 4,
            minWidth: 72,
            transition: "color 1s",
          }}
        >
          {em.name}
        </span>

        <button
          onClick={() => {
            void (audioEnabled ? disableAudioReactive() : enableAudioReactive());
          }}
          style={{
            marginLeft: 6,
            borderRadius: 999,
            border: `1px solid hsla(${em.hue},70%,60%,0.35)`,
            background: audioEnabled ? `hsla(${em.hue},80%,42%,0.45)` : "rgba(255,255,255,0.03)",
            color: `hsla(${em.hue},100%,82%,0.95)`,
            padding: "6px 10px",
            fontSize: 10,
            letterSpacing: 1,
            cursor: "pointer",
          }}
          title="Enable microphone reactive pulse"
        >
          {audioEnabled ? "MIC LIVE" : audioSupported ? "ENABLE MIC" : "MIC BLOCKED"}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 18,
          fontSize: 9,
          letterSpacing: 1.5,
          lineHeight: 1.8,
          color: `hsla(${em.hue},60%,55%,0.6)`,
          pointerEvents: "none",
        }}
      >
        <div>JEWBLE ⟁ META-PET</div>
        <div>GENOME 180-BASE-7</div>
        <div style={{ color: `hsla(${em.hue},100%,70%,0.9)` }}>STRAND {(emotion + 1).toString().padStart(2, "0")} / 07</div>
        <div>SOUL ENGINE v6</div>
        <div>{audioEnabled ? "AUDIO REACTIVE: LIVE" : "AUDIO REACTIVE: OFF"}</div>
        <div>{audioEnabled ? "BASS CROWN: ARMED" : "BASS CROWN: STANDBY"}</div>
      </div>

      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            background: "rgba(2,4,18,0.75)",
            backdropFilter: "blur(8px)",
            border: `1px solid hsla(${em.hue},60%,50%,0.3)`,
            borderRadius: 12,
            padding: "8px 14px",
            fontSize: 11,
            color: `hsla(${em.hue},80%,70%,0.8)`,
            letterSpacing: 0.8,
            lineHeight: 1.7,
            pointerEvents: "none",
            transition: "border-color 1s",
          }}
        >
          <div>↑ select emotion state</div>
          <div>◉ enable mic for live pulse</div>
          <div>♛ bass peaks trigger coronation</div>
          <div>✦ hover to attract swarm</div>
          <div>⟁ click to collapse / burst</div>
        </div>
      )}
    </div>
  );
}
