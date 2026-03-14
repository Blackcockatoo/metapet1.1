"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatPill, Surface } from "@bluesnake-studios/ui";

function SparklesIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

import {
  getAddonShowcaseMeta,
  showcaseBands,
  showcaseForms,
  type AddonShowcaseMeta,
  type ShowcaseFormKey
} from "@/lib/addon-showcase/catalog";
import { formatAddonRarity } from "@/lib/addon-display";

type ShowcaseListingLike = {
  id: string;
  templateId: string;
  name: string;
  rarity: string;
};

type PreviewPalette = (typeof showcaseForms)[ShowcaseFormKey];

function drawMetaPetBase(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  time: number,
  palette: PreviewPalette
) {
  const bodyY = centerY + 10;
  const headY = centerY - 55;
  const eyePulse = 14 + Math.sin(time * 0.001) * 1;

  const bodyGlow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 160);
  bodyGlow.addColorStop(0, "rgba(244, 185, 66, 0.08)");
  bodyGlow.addColorStop(1, "rgba(244, 185, 66, 0)");

  const coreBeam = ctx.createLinearGradient(centerX, headY + 5, centerX, bodyY + 55);
  coreBeam.addColorStop(0, "rgba(255, 107, 53, 0.42)");
  coreBeam.addColorStop(1, "rgba(255, 107, 53, 0)");

  ctx.save();
  ctx.fillStyle = bodyGlow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.baseColor;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.ellipse(centerX, bodyY, 40, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX, headY, 30, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = coreBeam;
  ctx.beginPath();
  ctx.rect(centerX - 15, headY + 5, 30, 100);
  ctx.fill();

  ctx.strokeStyle = "rgba(78, 205, 196, 0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(centerX, headY + 5);
  ctx.bezierCurveTo(centerX, headY - 45, centerX + 26, headY - 45, centerX + 26, headY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX, headY + 5);
  ctx.bezierCurveTo(centerX, headY - 45, centerX - 26, headY - 45, centerX - 26, headY);
  ctx.stroke();

  ctx.fillStyle = "rgba(13, 19, 33, 0.82)";
  ctx.beginPath();
  ctx.arc(centerX - 20, headY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 20, headY, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.eyeColor;
  ctx.shadowColor = palette.eyeColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(centerX - 20, headY, eyePulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 20, headY, eyePulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 215, 0, 0.58)";
  ctx.beginPath();
  ctx.arc(centerX - 20, headY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 20, headY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.arc(centerX - 23, headY - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 17, headY - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.primaryAccent;
  ctx.shadowColor = palette.primaryAccent;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(centerX, headY - 25, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderChronoShiftGoggles(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const shimmerAlpha = Math.sin(time * 0.004) * 0.3 + 0.5;
  const glowColor = `rgba(162, 155, 254, ${Math.max(0.12, shimmerAlpha * 0.6)})`;
  const haloColor = `rgba(162, 155, 254, ${Math.max(0.08, shimmerAlpha * 0.3)})`;

  for (const lensX of [x - 8, x + 8]) {
    ctx.save();
    ctx.translate(lensX, y - 65);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 65);
  ctx.lineTo(x + 6, y - 65);
  ctx.stroke();
}

function renderAuraOfSentience(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const glowRadius = 85 + Math.sin(time * 0.002) * 10;
  const glowAlpha = Math.max(0.12, 0.4 + Math.sin(time * 0.003) * 0.2);

  ctx.strokeStyle = `rgba(244, 185, 66, ${glowAlpha * 0.6})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius + 15, 0, Math.PI * 2);
  ctx.stroke();

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 + time * 0.001;
    const radius = glowRadius - 5;
    const sx = x + Math.cos(angle) * radius;
    const sy = y + Math.sin(angle) * radius;
    const sparkleAlpha = Math.max(0.1, Math.sin(time * 0.004 + index * 0.5) * 0.5 + 0.5);

    ctx.fillStyle = `rgba(244, 185, 66, ${sparkleAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderPhoenixWings(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const wingTime = time * 0.003;
  const wingExpand = Math.sin(wingTime) * 0.15 + 1;
  const shockAlpha = Math.max(0.12, Math.sin(wingTime * 2) * 0.4 + 0.5);

  ctx.save();
  ctx.translate(x - 40, y + 10);
  ctx.scale(-wingExpand, wingExpand);
  ctx.fillStyle = "rgba(255, 107, 53, 0.72)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-50, -35);
  ctx.quadraticCurveTo(-45, -15, -25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(x + 40, y + 10);
  ctx.scale(wingExpand, wingExpand);
  ctx.fillStyle = "rgba(255, 107, 53, 0.72)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(50, -35);
  ctx.quadraticCurveTo(45, -15, 25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = `rgba(251, 191, 36, ${shockAlpha * 0.7})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 10, 50 + Math.sin(wingTime) * 15, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(251, 191, 36, ${shockAlpha * 0.3})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y + 10, 70 + Math.sin(wingTime + 0.5) * 20, 0, Math.PI * 2);
  ctx.stroke();
}

function renderStarlightMantle(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const mantleTime = time * 0.0015;
  const waveAmplitude = 20 + Math.sin(mantleTime) * 10;

  ctx.strokeStyle = "rgba(78, 205, 196, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 35, y + 50);
  ctx.quadraticCurveTo(x - 55, y + 90 + Math.sin(mantleTime) * waveAmplitude, x - 20, y + 150);
  ctx.quadraticCurveTo(x, y + 160 + Math.sin(mantleTime + 0.5) * 10, x + 20, y + 150);
  ctx.quadraticCurveTo(x + 55, y + 90 + Math.sin(mantleTime + 1) * waveAmplitude, x + 35, y + 50);
  ctx.stroke();

  for (let index = 0; index < 7; index += 1) {
    const starX = x - 30 + (index / 7) * 60 + Math.sin(mantleTime + index) * 15;
    const starY = y + 70 + (index / 7) * 50 + Math.cos(mantleTime + index * 0.3) * 10;
    const starAlpha = Math.max(0.1, 0.6 + Math.sin(mantleTime + index * 0.4) * 0.4);

    ctx.fillStyle = `rgba(120, 200, 255, ${starAlpha})`;
    ctx.beginPath();
    ctx.arc(starX, starY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderPrismChimeFamiliar(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const familiarTime = time * 0.002;
  const fx = x + 65 + Math.sin(familiarTime) * 25;
  const fy = y - 25 + Math.cos(familiarTime * 0.7) * 20;

  ctx.fillStyle = "#f4b942";
  ctx.beginPath();
  ctx.moveTo(fx, fy - 14);
  ctx.lineTo(fx + 12, fy + 8);
  ctx.lineTo(fx - 12, fy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = "rgba(244, 185, 66, 0.7)";
  ctx.beginPath();
  ctx.arc(fx, fy, 18, 0, Math.PI * 2);
  ctx.stroke();

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + familiarTime * 1.5;
    const sx = fx + Math.cos(angle) * 22;
    const sy = fy + Math.sin(angle) * 22;
    const sparkleAlpha = Math.max(0.1, Math.sin(familiarTime + index * 0.6) * 0.5 + 0.6);

    ctx.fillStyle = `rgba(255, 220, 120, ${sparkleAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderCrystalHeartHarness(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const crystalTime = time * 0.002;
  const breatheScale = 1 + Math.sin(crystalTime) * 0.1;
  const glowAlpha = Math.max(0.12, 0.4 + Math.sin(crystalTime) * 0.2);

  ctx.save();
  ctx.translate(x, y + 20);
  ctx.scale(breatheScale, breatheScale);
  ctx.strokeStyle = `rgba(78, 205, 196, ${glowAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const radius = 18 + Math.sin(crystalTime + angle * 2) * 4;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = `rgba(110, 231, 183, ${glowAlpha * 0.7})`;
  ctx.lineWidth = 0.8;
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const endX = Math.cos(angle) * 28;
    const endY = Math.sin(angle) * 28;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(angle) * 15, Math.sin(angle) * 15, endX, endY);
    ctx.stroke();
  }
  ctx.restore();
}

function renderEchoingVoidOrb(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const echoTime = time * 0.0025;
  const ringAlpha = Math.max(0.12, Math.sin(echoTime) * 0.4 + 0.5);
  const ox = x + 55;
  const oy = y - 30;

  ctx.fillStyle = "rgba(162, 155, 254, 0.8)";
  ctx.beginPath();
  ctx.arc(ox, oy, 10, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 3; index += 1) {
    const radius = 20 + index * 12 + Math.sin(echoTime + index * 0.5) * 8;
    const alpha = Math.max(0.08, ringAlpha * (0.7 - index * 0.2));
    ctx.strokeStyle = `rgba(162, 155, 254, ${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderGravityWellGauntlet(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const spin = time * 0.004;
  const gx = x + 62;
  const gy = y + 12;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(spin);
  ctx.strokeStyle = "rgba(255, 140, 66, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 10, Math.PI / 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255, 107, 53, 0.75)";
  ctx.beginPath();
  ctx.roundRect(gx - 12, gy - 10, 18, 24, 6);
  ctx.fill();

  for (let index = 0; index < 4; index += 1) {
    const angle = spin + index * (Math.PI / 2);
    const px = gx + Math.cos(angle) * 28;
    const py = gy + Math.sin(angle) * 14;
    ctx.fillStyle = "rgba(255, 183, 77, 0.85)";
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderResonanceAmplifier(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const pulse = Math.sin(time * 0.004) * 0.5 + 0.5;
  for (let index = 0; index < 3; index += 1) {
    const radius = 80 + index * 18 + pulse * 10;
    const alpha = 0.28 - index * 0.06 + pulse * 0.08;
    ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0.08, alpha)})`;
    ctx.lineWidth = 2 - index * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderDreamWeaverCirclet(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const wave = time * 0.002;
  ctx.strokeStyle = "rgba(103, 232, 249, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 78);
  ctx.quadraticCurveTo(x - 8, y - 88 + Math.sin(wave) * 4, x, y - 80);
  ctx.quadraticCurveTo(x + 8, y - 72 + Math.cos(wave) * 4, x + 24, y - 78);
  ctx.stroke();

  for (let index = 0; index < 5; index += 1) {
    const px = x - 22 + index * 11;
    const py = y - 81 + Math.sin(wave + index * 0.6) * 4;
    ctx.fillStyle = "rgba(125, 211, 252, 0.8)";
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderSovereignWings(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const wingTime = time * 0.0015;
  const expand = Math.sin(wingTime) * 0.06 + 1;

  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(x + side * 38, y + 8);
    ctx.scale(side * expand, expand);

    ctx.fillStyle = "rgba(220, 170, 60, 0.70)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(20, -15, 60, -25, 75, -50);
    ctx.bezierCurveTo(65, -38, 40, -22, 18, -12);
    ctx.bezierCurveTo(10, -5, 4, -2, 0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(244, 185, 66, 0.30)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(15, 5, 45, -5, 58, -28);
    ctx.bezierCurveTo(50, -18, 28, -10, 12, -4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 220, 100, 0.75)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(20, -15, 60, -25, 75, -50);
    ctx.stroke();

    ctx.restore();
  }

  const haloAlpha = 0.28 + Math.sin(wingTime * 1.5) * 0.12;
  ctx.strokeStyle = `rgba(255, 215, 0, ${haloAlpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y - 10, 92, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
}

function renderRitualMask(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const maskTime = time * 0.0012;
  const shimmer = 0.5 + Math.sin(maskTime) * 0.28;
  const maskY = y - 58;

  ctx.fillStyle = `rgba(22, 18, 42, ${shimmer * 0.7 + 0.25})`;
  ctx.beginPath();
  ctx.ellipse(x, maskY, 23, 27, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(180, 155, 230, ${shimmer * 0.65 + 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, maskY, 23, 27, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(160, 140, 210, ${shimmer * 0.5})`;
  ctx.lineWidth = 0.8;
  for (let index = 0; index < 3; index += 1) {
    const lineY = maskY - 8 + index * 8;
    ctx.beginPath();
    ctx.moveTo(x - 12, lineY);
    ctx.lineTo(x + 12, lineY);
    ctx.stroke();
  }

  const crownPulse = 0.5 + Math.sin(maskTime * 2) * 0.35;
  ctx.fillStyle = `rgba(200, 175, 255, ${crownPulse * 0.85})`;
  ctx.shadowColor = "rgba(200, 175, 255, 0.6)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, maskY - 24, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(180, 155, 230, ${shimmer * 0.4})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, maskY - 20);
  ctx.lineTo(x, maskY - 24);
  ctx.lineTo(x + 6, maskY - 20);
  ctx.stroke();
}

function renderAmbientAura(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const auraTime = time * 0.0018;
  const radius = 78 + Math.sin(auraTime) * 8;
  const alpha = 0.22 + Math.sin(auraTime * 1.3) * 0.1;

  const gradient = ctx.createRadialGradient(x, y, radius * 0.55, x, y, radius + 22);
  gradient.addColorStop(0, `rgba(78, 205, 196, ${alpha * 0.25})`);
  gradient.addColorStop(0.55, `rgba(78, 205, 196, ${alpha})`);
  gradient.addColorStop(1, "rgba(78, 205, 196, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius + 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(100, 220, 210, ${alpha * 1.4})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(78, 205, 196, ${alpha * 0.5})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius + 14, 0, Math.PI * 2);
  ctx.stroke();

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + auraTime * 0.5;
    const r = radius - 6 + Math.sin(auraTime + index * 0.8) * 10;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    const particleAlpha = Math.max(0.08, Math.sin(auraTime * 1.5 + index) * 0.28 + 0.3);

    ctx.fillStyle = `rgba(78, 205, 196, ${particleAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderSeraphicPendantField(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const rotation = time * 0.0008;
  ctx.save();
  ctx.translate(x, y + 18);
  ctx.rotate(rotation);
  ctx.strokeStyle = "rgba(216, 180, 254, 0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const px = Math.cos(angle) * 22;
    const py = Math.sin(angle) * 22;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 10 + Math.sin(rotation * 2) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function renderSpectralTresses(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const headY = y - 55;
  const hairTime = time * 0.0012;

  ctx.shadowColor = "rgba(150, 200, 255, 0.4)";
  ctx.shadowBlur = 6;

  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index++) {
      const strandOffset = index * 7;
      const waveX = Math.sin(hairTime + index * 0.8) * 12 * side;
      const alpha = 0.5 + Math.sin(hairTime * 1.5 + index * 0.4) * 0.2;

      ctx.strokeStyle = `rgba(180, 210, 255, ${alpha})`;
      ctx.lineWidth = Math.max(0.5, 1.5 - index * 0.25);
      ctx.beginPath();
      ctx.moveTo(x + side * (20 + strandOffset * 0.5), headY + 10);
      ctx.bezierCurveTo(
        x + side * (30 + strandOffset) + waveX,
        headY + 30,
        x + side * (35 + strandOffset) + waveX * 0.7,
        headY + 60,
        x + side * (25 + strandOffset) + waveX * 1.2,
        headY + 90 + strandOffset * 2
      );
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
}

function renderSolarisCrownMane(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const headY = y - 55;
  const solarTime = time * 0.002;
  const coronaPulse = 1 + Math.sin(solarTime) * 0.15;
  const spikeCount = 12;

  for (let index = 0; index < spikeCount; index++) {
    const angle = (index / spikeCount) * Math.PI * 2 - Math.PI * 0.5;
    const baseLength = 25 + (index % 3) * 12;
    const length = baseLength * coronaPulse + Math.sin(solarTime * 2 + index * 0.5) * 8;
    const alpha = 0.5 + Math.sin(solarTime + index * 0.4) * 0.25;

    const startX = x + Math.cos(angle) * 22;
    const startY = headY + Math.sin(angle) * 22;
    const endX = x + Math.cos(angle) * (22 + length);
    const endY = headY + Math.sin(angle) * (22 + length);

    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha})`);
    gradient.addColorStop(1, "rgba(255, 120, 20, 0)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(0.6, 2 - (index % 3) * 0.4);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(255, 190, 40, ${0.35 * coronaPulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, headY, 48 * coronaPulse, Math.PI, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 220, 100, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, headY, 62 * coronaPulse, Math.PI, 0);
  ctx.stroke();
}

function renderSigilVeil(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const sigilTime = time * 0.0015;
  const sigils = [
    { ox: 0, oy: 5, size: 18, phase: 0 },
    { ox: -22, oy: 25, size: 12, phase: 1.1 },
    { ox: 22, oy: 25, size: 12, phase: 2.2 },
    { ox: 0, oy: 50, size: 14, phase: 3.3 }
  ];

  for (const sigil of sigils) {
    const pulse = 0.4 + Math.sin(sigilTime * 2 + sigil.phase) * 0.3;
    const rotation = sigilTime * 0.3 + sigil.phase * 0.2;

    ctx.save();
    ctx.translate(x + sigil.ox, y + sigil.oy);
    ctx.rotate(rotation);
    ctx.strokeStyle = `rgba(100, 220, 180, ${pulse})`;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "rgba(78, 205, 196, 0.5)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    for (let corner = 0; corner < 3; corner++) {
      const angle = (corner / 3) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * sigil.size;
      const py = Math.sin(angle) * sigil.size;
      if (corner === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = `rgba(100, 220, 180, ${pulse * 0.7})`;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.shadowBlur = 0;
  const connectionAlpha = 0.2 + Math.sin(sigilTime * 1.5) * 0.1;
  ctx.strokeStyle = `rgba(78, 205, 196, ${connectionAlpha})`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x - 22, y + 25);
  ctx.lineTo(x, y + 50);
  ctx.lineTo(x + 22, y + 25);
  ctx.closePath();
  ctx.stroke();
}

function renderLunarCircuitMarks(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const circuitTime = time * 0.002;
  const paths = [
    [
      { px: x - 35, py: y + 5 },
      { px: x - 42, py: y + 20 },
      { px: x - 38, py: y + 40 },
      { px: x - 30, py: y + 58 }
    ],
    [
      { px: x + 35, py: y + 5 },
      { px: x + 42, py: y + 20 },
      { px: x + 38, py: y + 40 },
      { px: x + 30, py: y + 58 }
    ]
  ];

  for (const path of paths) {
    ctx.strokeStyle = "rgba(100, 180, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(path[0].px, path[0].py);
    for (let index = 1; index < path.length; index++) {
      ctx.lineTo(path[index].px, path[index].py);
    }
    ctx.stroke();

    const progress = circuitTime % 1;
    const totalSegments = path.length - 1;
    const segIndex = Math.min(totalSegments - 1, Math.floor(progress * totalSegments));
    const segProgress = (progress * totalSegments) % 1;
    const from = path[segIndex];
    const to = path[segIndex + 1];
    const nodeX = from.px + (to.px - from.px) * segProgress;
    const nodeY = from.py + (to.py - from.py) * segProgress;

    ctx.fillStyle = "rgba(150, 220, 255, 0.8)";
    ctx.shadowColor = "rgba(100, 200, 255, 0.8)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (const node of path) {
      const nodeAlpha = 0.3 + Math.sin(circuitTime * 3 + node.px * 0.1) * 0.15;
      ctx.strokeStyle = `rgba(100, 180, 255, ${nodeAlpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(node.px, node.py, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function renderEclipseDrops(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const earTime = time * 0.0018;
  const headY = y - 55;
  const earLevel = headY + 8;

  for (const side of [-1, 1]) {
    const earX = x + side * 34;
    const swing = Math.sin(earTime) * 3 * side;

    ctx.save();
    ctx.translate(earX, earLevel + swing);
    ctx.rotate(swing * 0.04);

    const shimmerAlpha = 0.5 + Math.sin(earTime * 2 + side) * 0.2;

    ctx.strokeStyle = `rgba(180, 200, 230, ${shimmerAlpha})`;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "rgba(160, 190, 230, 0.5)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 8, -Math.PI * 0.8, Math.PI * 0.2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(160, 180, 210, ${shimmerAlpha * 0.6})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, -18);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(190, 210, 250, ${shimmerAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const sparkAlpha = Math.max(0, Math.sin(earTime * 4 + side * 1.5)) * 0.7;
    ctx.fillStyle = `rgba(240, 245, 255, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(Math.sin(earTime * 3 + side) * 4, Math.cos(earTime * 2.5) * 3 - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function renderOracleRing(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const ringTime = time * 0.002;
  const ringX = x + 52;
  const ringY = y + 45;
  const rotation = ringTime * 1.5;
  const glowAlpha = 0.5 + Math.sin(ringTime * 2) * 0.2;

  ctx.save();
  ctx.translate(ringX, ringY);
  ctx.rotate(rotation);

  ctx.strokeStyle = `rgba(255, 200, 80, ${glowAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(255, 180, 40, 0.6)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    const px = Math.cos(angle) * 9;
    const py = Math.sin(angle) * 9;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 220, 100, ${glowAlpha * 0.6})`;
  ctx.lineWidth = 0.8;
  for (let index = 0; index < 3; index++) {
    const angle = (index / 3) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 9, Math.sin(angle) * 9);
    ctx.lineTo(Math.cos(angle + Math.PI) * 9, Math.sin(angle + Math.PI) * 9);
    ctx.stroke();
  }

  ctx.restore();
  ctx.shadowBlur = 0;

  for (let index = 0; index < 5; index++) {
    const angle = rotation * 0.8 + (index / 5) * Math.PI * 2;
    const orbitR = 16 + Math.sin(ringTime + index) * 3;
    const particleAlpha = Math.max(0.1, Math.sin(ringTime * 2 + index * 0.7) * 0.4 + 0.5);
    ctx.fillStyle = `rgba(255, 200, 80, ${particleAlpha})`;
    ctx.beginPath();
    ctx.arc(ringX + Math.cos(angle) * orbitR, ringY + Math.sin(angle) * orbitR, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderVoidCrown(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const headY = y - 55;
  const crownBaseY = headY - 30;
  const voidTime = time * 0.001;
  const spirePositions = [-24, -12, 0, 12, 24];
  const spireHeights = [28, 40, 52, 40, 28];

  for (const [index, spireX] of spirePositions.entries()) {
    const height = spireHeights[index];
    const pulseAlpha = 0.5 + Math.sin(voidTime * 2 + index * 0.6) * 0.2;

    ctx.fillStyle = `rgba(80, 40, 140, ${pulseAlpha})`;
    ctx.strokeStyle = `rgba(160, 100, 255, ${pulseAlpha * 0.7})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + spireX - 4, crownBaseY);
    ctx.lineTo(x + spireX, crownBaseY - height);
    ctx.lineTo(x + spireX + 4, crownBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const tipPulse = 0.3 + Math.sin(voidTime * 3 + index * 0.8) * 0.15;
    ctx.strokeStyle = `rgba(140, 80, 240, ${tipPulse})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x + spireX, crownBaseY - height, 4 + Math.sin(voidTime * 2) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(120, 70, 200, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 28, crownBaseY);
  ctx.lineTo(x + 28, crownBaseY);
  ctx.stroke();

  const voidAura = ctx.createRadialGradient(x, crownBaseY, 5, x, crownBaseY, 35);
  voidAura.addColorStop(0, `rgba(100, 40, 180, ${0.2 + Math.sin(voidTime) * 0.08})`);
  voidAura.addColorStop(1, "rgba(100, 40, 180, 0)");
  ctx.fillStyle = voidAura;
  ctx.beginPath();
  ctx.arc(x, crownBaseY, 35, 0, Math.PI * 2);
  ctx.fill();
}

function renderPrismBeret(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const headY = y - 55;
  const beretTime = time * 0.001;
  const float = Math.sin(beretTime * 1.5) * 2;
  const hue = (beretTime * 30) % 360;

  ctx.save();
  ctx.translate(x + 6, headY - 22 + float);
  ctx.rotate(0.12);

  ctx.fillStyle = `hsla(${hue}, 55%, 65%, 0.55)`;
  ctx.strokeStyle = `hsla(${hue + 30}, 60%, 75%, 0.6)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 14, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  const domeGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, 28);
  domeGrad.addColorStop(0, `hsla(${hue + 60}, 70%, 80%, 0.6)`);
  domeGrad.addColorStop(1, `hsla(${hue}, 50%, 50%, 0.1)`);
  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 14, 0, Math.PI, 0);
  ctx.fill();

  for (let index = 0; index < 4; index++) {
    const shimmerHue = (hue + index * 40 + beretTime * 50) % 360;
    const shimmerAlpha = 0.3 + Math.sin(beretTime * 2 + index * 0.8) * 0.15;
    ctx.fillStyle = `hsla(${shimmerHue}, 80%, 75%, ${shimmerAlpha})`;
    ctx.beginPath();
    ctx.arc(-14 + index * 9, -4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = `hsla(${hue + 180}, 50%, 70%, 0.3)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 3, 0, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}

function AuraliaCanvas({ form, meta }: { form: ShowcaseFormKey; meta: AddonShowcaseMeta }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const resize = () => {
      const parent = canvas.parentElement;

      if (!parent) {
        return;
      }

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const renderAddon = (time: number, centerX: number, centerY: number) => {
      switch (meta.renderer) {
        case "chronoShiftGoggles":
          renderChronoShiftGoggles(ctx, centerX, centerY, time);
          return;
        case "auraOfSentience":
          renderAuraOfSentience(ctx, centerX, centerY, time);
          return;
        case "phoenixWings":
          renderPhoenixWings(ctx, centerX, centerY, time);
          return;
        case "starlightMantle":
          renderStarlightMantle(ctx, centerX, centerY, time);
          return;
        case "prismChimeFamiliar":
          renderPrismChimeFamiliar(ctx, centerX, centerY, time);
          return;
        case "crystalHeartHarness":
          renderCrystalHeartHarness(ctx, centerX, centerY, time);
          return;
        case "echoingVoidOrb":
          renderEchoingVoidOrb(ctx, centerX, centerY, time);
          return;
        case "gravityWellGauntlet":
          renderGravityWellGauntlet(ctx, centerX, centerY, time);
          return;
        case "resonanceAmplifier":
          renderResonanceAmplifier(ctx, centerX, centerY, time);
          return;
        case "dreamWeaverCirclet":
          renderDreamWeaverCirclet(ctx, centerX, centerY, time);
          return;
        case "seraphicPendantField":
          renderSeraphicPendantField(ctx, centerX, centerY, time);
          return;
        case "sovereignWings":
          renderSovereignWings(ctx, centerX, centerY, time);
          return;
        case "ritualMask":
          renderRitualMask(ctx, centerX, centerY, time);
          return;
        case "ambientAura":
          renderAmbientAura(ctx, centerX, centerY, time);
          return;
        case "spectralTresses":
          renderSpectralTresses(ctx, centerX, centerY, time);
          return;
        case "solarisCrownMane":
          renderSolarisCrownMane(ctx, centerX, centerY, time);
          return;
        case "sigilVeil":
          renderSigilVeil(ctx, centerX, centerY, time);
          return;
        case "lunarCircuitMarks":
          renderLunarCircuitMarks(ctx, centerX, centerY, time);
          return;
        case "eclipseDrops":
          renderEclipseDrops(ctx, centerX, centerY, time);
          return;
        case "oracleRing":
          renderOracleRing(ctx, centerX, centerY, time);
          return;
        case "voidCrown":
          renderVoidCrown(ctx, centerX, centerY, time);
          return;
        case "prismBeret":
          renderPrismBeret(ctx, centerX, centerY, time);
          return;
        default:
          return;
      }
    };

    const animate = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2.15;
      const palette = showcaseForms[form];

      ctx.clearRect(0, 0, width, height);
      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "rgba(2, 6, 23, 1)");
      background.addColorStop(1, "rgba(0, 0, 0, 1)");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const glowAlpha = Math.max(0.04, Math.sin(time * 0.001) * 0.15 + 0.15);
      ctx.fillStyle = `rgba(244, 185, 66, ${glowAlpha * 0.2})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(244, 185, 66, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
      ctx.stroke();

      for (let index = 0; index < 18; index += 1) {
        const theta = time * 0.00035 + index * 0.35;
        const radius = 85 + (index % 6) * 10;
        const px = centerX + Math.cos(theta + index) * radius;
        const py = centerY + Math.sin(theta + index) * radius * 0.68;
        ctx.fillStyle = `rgba(244, 185, 66, ${0.08 + (index % 4) * 0.03})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5 + (index % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      drawMetaPetBase(ctx, centerX, centerY, time, palette);
      renderAddon(time, centerX, centerY);
      animationRef.current = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }

      window.removeEventListener("resize", resize);
    };
  }, [form, meta]);

  return <canvas ref={canvasRef} className="preview-canvas" />;
}

export function AuraliaShowcasePreview({
  listing,
  meta: explicitMeta,
  compact = false
}: {
  listing: ShowcaseListingLike;
  meta?: AddonShowcaseMeta;
  compact?: boolean;
}) {
  const meta = explicitMeta ?? getAddonShowcaseMeta(listing);
  const [form, setForm] = useState<ShowcaseFormKey>(meta?.defaultForm ?? "radiant");

  useEffect(() => {
    if (meta) {
      setForm(meta.defaultForm);
    }
  }, [meta]);

  const band = useMemo(() => (meta ? showcaseBands[meta.band] : undefined), [meta]);

  if (!meta || !band) {
    return null;
  }

  return (
    <Surface className={compact ? "stacked-card" : "stacked-card hero-card"} tone="accent">
      <div className="preview-header">
        <div className="preview-header__left">
          <p className="eyebrow">Auralia Live Preview</p>
          <div className="preview-header__identity">
            <span className="preview-header__emoji" aria-hidden="true">
              {meta.emoji}
            </span>
            <div>
              <h2>{listing.name}</h2>
              <p>{meta.fullDescription}</p>
            </div>
          </div>
        </div>
        <SparklesIcon className="preview-header__icon" size={20} />
      </div>

      <div className="pill-row">
        {meta.featured ? <StatPill label="Featured" tone="accent" /> : null}
        <StatPill label={formatAddonRarity(listing.rarity)} tone="accent" />
        <StatPill label={band.name} />
        <StatPill label={meta.slot} />
      </div>

      <div className="preview-canvas-wrap">
        <AuraliaCanvas form={form} meta={meta} />
      </div>

      <div className="form-toggle-row">
        {(Object.keys(showcaseForms) as ShowcaseFormKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setForm(key)}
            className={form === key ? "form-toggle form-toggle--active" : "form-toggle"}
          >
            {showcaseForms[key].name}
          </button>
        ))}
      </div>

      {!compact ? <p className="muted-copy">Motion grammar: {band.motion}.</p> : null}
    </Surface>
  );
}
