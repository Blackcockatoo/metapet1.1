'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Zap } from 'lucide-react'

type BandKey = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'INDIGO' | 'PURPLE'
type SlotKey = 'head' | 'aura' | 'back' | 'companion' | 'body'
type FormKey = 'radiant' | 'meditation' | 'sage' | 'vigilant'

type FormPalette = {
  name: string
  baseColor: string
  primaryGold: string
  secondaryGold: string
  tealAccent: string
  eyeColor: string
}

type BandMeta = {
  name: string
  color: string
}

type AddonRenderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  form: FormPalette,
) => void

type AddonItem = {
  id: string
  name: string
  type: string
  slot: SlotKey
  band: BandKey
  rarity: string
  emoji: string
  description: string
  fullDescription: string
  renderFn: AddonRenderer
}

type MossField = {
  seed: string
  ring: number[]
  pulse: number[]
  prng: () => number
  hash: (msg: string) => bigint
}

type BackgroundNode = {
  angle: number
  radius: number
  size: number
  speed: number
  opacity: number
}

type ShowcaseProps = {
  equippedAddons: string[]
  form: FormKey
}

const RED = '113031491493585389543778774590997079619617525721567332336510'
const BLACK = '011235831459437077415617853819099875279651673033695493257291'
const BLUE = '012776329785893036118967145479098334781325217074992143965631'

const toDigits = (value: string): number[] =>
  value.split('').map((character) => {
    const digit = character.charCodeAt(0) - 48
    if (digit < 0 || digit > 9) {
      throw new Error(`non-digit: ${character}`)
    }
    return digit
  })

const mix64 = (input: bigint | number): bigint => {
  let x = BigInt(input) ^ 0x9e3779b97f4a7c15n
  x ^= x >> 30n
  x *= 0xbf58476d1ce4e5b9n
  x ^= x >> 27n
  x *= 0x94d049bb133111ebn
  x ^= x >> 31n
  return x & ((1n << 64n) - 1n)
}

const initField = (seedName: string = 'AURALIA'): MossField => {
  const r = toDigits(RED)
  const k = toDigits(BLACK)
  const b = toDigits(BLUE)

  const pulse = r.map((rv, index) => (rv ^ k[(index * 7) % 60] ^ b[(index * 13) % 60]) % 10)
  const ring = Array.from({ length: 60 }, (_, index) => (r[index] + k[index] + b[index]) % 10)

  const char0 = seedName.codePointAt(0) ?? 65
  const char1 = seedName.codePointAt(1) ?? char0

  let s0 = mix64(BigInt(char0))
  let s1 = mix64(BigInt(char1))

  const prng = (): number => {
    let x = s0
    const y = s1
    s0 = y
    x ^= x << 23n
    x ^= x >> 17n
    x ^= y ^ (y >> 26n)
    s1 = x
    return Number((s0 + s1) & ((1n << 32n) - 1n)) / 0x100000000
  }

  const hash = (message: string): bigint => {
    let h = BigInt(char0)
    for (let index = 0; index < message.length; index += 1) {
      h = mix64(h ^ BigInt(message.charCodeAt(index) + index * 1315423911))
    }
    return h
  }

  return { seed: seedName, ring, pulse, prng, hash }
}

const renderChronoGoggles: AddonRenderer = (ctx, x, y, time) => {
  const shimmerAlpha = Math.sin(time * 0.004) * 0.3 + 0.5
  const glowColor = `rgba(162, 155, 254, ${Math.max(0.12, shimmerAlpha * 0.6)})`
  const haloColor = `rgba(162, 155, 254, ${Math.max(0.08, shimmerAlpha * 0.3)})`

  ctx.save()
  ctx.translate(x - 8, y - 65)
  ctx.strokeStyle = glowColor
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, 12, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = haloColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(x + 8, y - 65)
  ctx.strokeStyle = glowColor
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, 12, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = haloColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  ctx.strokeStyle = glowColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - 6, y - 65)
  ctx.lineTo(x + 6, y - 65)
  ctx.stroke()
}

const renderAuraSentience: AddonRenderer = (ctx, x, y, time) => {
  const glowRadius = 85 + Math.sin(time * 0.002) * 10
  const glowAlpha = Math.max(0.12, 0.4 + Math.sin(time * 0.003) * 0.2)

  ctx.strokeStyle = `rgba(244, 185, 66, ${glowAlpha * 0.6})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha * 0.3})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, glowRadius + 15, 0, Math.PI * 2)
  ctx.stroke()

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 + time * 0.001
    const radius = glowRadius - 5
    const sx = x + Math.cos(angle) * radius
    const sy = y + Math.sin(angle) * radius
    const sparkleAlpha = Math.max(0.1, Math.sin(time * 0.004 + index * 0.5) * 0.5 + 0.5)

    ctx.fillStyle = `rgba(244, 185, 66, ${sparkleAlpha})`
    ctx.beginPath()
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

const renderMantleStarlight: AddonRenderer = (ctx, x, y, time) => {
  const mantleTime = time * 0.0015
  const waveAmplitude = 20 + Math.sin(mantleTime) * 10

  ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(x - 35, y + 50)
  ctx.quadraticCurveTo(x - 55, y + 90 + Math.sin(mantleTime) * waveAmplitude, x - 20, y + 150)
  ctx.quadraticCurveTo(x, y + 160 + Math.sin(mantleTime + 0.5) * 10, x + 20, y + 150)
  ctx.quadraticCurveTo(x + 55, y + 90 + Math.sin(mantleTime + 1) * waveAmplitude, x + 35, y + 50)
  ctx.stroke()

  for (let index = 0; index < 7; index += 1) {
    const starX = x - 30 + (index / 7) * 60 + Math.sin(mantleTime + index) * 15
    const starY = y + 70 + (index / 7) * 50 + Math.cos(mantleTime + index * 0.3) * 10
    const starAlpha = Math.max(0.1, 0.6 + Math.sin(mantleTime + index * 0.4) * 0.4)

    ctx.fillStyle = `rgba(78, 205, 196, ${starAlpha})`
    ctx.beginPath()
    ctx.arc(starX, starY, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(78, 205, 196, 0.2)'
  ctx.lineWidth = 1
  for (let index = 0; index < 3; index += 1) {
    const offsetX = x + (index - 1) * 20
    ctx.beginPath()
    ctx.moveTo(offsetX, y + 50)
    ctx.quadraticCurveTo(offsetX - 20, y + 100, offsetX + 10, y + 150)
    ctx.stroke()
  }
}

const renderPhoenixWings: AddonRenderer = (ctx, x, y, time) => {
  const wingTime = time * 0.003
  const wingExpand = Math.sin(wingTime) * 0.15 + 1
  const shockAlpha = Math.max(0.12, Math.sin(wingTime * 2) * 0.4 + 0.5)

  ctx.save()
  ctx.translate(x - 40, y + 10)
  ctx.scale(-wingExpand, wingExpand)
  ctx.fillStyle = 'rgba(255, 107, 53, 0.7)'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-50, -35)
  ctx.quadraticCurveTo(-45, -15, -25, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(x + 40, y + 10)
  ctx.scale(wingExpand, wingExpand)
  ctx.fillStyle = 'rgba(255, 107, 53, 0.7)'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(50, -35)
  ctx.quadraticCurveTo(45, -15, 25, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()

  ctx.strokeStyle = `rgba(251, 191, 36, ${shockAlpha * 0.7})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y + 10, 50 + Math.sin(wingTime) * 15, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = `rgba(251, 191, 36, ${shockAlpha * 0.3})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y + 10, 70 + Math.sin(wingTime + 0.5) * 20, 0, Math.PI * 2)
  ctx.stroke()
}

const renderPrismFamiliar: AddonRenderer = (ctx, x, y, time) => {
  const familiarTime = time * 0.002
  const fx = x + 65 + Math.sin(familiarTime) * 25
  const fy = y - 25 + Math.cos(familiarTime * 0.7) * 20

  ctx.fillStyle = '#f4b942'
  ctx.beginPath()
  ctx.moveTo(fx, fy - 14)
  ctx.lineTo(fx + 12, fy + 8)
  ctx.lineTo(fx - 12, fy + 8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.strokeStyle = 'rgba(244, 185, 66, 0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(fx, fy, 18, 0, Math.PI * 2)
  ctx.stroke()

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + familiarTime * 1.5
    const sx = fx + Math.cos(angle) * 22
    const sy = fy + Math.sin(angle) * 22
    const sparkleAlpha = Math.max(0.1, Math.sin(familiarTime + index * 0.6) * 0.5 + 0.6)

    ctx.fillStyle = `rgba(244, 185, 66, ${sparkleAlpha})`
    ctx.beginPath()
    ctx.arc(sx, sy, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

const renderCrystalHarness: AddonRenderer = (ctx, x, y, time) => {
  const crystalTime = time * 0.002
  const breatheScale = 1 + Math.sin(crystalTime) * 0.1
  const glowAlpha = Math.max(0.12, 0.4 + Math.sin(crystalTime) * 0.2)

  ctx.save()
  ctx.translate(x, y + 20)
  ctx.scale(breatheScale, breatheScale)
  ctx.strokeStyle = `rgba(78, 205, 196, ${glowAlpha})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2
    const radius = 18 + Math.sin(crystalTime + angle * 2) * 4
    const px = Math.cos(angle) * radius
    const py = Math.sin(angle) * radius
    if (index === 0) {
      ctx.moveTo(px, py)
    } else {
      ctx.lineTo(px, py)
    }
  }
  ctx.closePath()
  ctx.stroke()

  ctx.strokeStyle = `rgba(78, 205, 196, ${glowAlpha * 0.6})`
  ctx.lineWidth = 0.8
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2
    const endX = Math.cos(angle) * 28
    const endY = Math.sin(angle) * 28
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(Math.cos(angle) * 15, Math.sin(angle) * 15, endX, endY)
    ctx.stroke()
  }
  ctx.restore()
}

const renderEchoOrb: AddonRenderer = (ctx, x, y, time) => {
  const echoTime = time * 0.0025
  const ringAlpha = Math.max(0.12, Math.sin(echoTime) * 0.4 + 0.5)
  const ox = x + 55
  const oy = y - 30

  ctx.fillStyle = 'rgba(162, 155, 254, 0.8)'
  ctx.beginPath()
  ctx.arc(ox, oy, 10, 0, Math.PI * 2)
  ctx.fill()

  for (let index = 0; index < 3; index += 1) {
    const radius = 20 + index * 12 + Math.sin(echoTime + index * 0.5) * 8
    const alpha = Math.max(0.08, ringAlpha * (0.7 - index * 0.2))
    ctx.strokeStyle = `rgba(162, 155, 254, ${alpha})`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(ox, oy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  const ghostRadius = 25 + Math.sin(echoTime * 1.5) * 12
  ctx.strokeStyle = `rgba(162, 155, 254, ${ringAlpha * 0.3})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(ox, oy, ghostRadius, 0, Math.PI * 2)
  ctx.stroke()
}

const ADDON_ITEMS: AddonItem[] = [
  {
    id: 'HW-IN-chronoshift-001',
    name: 'Chrono-Shift Goggles',
    type: 'HEADWEAR',
    slot: 'head',
    band: 'INDIGO',
    rarity: 'Legendary',
    emoji: '⏱️',
    description: 'Goggles that warp temporal perception.',
    fullDescription: 'Twin-lens design with time-offset clarity. Worn by architects of temporal ceremony.',
    renderFn: renderChronoGoggles,
  },
  {
    id: 'AU-YL-sentience-001',
    name: 'Aura of Sentience',
    type: 'AURA',
    slot: 'aura',
    band: 'YELLOW',
    rarity: 'Epic',
    emoji: '✨',
    description: 'Luminous field radiating conscious awareness.',
    fullDescription: 'Sparkles with purpose. The Atelier swears these are made from moments of breakthrough.',
    renderFn: renderAuraSentience,
  },
  {
    id: 'BK-BL-starlight-001',
    name: 'Starlight Mantle',
    type: 'BACK ATTACHMENT',
    slot: 'back',
    band: 'BLUE',
    rarity: 'Epic',
    emoji: '🌙',
    description: 'Flowing cloak of starlit mist.',
    fullDescription: 'Drifts with cosmic grace. Woven from the breath of the Flow streams.',
    renderFn: renderMantleStarlight,
  },
  {
    id: 'BK-RD-phoenix-001',
    name: 'Phoenix Wings',
    type: 'BACK ATTACHMENT',
    slot: 'back',
    band: 'RED',
    rarity: 'Legendary',
    emoji: '🔥',
    description: 'Wings of pure impact.',
    fullDescription: 'Burst with recoil when unfurled. Ascendance incarnate.',
    renderFn: renderPhoenixWings,
  },
  {
    id: 'CO-YL-familiar-001',
    name: 'Prism-Chime Familiar',
    type: 'COMPANION',
    slot: 'companion',
    band: 'YELLOW',
    rarity: 'Legendary',
    emoji: '🔮',
    description: 'Tiny familiar made of light.',
    fullDescription: 'Speaks in glints and tones. Celebrates every moment with chimes.',
    renderFn: renderPrismFamiliar,
  },
  {
    id: 'BW-GN-crystalheart-001',
    name: 'Crystal Heart Harness',
    type: 'BODYWEAR',
    slot: 'body',
    band: 'GREEN',
    rarity: 'Rare',
    emoji: '💎',
    description: 'Living crystalline harness that breathes.',
    fullDescription: 'Grows with the wearer. Veins illuminate in cascades. Growth embodied.',
    renderFn: renderCrystalHarness,
  },
  {
    id: 'CO-IN-echovoid-001',
    name: 'Echoing Void Orb',
    type: 'COMPANION',
    slot: 'companion',
    band: 'INDIGO',
    rarity: 'Rare',
    emoji: '◯',
    description: 'Temporal companion listening for time cracks.',
    fullDescription: 'Floats near the wearer, slightly out of sync. Rings expand and echo.',
    renderFn: renderEchoOrb,
  },
]

const BANDS: Record<BandKey, BandMeta> = {
  RED: { name: 'Impact', color: '#ff6b35' },
  ORANGE: { name: 'Kinetic', color: '#ff6b35' },
  YELLOW: { name: 'Radiant', color: '#f4b942' },
  GREEN: { name: 'Growth', color: '#4ecdc4' },
  BLUE: { name: 'Flow', color: '#4ecdc4' },
  INDIGO: { name: 'Phase', color: '#a29bfe' },
  PURPLE: { name: 'Transcendent', color: '#a855f7' },
}

const FORMS: Record<FormKey, FormPalette> = {
  radiant: {
    name: 'Radiant Guardian',
    baseColor: '#2c3e77',
    primaryGold: '#f4b942',
    secondaryGold: '#ffd700',
    tealAccent: '#4ecdc4',
    eyeColor: '#f4b942',
  },
  meditation: {
    name: 'Meditation Cocoon',
    baseColor: '#0d1321',
    primaryGold: '#2dd4bf',
    secondaryGold: '#4ecdc4',
    tealAccent: '#1a4d4d',
    eyeColor: '#2dd4bf',
  },
  sage: {
    name: 'Sage Luminary',
    baseColor: '#1a1f3a',
    primaryGold: '#ffd700',
    secondaryGold: '#f4b942',
    tealAccent: '#4ecdc4',
    eyeColor: '#ffd700',
  },
  vigilant: {
    name: 'Vigilant Sentinel',
    baseColor: '#1a1f3a',
    primaryGold: '#ff6b35',
    secondaryGold: '#ff8c42',
    tealAccent: '#4ecdc4',
    eyeColor: '#ff6b35',
  },
}

const drawMetaPetBase = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  time: number,
  palette: FormPalette,
) => {
  const bodyY = centerY + 10
  const headY = centerY - 55
  const eyePulse = 14 + Math.sin(time * 0.001) * 1

  const goldGlow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 150)
  goldGlow.addColorStop(0, 'rgba(244, 185, 66, 0.08)')
  goldGlow.addColorStop(1, 'rgba(244, 185, 66, 0)')

  const redCore = ctx.createLinearGradient(centerX, headY + 5, centerX, bodyY + 50)
  redCore.addColorStop(0, 'rgba(255, 107, 53, 0.45)')
  redCore.addColorStop(1, 'rgba(255, 107, 53, 0)')

  ctx.save()

  ctx.fillStyle = goldGlow
  ctx.beginPath()
  ctx.arc(centerX, centerY, 150, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = palette.baseColor
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.ellipse(centerX, bodyY, 40, 60, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(centerX, headY, 30, 35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = redCore
  ctx.beginPath()
  ctx.rect(centerX - 15, headY + 5, 30, 100)
  ctx.fill()

  ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(centerX, headY + 5)
  ctx.bezierCurveTo(centerX, headY - 45, centerX + 26, headY - 45, centerX + 26, headY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX, headY + 5)
  ctx.bezierCurveTo(centerX, headY - 45, centerX - 26, headY - 45, centerX - 26, headY)
  ctx.stroke()

  ctx.fillStyle = 'rgba(13, 19, 33, 0.8)'
  ctx.beginPath()
  ctx.arc(centerX - 20, headY, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX + 20, headY, 16, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = palette.eyeColor
  ctx.shadowColor = palette.eyeColor
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(centerX - 20, headY, eyePulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX + 20, headY, eyePulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255, 215, 0, 0.6)'
  ctx.beginPath()
  ctx.arc(centerX - 20, headY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX + 20, headY, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.arc(centerX - 23, headY - 3, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX + 17, headY - 3, 3, 0, Math.PI * 2)
  ctx.fill()


  ctx.fillStyle = palette.primaryGold
  ctx.shadowColor = palette.primaryGold
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(centerX, headY - 25, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.restore()
}

function AuraliaCanvasShowcase({ equippedAddons, form }: ShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const fieldRef = useRef<MossField>(initField('AURALIA'))
  const backgroundNodesRef = useRef<BackgroundNode[]>([])

  if (backgroundNodesRef.current.length === 0) {
    const nodes: BackgroundNode[] = []
    for (let index = 0; index < 24; index += 1) {
      const ringValue = fieldRef.current.ring[index % fieldRef.current.ring.length]
      const pulseValue = fieldRef.current.pulse[index % fieldRef.current.pulse.length]
      nodes.push({
        angle: fieldRef.current.prng() * Math.PI * 2,
        radius: 82 + ringValue * 8 + fieldRef.current.prng() * 18,
        size: 1.5 + pulseValue * 0.16,
        speed: 0.00035 + ringValue * 0.00003,
        opacity: 0.12 + pulseValue * 0.035,
      })
    }
    backgroundNodesRef.current = nodes
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) {
        return
      }
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const animate = (time: number) => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr
      const centerX = width / 2
      const centerY = height / 2.2
      const palette = FORMS[form]

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(2, 6, 23, 1)'
      ctx.fillRect(0, 0, width, height)

      const glowAlpha = Math.max(0.04, Math.sin(time * 0.001) * 0.15 + 0.15)
      ctx.fillStyle = `rgba(244, 185, 66, ${glowAlpha * 0.2})`
      ctx.beginPath()
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(244, 185, 66, 0.15)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(centerX, centerY, 130, 0, Math.PI * 2)
      ctx.stroke()

      for (const node of backgroundNodesRef.current) {
        const theta = node.angle + time * node.speed
        const px = centerX + Math.cos(theta) * node.radius
        const py = centerY + Math.sin(theta) * node.radius * 0.68
        ctx.fillStyle = `rgba(244, 185, 66, ${node.opacity})`
        ctx.beginPath()
        ctx.arc(px, py, node.size, 0, Math.PI * 2)
        ctx.fill()
      }

      drawMetaPetBase(ctx, centerX, centerY, time, palette)

      for (const addonId of equippedAddons) {
        const addon = ADDON_ITEMS.find((item) => item.id === addonId)
        if (addon) {
          addon.renderFn(ctx, centerX, centerY, time, palette)
        }
      }

      animationRef.current = window.requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    animationRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', resize)
    }
  }, [equippedAddons, form])

  return <canvas ref={canvasRef} className="h-96 w-full rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-950 to-black" />
}

export default function AuraliaAddonShowcaseProduction() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [equippedAddons, setEquippedAddons] = useState<string[]>(['BK-RD-phoenix-001'])
  const [form, setForm] = useState<FormKey>('radiant')
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const autoplayRef = useRef<ReturnType<typeof window.setInterval> | null>(null)

  const current = ADDON_ITEMS[currentIndex] ?? ADDON_ITEMS[0]
  const band = BANDS[current.band]
  const addonById = useMemo(() => new Map(ADDON_ITEMS.map((addon) => [addon.id, addon])), [])

  const equippedAddonItems = useMemo(
    () => equippedAddons.map((id) => addonById.get(id)).filter((addon): addon is AddonItem => Boolean(addon)),
    [addonById, equippedAddons],
  )

  useEffect(() => {
    if (autoplayRef.current !== null) {
      window.clearInterval(autoplayRef.current)
      autoplayRef.current = null
    }

    if (!isAutoPlay) {
      return
    }

    autoplayRef.current = window.setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % ADDON_ITEMS.length)
    }, 5000)

    return () => {
      if (autoplayRef.current !== null) {
        window.clearInterval(autoplayRef.current)
        autoplayRef.current = null
      }
    }
  }, [isAutoPlay])

  const toggleEquip = () => {
    setEquippedAddons((previous) => {
      if (previous.includes(current.id)) {
        return previous.filter((id) => id !== current.id)
      }
      return [...previous.filter((id) => addonById.get(id)?.slot !== current.slot), current.id]
    })
  }

  const goNext = () => {
    setCurrentIndex((previous) => (previous + 1) % ADDON_ITEMS.length)
    setIsAutoPlay(false)
  }

  const goPrev = () => {
    setCurrentIndex((previous) => (previous - 1 + ADDON_ITEMS.length) % ADDON_ITEMS.length)
    setIsAutoPlay(false)
  }

  const isEquipped = equippedAddons.includes(current.id)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="border-b border-slate-800/50 bg-gradient-to-b from-slate-900/50 to-transparent px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-amber-400" />
            <h1 className="text-4xl font-light tracking-wider">AURALIA ADDON SHOWCASE</h1>
          </div>
          <p className="text-sm text-slate-400">
            High-fidelity Moss60 rendering with live addon equipping. Watch Auralia transform in real-time.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-6">
          <div className="mb-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Live Rendering</h2>
            <AuraliaCanvasShowcase equippedAddons={equippedAddons} form={form} />
          </div>

          <div className="mb-6 rounded border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Guardian Form</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(Object.keys(FORMS) as FormKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(key)}
                  className={`rounded px-3 py-2 text-xs font-bold transition ${
                    form === key ? 'bg-amber-500 text-black' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {FORMS[key].name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-700/50 pt-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase text-slate-400">Current</p>
                <p className="text-lg font-light text-slate-100">{current.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Type</p>
                <p className="font-mono text-sm text-slate-300">{current.type}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Band</p>
                <p className="font-bold" style={{ color: band.color }}>
                  {band.name}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Rarity</p>
                <p className="font-mono text-sm text-amber-300">{current.rarity}</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-300">{current.fullDescription}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="flex items-center gap-2 rounded border border-slate-600/50 bg-slate-800/50 px-4 py-2 text-sm transition hover:bg-slate-700/50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={toggleEquip}
                className={`flex-1 rounded py-2 text-sm font-bold transition ${
                  isEquipped ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-amber-500 text-black hover:bg-amber-400'
                }`}
              >
                {isEquipped ? '✓ Equipped' : 'Equip Addon'}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-2 rounded border border-slate-600/50 bg-slate-800/50 px-4 py-2 text-sm transition hover:bg-slate-700/50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-center gap-2">
              {ADDON_ITEMS.map((addon, index) => (
                <button
                  key={addon.id}
                  type="button"
                  aria-label={`Go to ${addon.name}`}
                  onClick={() => {
                    setCurrentIndex(index)
                    setIsAutoPlay(false)
                  }}
                  className={`h-2 rounded-full transition ${index === currentIndex ? 'w-8 bg-amber-500' : 'w-2 bg-slate-600'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {equippedAddonItems.length > 0 && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
              <Zap className="h-4 w-4 text-amber-400" />
              Currently Equipped ({equippedAddonItems.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {equippedAddonItems.map((addon) => {
                const addonBand = BANDS[addon.band]
                return (
                  <div key={addon.id} className="rounded border border-slate-700/30 bg-slate-800/50 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-light text-slate-100">{addon.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{addon.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEquippedAddons((previous) => previous.filter((id) => id !== addon.id))}
                        className="text-xs text-slate-400 transition hover:text-slate-100"
                        aria-label={`Remove ${addon.name}`}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-700/30 pt-2">
                      <span className="inline-block rounded px-2 py-1 text-xs font-bold text-black" style={{ backgroundColor: addonBand.color }}>
                        {addonBand.name}
                      </span>
                      <span className="font-mono text-xs text-amber-300">{addon.rarity}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-6">
          <h3 className="mb-4 text-lg font-light tracking-wider text-slate-100">Addon Index</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ADDON_ITEMS.map((addon, index) => {
              const addonBand = BANDS[addon.band]
              const equipped = equippedAddons.includes(addon.id)
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(index)
                    setIsAutoPlay(false)
                  }}
                  className={`rounded-lg border p-3 text-left transition ${
                    equipped
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="mb-2 text-2xl">{addon.emoji}</div>
                  <p className="text-sm font-light text-slate-100">{addon.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{addon.type}</p>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-700/30 pt-2">
                    <span className="rounded px-1.5 py-0.5 text-xs font-bold text-black" style={{ backgroundColor: addonBand.color }}>
                      {addonBand.name}
                    </span>
                    <span className="text-xs text-slate-400">{addon.rarity}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
