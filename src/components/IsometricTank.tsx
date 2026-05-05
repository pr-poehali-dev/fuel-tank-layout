import React, { useState } from 'react';
import { TankConfig, TankType, Nozzle, NOZZLE_TYPES } from '@/types/tank';

interface Props {
  config: TankConfig;
  selectedNozzleId: string | null;
  onSelectNozzle: (id: string) => void;
}

const W = 520;
const H = 420;

// Isometric projection helpers
const ISO_ANGLE = 30 * (Math.PI / 180);
const CX = 0.866; // cos(30°)
const SY = 0.5;   // sin(30°)

function isoProject(x: number, y: number, z: number, ox: number, oy: number) {
  return {
    px: ox + (x - z) * CX,
    py: oy + (x + z) * SY - y,
  };
}

function getFaceNozzles(nozzles: Nozzle[], face: Nozzle['position']['face']) {
  return nozzles.filter(n => n.enabled && n.position.face === face);
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

interface NozzleDotProps {
  cx: number; cy: number;
  nozzle: Nozzle;
  selected: boolean;
  onClick: () => void;
}

function NozzleDot({ cx, cy, nozzle, selected, onClick }: NozzleDotProps) {
  const [hovered, setHovered] = useState(false);
  const color = NOZZLE_TYPES[nozzle.type].color;
  const r = selected ? 9 : hovered ? 8 : 6;

  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
       style={{ cursor: 'pointer' }}>
      <circle cx={cx} cy={cy} r={r + 4} fill="transparent" />
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth={selected ? 2.5 : 1.5}
              style={{ transition: 'r 0.15s ease', filter: selected ? `drop-shadow(0 0 6px ${color})` : 'none' }} />
      {(hovered || selected) && (
        <g>
          <rect x={cx + 12} y={cy - 16} width={nozzle.name.length * 6.5 + 12} height={22} rx={4}
                fill="white" stroke={color} strokeWidth={1} opacity={0.97} />
          <text x={cx + 18} y={cy - 1} fontSize={11} fill="#1e293b" fontFamily="IBM Plex Sans, sans-serif">
            {nozzle.name} Ø{nozzle.diameter}
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Rectangular isometric ───────────────────────────────────────────────────
function RectangularTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const { nozzles } = config;
  const ox = W / 2 - 20;
  const oy = H / 2 + 60;
  const bx = 130, bz = 100, by = 130;

  const pts = (xs: [number, number, number][]) =>
    xs.map(([x, y, z]) => { const p = isoProject(x, y, z, ox, oy); return `${p.px},${p.py}`; }).join(' ');

  const topFace = [[-bx, by, -bz], [bx, by, -bz], [bx, by, bz], [-bx, by, bz]] as [number, number, number][];
  const frontFace = [[-bx, 0, bz], [bx, 0, bz], [bx, by, bz], [-bx, by, bz]] as [number, number, number][];
  const rightFace = [[bx, 0, -bz], [bx, 0, bz], [bx, by, bz], [bx, by, -bz]] as [number, number, number][];

  const topP = topFace.map(([x, y, z]) => isoProject(x, y, z, ox, oy));
  const frontP = frontFace.map(([x, y, z]) => isoProject(x, y, z, ox, oy));
  const rightP = rightFace.map(([x, y, z]) => isoProject(x, y, z, ox, oy));

  function topNozzlePos(nx: number, nz: number) {
    const x = lerp(-bx, bx, nx);
    const z = lerp(-bz, bz, nz);
    return isoProject(x, by, z, ox, oy);
  }
  function frontNozzlePos(nx: number, ny: number) {
    const x = lerp(-bx, bx, nx);
    const y = lerp(by, 0, ny);
    return isoProject(x, y, bz, ox, oy);
  }
  function rightNozzlePos(nz: number, ny: number) {
    const z = lerp(bz, -bz, nz);
    const y = lerp(by, 0, ny);
    return isoProject(bx, y, z, ox, oy);
  }

  return (
    <>
      <polygon points={pts(topFace)} fill="var(--tank-face-top)" stroke="var(--tank-edge)" strokeWidth={1.5} />
      <polygon points={pts(frontFace)} fill="var(--tank-face-left)" stroke="var(--tank-edge)" strokeWidth={1.5} />
      <polygon points={pts(rightFace)} fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth={1.5} />

      {/* Grid lines top */}
      {[0.25, 0.5, 0.75].map(t => {
        const a = isoProject(lerp(-bx, bx, t), by, -bz, ox, oy);
        const b = isoProject(lerp(-bx, bx, t), by, bz, ox, oy);
        return <line key={t} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke="var(--tank-edge)" strokeWidth={0.5} opacity={0.4} />;
      })}
      {[0.33, 0.67].map(t => {
        const a = isoProject(-bx, by, lerp(-bz, bz, t), ox, oy);
        const b = isoProject(bx, by, lerp(-bz, bz, t), ox, oy);
        return <line key={t} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke="var(--tank-edge)" strokeWidth={0.5} opacity={0.4} />;
      })}

      {/* Nozzles */}
      {getFaceNozzles(nozzles, 'top').map(n => {
        const p = topNozzlePos(n.position.x, n.position.y);
        return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
      {getFaceNozzles(nozzles, 'front').map(n => {
        const p = frontNozzlePos(n.position.x, n.position.y);
        return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
      {getFaceNozzles(nozzles, 'right').map(n => {
        const p = rightNozzlePos(n.position.x, n.position.y);
        return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
    </>
  );
}

// ─── Vertical cylinder isometric ─────────────────────────────────────────────
function VerticalCylinderTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const { nozzles } = config;
  const ox = W / 2 - 20;
  const oy = H / 2 + 50;
  const rx = 110, rz = 55, h = 150;
  const n = 48;

  function ellipsePoint(t: number, dy: number) {
    const angle = (t / n) * Math.PI * 2;
    return isoProject(Math.cos(angle) * rx, dy, Math.sin(angle) * rz, ox, oy);
  }

  const topPoints = Array.from({ length: n }, (_, i) => ellipsePoint(i, h));
  const botPoints = Array.from({ length: n }, (_, i) => ellipsePoint(i, 0));

  const topPath = topPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const botPath = botPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';

  // Right side vertical silhouette
  const sideRight: string[] = [];
  for (let i = n * 0.25; i <= n * 0.75; i++) {
    const pt = ellipsePoint(i, h);
    const pb = ellipsePoint(i, 0);
    if (i === Math.ceil(n * 0.25)) sideRight.push(`M${pb.px},${pb.py}`);
    if (i === Math.ceil(n * 0.25)) sideRight.push(`L${pt.px},${pt.py}`);
  }
  const rightEdgePts: string[] = [];
  for (let i = Math.ceil(n * 0.25); i <= Math.floor(n * 0.75); i++) {
    const pt = ellipsePoint(i, h);
    rightEdgePts.push(`${i === Math.ceil(n * 0.25) ? 'M' : 'L'}${pt.px},${pt.py}`);
  }
  for (let i = Math.floor(n * 0.75); i >= Math.ceil(n * 0.25); i--) {
    const pb = ellipsePoint(i, 0);
    rightEdgePts.push(`L${pb.px},${pb.py}`);
  }
  rightEdgePts.push('Z');

  function topNozzlePos(nx: number) {
    const angle = nx * Math.PI * 2;
    const p = isoProject(Math.cos(angle) * rx * 0.4, h, Math.sin(angle) * rz * 0.4, ox, oy);
    return p;
  }
  function sideNozzlePos(nx: number, ny: number) {
    const angle = (nx - 0.5) * Math.PI;
    const p = isoProject(Math.cos(angle) * rx, lerp(h, 0, ny), Math.sin(angle) * rz, ox, oy);
    return p;
  }

  return (
    <>
      <path d={rightEdgePts.join(' ')} fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth={1.5} />
      <path d={botPath} fill="var(--tank-face-left)" stroke="var(--tank-edge)" strokeWidth={1.5} />
      <path d={topPath} fill="var(--tank-face-top)" stroke="var(--tank-edge)" strokeWidth={1.5} />

      {/* Center cross */}
      {[0, Math.PI * 0.5].map((a, i) => {
        const p1 = isoProject(Math.cos(a) * rx * 0.9, h, Math.sin(a) * rz * 0.9, ox, oy);
        const p2 = isoProject(-Math.cos(a) * rx * 0.9, h, -Math.sin(a) * rz * 0.9, ox, oy);
        return <line key={i} x1={p1.px} y1={p1.py} x2={p2.px} y2={p2.py} stroke="var(--tank-edge)" strokeWidth={0.5} opacity={0.35} />;
      })}

      {/* Nozzles */}
      {getFaceNozzles(nozzles, 'top').map(n => {
        const p = topNozzlePos(n.position.x);
        return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
      {(['front', 'right', 'left'] as const).flatMap(face =>
        getFaceNozzles(nozzles, face).map(n => {
          const p = sideNozzlePos(n.position.x, n.position.y);
          return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
        })
      )}
    </>
  );
}

// ─── Horizontal cylinder isometric ───────────────────────────────────────────
function HorizontalCylinderTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const { nozzles } = config;
  const ox = W / 2 - 20;
  const oy = H / 2 + 30;
  const ry = 70, rz = 40, len = 160;
  const n = 48;

  function ellipsePoint(t: number, dx: number) {
    const angle = (t / n) * Math.PI * 2;
    return isoProject(dx, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
  }

  const frontPts = Array.from({ length: n }, (_, i) => ellipsePoint(i, len));
  const backPts  = Array.from({ length: n }, (_, i) => ellipsePoint(i, -len));

  const frontPath = frontPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const backPath  = backPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';

  // Top shell (upper half)
  const topShell: string[] = [];
  for (let i = 0; i <= Math.floor(n / 2); i++) {
    const angle = (i / n) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    if (i === 0) {
      const p = isoProject(len, y, z, ox, oy);
      topShell.push(`M${p.px},${p.py}`);
    } else {
      const p = isoProject(len, y, z, ox, oy);
      topShell.push(`L${p.px},${p.py}`);
    }
  }
  for (let i = Math.floor(n / 2); i >= 0; i--) {
    const angle = (i / n) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    const p = isoProject(-len, y, z, ox, oy);
    topShell.push(`L${p.px},${p.py}`);
  }
  topShell.push('Z');

  // Right shell (right visible quarter)
  const rightShell: string[] = [];
  for (let i = 0; i <= Math.floor(n / 4); i++) {
    const angle = (i / n) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    if (i === 0) {
      const p = isoProject(len, y, z, ox, oy);
      rightShell.push(`M${p.px},${p.py}`);
    } else {
      const p = isoProject(len, y, z, ox, oy);
      rightShell.push(`L${p.px},${p.py}`);
    }
  }
  for (let i = Math.floor(n / 4); i >= 0; i--) {
    const angle = (i / n) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    const p = isoProject(-len, y, z, ox, oy);
    rightShell.push(`L${p.px},${p.py}`);
  }
  rightShell.push('Z');

  // Supports
  const supX = [-80, 80];
  const supPts = supX.map(sx => {
    const bot = isoProject(sx, -30, 0, ox, oy);
    const topL = isoProject(sx, 0, -rz * 0.8, ox, oy);
    const topR = isoProject(sx, 0, rz * 0.8, ox, oy);
    return { bot, topL, topR };
  });

  function frontNozzlePos(ny: number, nz: number) {
    const angle = nz * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    return isoProject(len, lerp(y, ry, ny * 0.3), z, ox, oy);
  }
  function topNozzlePos(nx: number) {
    const x = lerp(-len, len, nx);
    return isoProject(x, ry * 2, 0, ox, oy);
  }

  return (
    <>
      {supPts.map((s, i) => (
        <g key={i}>
          <line x1={s.topL.px} y1={s.topL.py} x2={s.bot.px} y2={s.bot.py} stroke="var(--tank-edge)" strokeWidth={3} />
          <line x1={s.topR.px} y1={s.topR.py} x2={s.bot.px} y2={s.bot.py} stroke="var(--tank-edge)" strokeWidth={3} />
        </g>
      ))}
      <path d={backPath}       fill="var(--tank-face-left)"  stroke="var(--tank-edge)" strokeWidth={1.5} />
      <path d={topShell.join(' ')}  fill="var(--tank-face-top)"   stroke="var(--tank-edge)" strokeWidth={1.5} />
      <path d={rightShell.join(' ')} fill="var(--tank-face-right)"  stroke="var(--tank-edge)" strokeWidth={1.5} />
      <path d={frontPath}      fill="var(--tank-face-left)"  stroke="var(--tank-edge)" strokeWidth={1.5} />

      {getFaceNozzles(nozzles, 'top').map(n => {
        const p = topNozzlePos(n.position.x);
        return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
      {(['front', 'right'] as const).flatMap(face =>
        getFaceNozzles(nozzles, face).map(n => {
          const p = frontNozzlePos(n.position.x, n.position.y);
          return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId === n.id} onClick={() => onSelectNozzle(n.id)} />;
        })
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function IsometricTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const dim = config.dimensions;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="animate-scale-in"
           style={{ '--tank-face-top': 'var(--tank-face-top)', '--tank-face-left': 'var(--tank-face-left)', '--tank-face-right': 'var(--tank-face-right)', '--tank-edge': 'var(--tank-edge)' } as React.CSSProperties}>

        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#94a3b8" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter="url(#shadow)">
          {config.tankType === 'rectangular' && (
            <RectangularTank config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />
          )}
          {config.tankType === 'vertical-cylinder' && (
            <VerticalCylinderTank config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />
          )}
          {config.tankType === 'horizontal-cylinder' && (
            <HorizontalCylinderTank config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />
          )}
        </g>

        {/* Dimension labels */}
        <text x={W - 12} y={H - 8} fontSize={10} fill="hsl(var(--muted-foreground))" textAnchor="end"
              fontFamily="IBM Plex Mono, monospace">
          {dim.length}×{dim.width}×{dim.height} мм
        </text>
      </svg>
    </div>
  );
}
