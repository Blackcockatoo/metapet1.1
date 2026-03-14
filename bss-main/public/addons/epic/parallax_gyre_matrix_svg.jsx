import React, { useMemo } from 'react'

type Point = {
  x: number
  y: number
}

type Layer = {
  front: Point[]
  back: Point[]
}

const TAU = Math.PI * 2
const BAND_COUNT = 6
const SEGMENTS = 84
const CENTER = 500

function polarToCartesian(cx: number, cy: number, r: number, theta: number): Point {
  return {
    x: cx + Math.cos(theta) * r,
    y: cy + Math.sin(theta) * r,
  }
}

function buildArcPath(points: Point[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`
  }
  return d
}

function buildBand(cx: number, cy: number, bandIndex: number, layerOffset: number): Point[] {
  const points: Point[] = []
  const phase = (bandIndex / BAND_COUNT) * TAU
  const start = 0.45 + bandIndex * 0.16
  const end = start + TAU * 1.18

  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS
    const theta = start + (end - start) * t
    const spiral = 88 * Math.exp(0.115 * (theta - start))
    const ripple = 22 * Math.sin(theta * 4.3 + phase)
    const breathing = 14 * Math.cos(theta * 1.7 - phase * 0.7)
    const radius = spiral + ripple + breathing + layerOffset
    points.push(polarToCartesian(cx, cy, radius, theta + phase * 0.22))
  }

  return points
}

function RotatingBand({
  pathId,
  d,
  stroke,
  dash,
  duration,
  delay,
  opacity,
  highlightOpacity,
}: {
  pathId: string
  d: string
  stroke: string
  dash?: string
  duration: number
  delay: number
  opacity: number
  highlightOpacity: number
}) {
  return (
    <g opacity={opacity}>
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${CENTER} ${CENTER}`}
          to={`360 ${CENTER} ${CENTER}`}
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <path id={pathId} d={d} fill="none" />
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
          filter="url(#bandGlow)"
        />
        <path
          d={d}
          fill="none"
          stroke={`rgba(255,245,220,${highlightOpacity})`}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
        />
      </g>
    </g>
  )
}

function ParticleOrbit({
  pathId,
  duration,
  delay,
  size,
}: {
  pathId: string
  duration: number
  delay: number
  size: number
}) {
  return (
    <g>
      <circle r={size} fill="#67f1ff" opacity="0.92" filter="url(#particleGlow)">
        <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
      <circle r={size * 2.8} fill="url(#particleBloom)" opacity="0.38">
        <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </g>
  )
}

function VioletBridge({
  x1,
  y1,
  x2,
  y2,
  duration,
  delay,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  duration: number
  delay: number
}) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2 - 18
  const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${mx.toFixed(2)} ${my.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`

  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from={`0 ${CENTER} ${CENTER}`}
        to={`360 ${CENTER} ${CENTER}`}
        dur={`${duration * 3.2}s`}
        begin={`${delay * -0.35}s`}
        repeatCount="indefinite"
      />
      <path d={d} fill="none" stroke="#b56dff" strokeWidth="2.4" strokeLinecap="round" opacity="0" filter="url(#bridgeGlow)">
        <animate attributeName="opacity" values="0;0.72;0" dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
      </path>
    </g>
  )
}

export default function ParallaxGyreMatrixSvg() {
  const layers = useMemo<Layer[]>(() => {
    return Array.from({ length: BAND_COUNT }, (_, bandIndex) => ({
      front: buildBand(CENTER, CENTER, bandIndex, bandIndex * 10),
      back: buildBand(CENTER, CENTER, bandIndex, bandIndex * 10 + 18),
    }))
  }, [])

  const paths = useMemo(() => {
    return layers.map((layer) => ({
      front: buildArcPath(layer.front),
      back: buildArcPath(layer.back),
    }))
  }, [layers])

  const bridgeAnchors = useMemo(() => {
    return layers.map((layer, i) => {
      const a = layer.front[Math.floor(layer.front.length * 0.42)]
      const b = layers[(i + 1) % layers.length].back[Math.floor(layers[(i + 1) % layers.length].back.length * 0.58)]
      return { a, b }
    })
  }, [layers])

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-6">
      <svg viewBox="0 0 1000 1000" className="h-auto w-full max-w-5xl" role="img" aria-label="Parallax Gyre Matrix">
        <defs>
          <radialGradient id="voidGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9ff7ff" stopOpacity="0.9" />
            <stop offset="12%" stopColor="#7ce8ff" stopOpacity="0.48" />
            <stop offset="28%" stopColor="#efc15d" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="particleBloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9ffaff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9ffaff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="goldA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff0b2" />
            <stop offset="35%" stopColor="#f4c451" />
            <stop offset="72%" stopColor="#be8222" />
            <stop offset="100%" stopColor="#6e470f" />
          </linearGradient>
          <linearGradient id="goldB" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe7a4" />
            <stop offset="34%" stopColor="#d9982f" />
            <stop offset="78%" stopColor="#70430f" />
            <stop offset="100%" stopColor="#2c1a06" />
          </linearGradient>
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="coreGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bandGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bridgeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1000" height="1000" fill="#03040a" />
        <circle cx={CENTER} cy={CENTER} r="340" fill="url(#voidGlow)" opacity="0.28" />
        <circle cx={CENTER} cy={CENTER} r="248" fill="none" stroke="rgba(63,89,180,0.18)" strokeWidth="1.2" />
        <circle cx={CENTER} cy={CENTER} r="188" fill="none" stroke="rgba(112,50,180,0.1)" strokeWidth="1.1" />

        {layers.map((_, i) => {
          const frontId = `band-front-${i}`
          const backId = `band-back-${i}`
          return (
            <g key={i}>
              <RotatingBand
                pathId={frontId}
                d={paths[i].front}
                stroke={i % 2 === 0 ? 'url(#goldA)' : 'url(#goldB)'}
                dash={i % 2 === 0 ? '20 14' : '28 16'}
                duration={36 + i * 4}
                delay={i * -1.8}
                opacity={0.78 - i * 0.06}
                highlightOpacity={0.7}
              />
              <RotatingBand
                pathId={backId}
                d={paths[i].back}
                stroke={i % 2 === 0 ? 'url(#goldB)' : 'url(#goldA)'}
                dash={i % 2 === 0 ? '14 16' : '22 20'}
                duration={48 + i * 5}
                delay={i * -1.3}
                opacity={0.28 + i * 0.05}
                highlightOpacity={0.46}
              />
              <ParticleOrbit pathId={frontId} duration={8 + i * 1.1} delay={i * -0.7} size={3.2} />
              <ParticleOrbit pathId={backId} duration={11 + i * 1.2} delay={i * -0.45} size={2.5} />
            </g>
          )
        })}

        {bridgeAnchors.map((bridge, i) => (
          <VioletBridge
            key={i}
            x1={bridge.a.x}
            y1={bridge.a.y}
            x2={bridge.b.x}
            y2={bridge.b.y}
            duration={4.8 + i * 0.65}
            delay={i * 0.9}
          />
        ))}

        <g opacity="0.75">
          <path d="M 500 320 L 626 500 L 500 680 L 374 500 Z" fill="none" stroke="rgba(201,247,255,0.18)" strokeWidth="2.2">
            <animate attributeName="opacity" values="0.1;0.36;0.1" dur="7s" repeatCount="indefinite" />
          </path>
          <path d="M 500 356 L 580 402 L 580 598 L 500 644 L 420 598 L 420 402 Z" fill="none" stroke="rgba(165,244,255,0.22)" strokeWidth="1.8">
            <animate attributeName="opacity" values="0.08;0.42;0.08" dur="9s" repeatCount="indefinite" />
          </path>
        </g>

        <g filter="url(#coreGlow)">
          <circle cx={CENTER} cy={CENTER} r="56" fill="url(#voidGlow)">
            <animate attributeName="r" values="52;60;52" dur="5.8s" repeatCount="indefinite" />
          </circle>
        </g>
        <circle cx={CENTER} cy={CENTER} r="20" fill="#04050c" />
      </svg>
    </div>
  )
}
