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

// Цвета в духе технического чертежа
const EDGE_COLOR    = '#2563a8';   // видимые рёбра — насыщенный синий
const HIDDEN_COLOR  = '#60a0d8';   // скрытые рёбра — светлее
const FACE_FILL     = 'rgba(96, 175, 230, 0.08)'; // грани — почти прозрачный голубой

function isoProject(x: number, y: number, z: number, ox: number, oy: number) {
  return { px: ox + (x - z) * CX, py: oy + (x + z) * SY - y };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getFaceNozzles(nozzles: Nozzle[], face: Nozzle['position']['face']) {
  return nozzles.filter(n => n.enabled && n.position.face === face);
}

function normalizeDims(length: number, width: number, height: number, maxBox: number) {
  const s = maxBox / Math.max(length, width, height);
  return { bx: (length / 2) * s, bz: (width / 2) * s, by: height * s };
}

function normalizeCylinder(diameter: number, length: number, height: number, maxBox: number, isHorizontal: boolean) {
  const s = maxBox / Math.max(diameter, length, height);
  if (isHorizontal) {
    return { len: (length / 2) * s, ry: (diameter / 2) * s, rz: (diameter / 4) * s };
  }
  return { rx: (diameter / 2) * s, rz: (diameter / 4) * s, h: height * s };
}

// Общий атрибут штриха для скрытых линий
const DASH_PROPS = {
  stroke: HIDDEN_COLOR,
  strokeWidth: 1.5,
  strokeDasharray: '6 4',
  opacity: 0.85,
};

// Атрибуты осевых линий (тонкий штрихпунктир, красный — ГОСТ)
const AXIS_PROPS = {
  stroke: '#c0392b',
  strokeWidth: 0.9,
  strokeDasharray: '10 3 2 3',
  opacity: 0.75,
};

// Рисует центровой крестик в изометрии на плоской эллиптической грани.
// cx/cy — центр в SVG, dx1/dy1 и dx2/dy2 — полуоси крестика по двум направлениям.
function AxisCross({
  cx, cy,
  dx1, dy1,   // направление «вдоль» (горизонталь крестика)
  dx2, dy2,   // направление «поперёк» (вертикаль крестика)
  r = 1.15,   // коэффициент удлинения за круг
}: {
  cx: number; cy: number;
  dx1: number; dy1: number;
  dx2: number; dy2: number;
  r?: number;
}) {
  return (
    <g>
      <line x1={cx - dx1 * r} y1={cy - dy1 * r} x2={cx + dx1 * r} y2={cy + dy1 * r} {...AXIS_PROPS} />
      <line x1={cx - dx2 * r} y1={cy - dy2 * r} x2={cx + dx2 * r} y2={cy + dy2 * r} {...AXIS_PROPS} />
    </g>
  );
}

// ─── NozzleDot ───────────────────────────────────────────────────────────────
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
              style={{ filter: selected ? `drop-shadow(0 0 6px ${color})` : 'none' }} />
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

  const pt = (x: number, y: number, z: number) => isoProject(x, y, z, ox, oy);
  const ptsStr = (xs: [number, number, number][]) =>
    xs.map(([x, y, z]) => { const p = pt(x, y, z); return `${p.px},${p.py}`; }).join(' ');

  // Видимые грани
  const topFace   = [[-bx, by, -bz], [bx, by, -bz], [bx, by, bz], [-bx, by, bz]] as [number,number,number][];
  const frontFace = [[-bx, 0, bz], [bx, 0, bz], [bx, by, bz], [-bx, by, bz]] as [number,number,number][];
  const rightFace = [[bx, 0, -bz], [bx, 0, bz], [bx, by, bz], [bx, by, -bz]] as [number,number,number][];

  // Скрытые рёбра: левая грань (back-left) + задняя грань (back) + дно
  // Вершины куба
  const A = pt(-bx, 0,  -bz); // задний левый низ
  const B = pt( bx, 0,  -bz); // задний правый низ
  const C = pt( bx, 0,   bz); // передний правый низ
  const D = pt(-bx, 0,   bz); // передний левый низ
  const E = pt(-bx, by, -bz); // задний левый верх
  const F = pt( bx, by, -bz); // задний правый верх
  // видимые низ: D-C-B (часть дна), но нам нужна скрытая часть
  // скрытые: A-B (дно зад), A-D (дно лево), A-E (стойка левая зад), E-F (верх зад уже виден как ребро top)

  const hiddenEdges: [{ px: number; py: number }, { px: number; py: number }][] = [
    [A, B], // дно — задняя грань низ
    [A, D], // дно — левая грань низ
    [A, E], // вертикальное ребро задне-левое
  ];

  function topNozzlePos(nx: number, nz: number) {
    return pt(lerp(-bx, bx, nx), by, lerp(-bz, bz, nz));
  }
  function frontNozzlePos(nx: number, ny: number) {
    return pt(lerp(-bx, bx, nx), lerp(by, 0, ny), bz);
  }
  function rightNozzlePos(nz: number, ny: number) {
    return pt(bx, lerp(by, 0, ny), lerp(bz, -bz, nz));
  }

  return (
    <>
      {/* Скрытые рёбра — за гранями */}
      {hiddenEdges.map(([a, b], i) => (
        <line key={i} x1={a.px} y1={a.py} x2={b.px} y2={b.py} {...DASH_PROPS} />
      ))}

      {/* Грани */}
      <polygon points={ptsStr(topFace)}   fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <polygon points={ptsStr(frontFace)} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <polygon points={ptsStr(rightFace)} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />

      {/* Сетка на верхней грани */}
      {[0.25, 0.5, 0.75].map(t => {
        const a = pt(lerp(-bx, bx, t), by, -bz);
        const b = pt(lerp(-bx, bx, t), by,  bz);
        return <line key={`gx${t}`} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke={EDGE_COLOR} strokeWidth={0.5} opacity={0.25} />;
      })}
      {[0.33, 0.67].map(t => {
        const a = pt(-bx, by, lerp(-bz, bz, t));
        const b = pt( bx, by, lerp(-bz, bz, t));
        return <line key={`gz${t}`} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke={EDGE_COLOR} strokeWidth={0.5} opacity={0.25} />;
      })}

      {/* Осевые крестики — на верхней, передней и правой гранях */}
      {(() => {
        // верхняя грань: центр (0, by, 0)
        // полуоси в изо-проекции: X→ и Z→
        const topC  = pt(0, by, 0);
        const topX1 = pt(bx, by, 0); const topX2 = pt(-bx, by, 0);
        const topZ1 = pt(0, by, bz); const topZ2 = pt(0, by, -bz);
        // передняя грань: центр (0, by/2, bz)
        const fC  = pt(0, by * 0.5, bz);
        const fX1 = pt(bx, by * 0.5, bz); const fX2 = pt(-bx, by * 0.5, bz);
        const fY1 = pt(0, by, bz);        const fY2 = pt(0, 0, bz);
        // правая грань: центр (bx, by/2, 0)
        const rC  = pt(bx, by * 0.5, 0);
        const rZ1 = pt(bx, by * 0.5, bz); const rZ2 = pt(bx, by * 0.5, -bz);
        const rY1 = pt(bx, by, 0);        const rY2 = pt(bx, 0, 0);
        return (
          <>
            <AxisCross cx={topC.px} cy={topC.py}
              dx1={(topX1.px - topX2.px) / 2} dy1={(topX1.py - topX2.py) / 2}
              dx2={(topZ1.px - topZ2.px) / 2} dy2={(topZ1.py - topZ2.py) / 2} />
            <AxisCross cx={fC.px} cy={fC.py}
              dx1={(fX1.px - fX2.px) / 2} dy1={(fX1.py - fX2.py) / 2}
              dx2={(fY1.px - fY2.px) / 2} dy2={(fY1.py - fY2.py) / 2} />
            <AxisCross cx={rC.px} cy={rC.py}
              dx1={(rZ1.px - rZ2.px) / 2} dy1={(rZ1.py - rZ2.py) / 2}
              dx2={(rY1.px - rY2.px) / 2} dy2={(rY1.py - rY2.py) / 2} />
          </>
        );
      })()}

      {/* Патрубки */}
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
  const diameter = Math.max(d.length, d.width);
  const { rx, rz, h } = normalizeCylinder(diameter, d.length, d.height, 140, false);
  const ox = W / 2 - 20;
  const oy = H / 2 + h * 0.35;
  const segs = 64;

  function ellipsePoint(t: number, dy: number) {
    const angle = (t / segs) * Math.PI * 2;
    return isoProject(Math.cos(angle) * rx, dy, Math.sin(angle) * rz, ox, oy);
  }

  const topPoints = Array.from({ length: segs }, (_, i) => ellipsePoint(i, h));
  const botPoints = Array.from({ length: segs }, (_, i) => ellipsePoint(i, 0));

  const topPath = topPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const botPath = botPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';

  // Видимая боковая грань (правая полуокружность)
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

  // Скрытая боковая полуокружность (левая) — верх и низ
  const hiddenTopArc: string[] = [];
  const hiddenBotArc: string[] = [];
  for (let i = 0; i <= Math.ceil(segs * 0.25); i++) {
    const pt = ellipsePoint(i, h);
    hiddenTopArc.push(`${i === 0 ? 'M' : 'L'}${pt.px},${pt.py}`);
  }
  for (let i = Math.floor(segs * 0.75); i <= segs; i++) {
    const pt = ellipsePoint(i, h);
    hiddenTopArc.push(`L${pt.px},${pt.py}`);
  }
  for (let i = 0; i <= Math.ceil(segs * 0.25); i++) {
    const pb = ellipsePoint(i, 0);
    hiddenBotArc.push(`${i === 0 ? 'M' : 'L'}${pb.px},${pb.py}`);
  }
  for (let i = Math.floor(segs * 0.75); i <= segs; i++) {
    const pb = ellipsePoint(i, 0);
    hiddenBotArc.push(`L${pb.px},${pb.py}`);
  }

  // Две скрытые вертикальные образующие (крайние левые точки)
  const leftTop = ellipsePoint(0, h);
  const leftBot = ellipsePoint(0, 0);

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
      {/* Скрытые линии */}
      <path d={hiddenTopArc.join(' ')} fill="none" {...DASH_PROPS} />
      <path d={hiddenBotArc.join(' ')} fill="none" {...DASH_PROPS} />
      <line x1={leftTop.px} y1={leftTop.py} x2={leftBot.px} y2={leftBot.py} {...DASH_PROPS} />

      {/* Грани */}
      <path d={rightEdgePts.join(' ')} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={botPath}  fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={topPath}  fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />

      {/* Осевые крестики — верхний и нижний торец */}
      {(() => {
        // Верхний торец: 2 оси в плоскости эллипса (X и Z направления)
        const topC = isoProject(0, h, 0, ox, oy);
        const tX1  = isoProject( rx, h, 0, ox, oy);
        const tX2  = isoProject(-rx, h, 0, ox, oy);
        const tZ1  = isoProject(0, h,  rz, ox, oy);
        const tZ2  = isoProject(0, h, -rz, ox, oy);
        // Нижний торец (скрытый — чуть светлее)
        const botC = isoProject(0, 0, 0, ox, oy);
        const bX1  = isoProject( rx, 0, 0, ox, oy);
        const bX2  = isoProject(-rx, 0, 0, ox, oy);
        const bZ1  = isoProject(0, 0,  rz, ox, oy);
        const bZ2  = isoProject(0, 0, -rz, ox, oy);
        return (
          <>
            <AxisCross cx={topC.px} cy={topC.py}
              dx1={(tX1.px - tX2.px) / 2} dy1={(tX1.py - tX2.py) / 2}
              dx2={(tZ1.px - tZ2.px) / 2} dy2={(tZ1.py - tZ2.py) / 2} />
            {/* Нижний крестик — пунктиром, т.к. скрытый */}
            <line x1={bX2.px} y1={bX2.py} x2={bX1.px} y2={bX1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
            <line x1={bZ2.px} y1={bZ2.py} x2={bZ1.px} y2={bZ1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
            {/* Вертикальная осевая линия по высоте */}
            <line x1={topC.px} y1={topC.py} x2={botC.px} y2={botC.py} {...AXIS_PROPS} />
          </>
        );
      })()}

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
  const diameter = Math.max(d.width, d.height);
  const { len, ry, rz } = normalizeCylinder(diameter, d.length, d.height, 140, true);
  const ox = W / 2 - 20;
  const oy = H / 2 + ry * 0.3;
  const segs = 64;

  function ellipsePoint(t: number, dx: number) {
    const angle = (t / segs) * Math.PI * 2;
    return isoProject(dx, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
  }

  const frontPts = Array.from({ length: segs }, (_, i) => ellipsePoint(i,  len));
  const backPts  = Array.from({ length: segs }, (_, i) => ellipsePoint(i, -len));

  const frontPath = frontPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const backPath  = backPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ') + 'Z';

  // Верхняя оболочка
  const topShell: string[] = [];
  for (let i = 0; i <= Math.floor(segs / 2); i++) {
    const angle = (i / segs) * Math.PI * 2;
    const p = isoProject(len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
    topShell.push(`${i === 0 ? 'M' : 'L'}${p.px},${p.py}`);
  }
  for (let i = Math.floor(segs / 2); i >= 0; i--) {
    const angle = (i / segs) * Math.PI * 2;
    const p = isoProject(-len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
    topShell.push(`L${p.px},${p.py}`);
  }
  topShell.push('Z');

  // Правая оболочка
  const rightShell: string[] = [];
  for (let i = 0; i <= Math.floor(segs / 4); i++) {
    const angle = (i / segs) * Math.PI * 2;
    const p = isoProject(len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
    rightShell.push(`${i === 0 ? 'M' : 'L'}${p.px},${p.py}`);
  }
  for (let i = Math.floor(segs / 4); i >= 0; i--) {
    const angle = (i / segs) * Math.PI * 2;
    const p = isoProject(-len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
    rightShell.push(`L${p.px},${p.py}`);
  }
  rightShell.push('Z');

  // Скрытая нижняя образующая (дно цилиндра)
  const hiddenBot: string[] = [];
  for (let i = Math.floor(segs / 2); i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    const p = isoProject(len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
    hiddenBot.push(`${i === Math.floor(segs / 2) ? 'M' : 'L'}${p.px},${p.py}`);
  }

  // Скрытая нижняя образующая на задней крышке
  const hiddenBotBack: string[] = [];
  for (let i = Math.floor(segs / 2); i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    const p = isoProject(-len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
    hiddenBotBack.push(`${i === Math.floor(segs / 2) ? 'M' : 'L'}${p.px},${p.py}`);
  }

  // Скрытые продольные образующие (нижние)
  const botFront = ellipsePoint(Math.floor(segs / 2), len);
  const botBack  = ellipsePoint(Math.floor(segs / 2), -len);

  // Опоры
  const supH = ry * 0.45;
  const supX = [-len * 0.55, len * 0.55];
  const supPts = supX.map(sx => ({
    bot:  isoProject(sx, -supH, 0, ox, oy),
    topL: isoProject(sx, 0, -rz * 0.8, ox, oy),
    topR: isoProject(sx, 0,  rz * 0.8, ox, oy),
  }));

  function topNozzlePos(nx: number) {
    return isoProject(lerp(-len, len, nx), ry * 2, 0, ox, oy);
  }
  function frontNozzlePos(nx: number, ny: number) {
    const angle = ny * Math.PI * 2;
    return isoProject(len, Math.sin(angle) * ry + ry, Math.cos(angle) * rz, ox, oy);
  }

  return (
    <>
      {/* Опоры */}
      {supPts.map((s, i) => (
        <g key={i}>
          <line x1={s.topL.px} y1={s.topL.py} x2={s.bot.px} y2={s.bot.py} stroke={EDGE_COLOR} strokeWidth={Math.max(2, ry * 0.035)} />
          <line x1={s.topR.px} y1={s.topR.py} x2={s.bot.px} y2={s.bot.py} stroke={EDGE_COLOR} strokeWidth={Math.max(2, ry * 0.035)} />
        </g>
      ))}

      {/* Скрытые линии */}
      <path d={hiddenBot.join(' ')}     fill="none" {...DASH_PROPS} />
      <path d={hiddenBotBack.join(' ')} fill="none" {...DASH_PROPS} />
      <line x1={botFront.px} y1={botFront.py} x2={botBack.px} y2={botBack.py} {...DASH_PROPS} />

      {/* Грани */}
      <path d={backPath}             fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={topShell.join(' ')}   fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={rightShell.join(' ')} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={frontPath}            fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />

      {/* Осевые крестики — передний и задний торец + продольная ось */}
      {(() => {
        // Передний торец (виден)
        const fC  = isoProject(len, ry, 0, ox, oy);
        const fY1 = isoProject(len, ry * 2, 0, ox, oy);
        const fY2 = isoProject(len, 0, 0, ox, oy);
        const fZ1 = isoProject(len, ry, rz, ox, oy);
        const fZ2 = isoProject(len, ry, -rz, ox, oy);
        // Задний торец (скрытый)
        const bC  = isoProject(-len, ry, 0, ox, oy);
        const bY1 = isoProject(-len, ry * 2, 0, ox, oy);
        const bY2 = isoProject(-len, 0, 0, ox, oy);
        const bZ1 = isoProject(-len, ry, rz, ox, oy);
        const bZ2 = isoProject(-len, ry, -rz, ox, oy);
        // Продольная осевая (центр цилиндра)
        return (
          <>
            {/* Передний крестик */}
            <AxisCross cx={fC.px} cy={fC.py}
              dx1={(fY1.px - fY2.px) / 2} dy1={(fY1.py - fY2.py) / 2}
              dx2={(fZ1.px - fZ2.px) / 2} dy2={(fZ1.py - fZ2.py) / 2} />
            {/* Задний крестик — пунктиром */}
            <line x1={bY2.px} y1={bY2.py} x2={bY1.px} y2={bY1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
            <line x1={bZ2.px} y1={bZ2.py} x2={bZ1.px} y2={bZ1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
            {/* Горизонтальная продольная ось */}
            <line x1={fC.px} y1={fC.py} x2={bC.px} y2={bC.py} {...AXIS_PROPS} />
          </>
        );
      })()}

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
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={EDGE_COLOR} floodOpacity="0.20" />
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

        <text x={W - 12} y={H - 8} fontSize={10} fill={HIDDEN_COLOR} textAnchor="end"
              fontFamily="IBM Plex Mono, monospace" opacity={0.7}>
          {dim.length}×{dim.width}×{dim.height} мм
        </text>
      </svg>
    </div>
  );
}