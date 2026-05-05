import React, { useState } from 'react';
import { TankConfig, Nozzle, NOZZLE_TYPES } from '@/types/tank';

interface Props {
  config: TankConfig;
  selectedNozzleId: string | null;
  onSelectNozzle: (id: string) => void;
}

const W = 520;
const H = 420;

const CX = 0.866;
const SY = 0.5;

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

// Нормирует размеры бака в SVG-пространство, сохраняя пропорции
function normalizeDims(length: number, width: number, height: number, maxBox: number) {
  const maxSide = Math.max(length, width, height);
  const s = maxBox / maxSide;
  return {
    bx: (length / 2) * s,
    bz: (width / 2) * s,
    by: height * s,
  };
}

function normalizeCylinder(diameter: number, length: number, height: number, maxBox: number, isHorizontal: boolean) {
  const maxSide = Math.max(diameter, length, height);
  const s = maxBox / maxSide;
  if (isHorizontal) {
    // length = длина цилиндра по оси X, diameter = диаметр
    return { len: (length / 2) * s, ry: (diameter / 2) * s, rz: (diameter / 4) * s };
  } else {
    // length = width = diameter, height = высота
    return { rx: (diameter / 2) * s, rz: (diameter / 4) * s, h: height * s };
  }
}

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

// ─── Rectangular ─────────────────────────────────────────────────────────────
function RectangularTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const { nozzles, dimensions: d } = config;

  const { bx, bz, by } = normalizeDims(d.length, d.width, d.height, 140);

  const ox = W / 2 - 20;
  const oy = H / 2 + by * 0.35;

  const pts = (xs: [number, number, number][]) =>
    xs.map(([x, y, z]) => { const p = isoProject(x, y, z, ox, oy); return `${p.px},${p.py}`; }).join(' ');

  const topFace  = [[-bx, by, -bz], [bx, by, -bz], [bx, by, bz], [-bx, by, bz]] as [number, number, number][];
  const frontFace = [[-bx, 0, bz], [bx, 0, bz], [bx, by, bz], [-bx, by, bz]] as [number, number, number][];
  const rightFace = [[bx, 0, -bz], [bx, 0, bz], [bx, by, bz], [bx, by, -bz]] as [number, number, number][];

  function topNozzlePos(nx: number, nz: number) {
    return isoProject(lerp(-bx, bx, nx), by, lerp(-bz, bz, nz), ox, oy);
  }
  function frontNozzlePos(nx: number, ny: number) {
    return isoProject(lerp(-bx, bx, nx), lerp(by, 0, ny), bz, ox, oy);
  }
  function rightNozzlePos(nz: number, ny: number) {
    return isoProject(bx, lerp(by, 0, ny), lerp(bz, -bz, nz), ox, oy);
  }

  return (
    <>
      <polygon points={pts(topFace)}   fill="var(--tank-face-top)"   stroke="var(--tank-edge)" strokeWidth={2} />
      <polygon points={pts(frontFace)} fill="var(--tank-face-left)"  stroke="var(--tank-edge)" strokeWidth={2} />
      <polygon points={pts(rightFace)} fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth={2} />

      {[0.25, 0.5, 0.75].map(t => {
        const a = isoProject(lerp(-bx, bx, t), by, -bz, ox, oy);
        const b = isoProject(lerp(-bx, bx, t), by,  bz, ox, oy);
        return <line key={t} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke="var(--tank-edge)" strokeWidth={0.5} opacity={0.4} />;
      })}
      {[0.33, 0.67].map(t => {
        const a = isoProject(-bx, by, lerp(-bz, bz, t), ox, oy);
        const b = isoProject( bx, by, lerp(-bz, bz, t), ox, oy);
        return <line key={t} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke="var(--tank-edge)" strokeWidth={0.5} opacity={0.4} />;
      })}

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

// ─── Vertical cylinder ───────────────────────────────────────────────────────
function VerticalCylinderTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const { nozzles, dimensions: d } = config;

  // diameter = max(length, width), height = d.height
  const diameter = Math.max(d.length, d.width);
  const { rx, rz, h } = normalizeCylinder(diameter, d.length, d.height, 140, false);

  const ox = W / 2 - 20;
  const oy = H / 2 + h * 0.35;
  const segs = 48;

  function ellipsePoint(t: number, dy: number) {
    const angle = (t / segs) * Math.PI * 2;
    return isoProject(Math.cos(angle) * rx, dy, Math.sin(angle) * rz, ox, oy);
  }

  const topPoints = Array.from({ length: segs }, (_, i) => ellipsePoint(i, h));
  const botPoints = Array.from({ length: segs }, (_, i) => ellipsePoint(i, 0));

  const topPath = topPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const botPath = botPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';

  const rightEdgePts: string[] = [];
  for (let i = Math.ceil(segs * 0.25); i <= Math.floor(segs * 0.75); i++) {
    const pt = ellipsePoint(i, h);
    rightEdgePts.push(`${i === Math.ceil(segs * 0.25) ? 'M' : 'L'}${pt.px},${pt.py}`);
  }
  for (let i = Math.floor(segs * 0.75); i >= Math.ceil(segs * 0.25); i--) {
    const pb = ellipsePoint(i, 0);
    rightEdgePts.push(`L${pb.px},${pb.py}`);
  }
  rightEdgePts.push('Z');

  function topNozzlePos(nx: number) {
    const angle = nx * Math.PI * 2;
    return isoProject(Math.cos(angle) * rx * 0.4, h, Math.sin(angle) * rz * 0.4, ox, oy);
  }
  function sideNozzlePos(nx: number, ny: number) {
    const angle = (nx - 0.5) * Math.PI;
    return isoProject(Math.cos(angle) * rx, lerp(h, 0, ny), Math.sin(angle) * rz, ox, oy);
  }

  return (
    <>
      <path d={rightEdgePts.join(' ')} fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth={2} />
      <path d={botPath} fill="var(--tank-face-left)"  stroke="var(--tank-edge)" strokeWidth={2} />
      <path d={topPath} fill="var(--tank-face-top)"   stroke="var(--tank-edge)" strokeWidth={2} />

      {[0, Math.PI * 0.5].map((a, i) => {
        const p1 = isoProject( Math.cos(a) * rx * 0.9, h,  Math.sin(a) * rz * 0.9, ox, oy);
        const p2 = isoProject(-Math.cos(a) * rx * 0.9, h, -Math.sin(a) * rz * 0.9, ox, oy);
        return <line key={i} x1={p1.px} y1={p1.py} x2={p2.px} y2={p2.py} stroke="var(--tank-edge)" strokeWidth={0.5} opacity={0.35} />;
      })}

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

// ─── Horizontal cylinder ─────────────────────────────────────────────────────
function HorizontalCylinderTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const { nozzles, dimensions: d } = config;

  // d.length = длина цилиндра, d.width = d.height = диаметр
  const diameter = Math.max(d.width, d.height);
  const { len, ry, rz } = normalizeCylinder(diameter, d.length, d.height, 140, true);

  const ox = W / 2 - 20;
  const oy = H / 2 + ry * 0.3;
  const segs = 48;

  function ellipsePoint(t: number, dx: number) {
    const angle = (t / segs) * Math.PI * 2;
    return isoProject(dx, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
  }

  const frontPts = Array.from({ length: segs }, (_, i) => ellipsePoint(i,  len));
  const backPts  = Array.from({ length: segs }, (_, i) => ellipsePoint(i, -len));

  const frontPath = frontPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const backPath  = backPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';

  const topShell: string[] = [];
  for (let i = 0; i <= Math.floor(segs / 2); i++) {
    const angle = (i / segs) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    const p = isoProject(i === 0 ? len : len, y, z, ox, oy);
    topShell.push(`${i === 0 ? 'M' : 'L'}${p.px},${p.py}`);
  }
  for (let i = Math.floor(segs / 2); i >= 0; i--) {
    const angle = (i / segs) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    const p = isoProject(-len, y, z, ox, oy);
    topShell.push(`L${p.px},${p.py}`);
  }
  topShell.push('Z');

  const rightShell: string[] = [];
  for (let i = 0; i <= Math.floor(segs / 4); i++) {
    const angle = (i / segs) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    const p = isoProject(len, y, z, ox, oy);
    rightShell.push(`${i === 0 ? 'M' : 'L'}${p.px},${p.py}`);
  }
  for (let i = Math.floor(segs / 4); i >= 0; i--) {
    const angle = (i / segs) * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    const p = isoProject(-len, y, z, ox, oy);
    rightShell.push(`L${p.px},${p.py}`);
  }
  rightShell.push('Z');

  // Опоры — масштабируем с баком
  const supH = ry * 0.45;
  const supX = [-len * 0.55, len * 0.55];
  const supPts = supX.map(sx => {
    const bot  = isoProject(sx, -supH, 0, ox, oy);
    const topL = isoProject(sx, 0, -rz * 0.8, ox, oy);
    const topR = isoProject(sx, 0,  rz * 0.8, ox, oy);
    return { bot, topL, topR };
  });

  function topNozzlePos(nx: number) {
    const x = lerp(-len, len, nx);
    return isoProject(x, ry * 2, 0, ox, oy);
  }
  function frontNozzlePos(nx: number, ny: number) {
    const angle = ny * Math.PI * 2;
    const y = Math.sin(angle) * ry + ry;
    const z = Math.cos(angle) * rz;
    return isoProject(len, y, z, ox, oy);
  }

  return (
    <>
      {supPts.map((s, i) => (
        <g key={i}>
          <line x1={s.topL.px} y1={s.topL.py} x2={s.bot.px} y2={s.bot.py} stroke="var(--tank-edge)" strokeWidth={Math.max(2, ry * 0.035)} />
          <line x1={s.topR.px} y1={s.topR.py} x2={s.bot.px} y2={s.bot.py} stroke="var(--tank-edge)" strokeWidth={Math.max(2, ry * 0.035)} />
        </g>
      ))}
      <path d={backPath}            fill="var(--tank-face-left)"  stroke="var(--tank-edge)" strokeWidth={2} />
      <path d={topShell.join(' ')}  fill="var(--tank-face-top)"   stroke="var(--tank-edge)" strokeWidth={2} />
      <path d={rightShell.join(' ')} fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth={2} />
      <path d={frontPath}           fill="var(--tank-face-left)"  stroke="var(--tank-edge)" strokeWidth={2} />

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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IsometricTank({ config, selectedNozzleId, onSelectNozzle }: Props) {
  const dim = config.dimensions;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
           style={{ '--tank-face-top': 'var(--tank-face-top)', '--tank-face-left': 'var(--tank-face-left)', '--tank-face-right': 'var(--tank-face-right)', '--tank-edge': 'var(--tank-edge)' } as React.CSSProperties}>

        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4a7aaa" floodOpacity="0.30" />
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

        <text x={W - 12} y={H - 8} fontSize={10} fill="hsl(var(--muted-foreground))" textAnchor="end"
              fontFamily="IBM Plex Mono, monospace">
          {dim.length}×{dim.width}×{dim.height} мм
        </text>
      </svg>
    </div>
  );
}