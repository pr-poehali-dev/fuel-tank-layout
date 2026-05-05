import React, { useState } from 'react';
import { TankConfig, Nozzle, NOZZLE_TYPES } from '@/types/tank';

export type ViewMode = 'iso' | 'front' | 'side' | 'top';

interface Props {
  config: TankConfig;
  selectedNozzleId: string | null;
  onSelectNozzle: (id: string) => void;
  viewMode?: ViewMode;
}

const W = 520;
const H = 420;
const CX = 0.866;
const SY = 0.5;

const EDGE_COLOR   = '#2563a8';
const HIDDEN_COLOR = '#60a0d8';
const FACE_FILL    = 'rgba(96, 175, 230, 0.08)';

const DASH_PROPS = {
  stroke: HIDDEN_COLOR, strokeWidth: 1.5, strokeDasharray: '6 4', opacity: 0.85,
} as const;

const AXIS_PROPS = {
  stroke: '#c0392b', strokeWidth: 0.9, strokeDasharray: '10 3 2 3', opacity: 0.75,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  if (isHorizontal) return { len: (length / 2) * s, ry: (diameter / 2) * s, rz: (diameter / 4) * s };
  return { rx: (diameter / 2) * s, rz: (diameter / 4) * s, h: height * s };
}

function AxisCross({ cx, cy, dx1, dy1, dx2, dy2, r = 1.15 }: {
  cx: number; cy: number; dx1: number; dy1: number; dx2: number; dy2: number; r?: number;
}) {
  return (
    <g>
      <line x1={cx - dx1 * r} y1={cy - dy1 * r} x2={cx + dx1 * r} y2={cy + dy1 * r} {...AXIS_PROPS} />
      <line x1={cx - dx2 * r} y1={cy - dy2 * r} x2={cx + dx2 * r} y2={cy + dy2 * r} {...AXIS_PROPS} />
    </g>
  );
}

// ─── NozzleDot ───────────────────────────────────────────────────────────────
function NozzleDot({ cx, cy, nozzle, selected, onClick }: {
  cx: number; cy: number; nozzle: Nozzle; selected: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = NOZZLE_TYPES[nozzle.type].color;
  const r = selected ? 9 : hovered ? 8 : 6;
  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ cursor: 'pointer' }}>
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

// ─── Label ───────────────────────────────────────────────────────────────────
function ViewLabel({ text }: { text: string }) {
  return (
    <text x={W / 2} y={22} textAnchor="middle" fontSize={10} fill={EDGE_COLOR}
          fontFamily="IBM Plex Mono, monospace" opacity={0.55} letterSpacing={2}>
      {text.toUpperCase()}
    </text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ISOMETRIC VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

interface ShapeProps { config: TankConfig; selectedNozzleId: string | null; onSelectNozzle: (id: string) => void; }

function RectangularIso({ config, selectedNozzleId, onSelectNozzle }: ShapeProps) {
  const { nozzles, dimensions: d } = config;
  const { bx, bz, by } = normalizeDims(d.length, d.width, d.height, 140);
  const ox = W / 2 - 20, oy = H / 2 + by * 0.35;
  const pt = (x: number, y: number, z: number) => isoProject(x, y, z, ox, oy);
  const ptsStr = (xs: [number, number, number][]) =>
    xs.map(([x, y, z]) => { const p = pt(x, y, z); return `${p.px},${p.py}`; }).join(' ');

  const topFace   = [[-bx, by, -bz], [bx, by, -bz], [bx, by, bz], [-bx, by, bz]] as [number,number,number][];
  const frontFace = [[-bx, 0, bz], [bx, 0, bz], [bx, by, bz], [-bx, by, bz]] as [number,number,number][];
  const rightFace = [[bx, 0, -bz], [bx, 0, bz], [bx, by, bz], [bx, by, -bz]] as [number,number,number][];
  const A = pt(-bx, 0, -bz), B = pt(bx, 0, -bz), D = pt(-bx, 0, bz), E = pt(-bx, by, -bz);

  return (
    <>
      {[[A, B], [A, D], [A, E]].map(([a, b], i) => (
        <line key={i} x1={a.px} y1={a.py} x2={b.px} y2={b.py} {...DASH_PROPS} />
      ))}
      <polygon points={ptsStr(topFace)}   fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <polygon points={ptsStr(frontFace)} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <polygon points={ptsStr(rightFace)} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      {[0.25, 0.5, 0.75].map(t => {
        const a = pt(lerp(-bx, bx, t), by, -bz), b = pt(lerp(-bx, bx, t), by, bz);
        return <line key={t} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke={EDGE_COLOR} strokeWidth={0.5} opacity={0.25} />;
      })}
      {[0.33, 0.67].map(t => {
        const a = pt(-bx, by, lerp(-bz, bz, t)), b = pt(bx, by, lerp(-bz, bz, t));
        return <line key={t} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke={EDGE_COLOR} strokeWidth={0.5} opacity={0.25} />;
      })}
      {(() => {
        const topC = pt(0, by, 0);
        const topX1 = pt(bx, by, 0), topX2 = pt(-bx, by, 0);
        const topZ1 = pt(0, by, bz), topZ2 = pt(0, by, -bz);
        const fC = pt(0, by * 0.5, bz);
        const fX1 = pt(bx, by * 0.5, bz), fX2 = pt(-bx, by * 0.5, bz);
        const fY1 = pt(0, by, bz), fY2 = pt(0, 0, bz);
        const rC = pt(bx, by * 0.5, 0);
        const rZ1 = pt(bx, by * 0.5, bz), rZ2 = pt(bx, by * 0.5, -bz);
        const rY1 = pt(bx, by, 0), rY2 = pt(bx, 0, 0);
        return (<>
          <AxisCross cx={topC.px} cy={topC.py} dx1={(topX1.px-topX2.px)/2} dy1={(topX1.py-topX2.py)/2} dx2={(topZ1.px-topZ2.px)/2} dy2={(topZ1.py-topZ2.py)/2} />
          <AxisCross cx={fC.px} cy={fC.py} dx1={(fX1.px-fX2.px)/2} dy1={(fX1.py-fX2.py)/2} dx2={(fY1.px-fY2.px)/2} dy2={(fY1.py-fY2.py)/2} />
          <AxisCross cx={rC.px} cy={rC.py} dx1={(rZ1.px-rZ2.px)/2} dy1={(rZ1.py-rZ2.py)/2} dx2={(rY1.px-rY2.px)/2} dy2={(rY1.py-rY2.py)/2} />
        </>);
      })()}
      {getFaceNozzles(nozzles, 'top').map(n => { const p = pt(lerp(-bx,bx,n.position.x),by,lerp(-bz,bz,n.position.y)); return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />; })}
      {getFaceNozzles(nozzles, 'front').map(n => { const p = pt(lerp(-bx,bx,n.position.x),lerp(by,0,n.position.y),bz); return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />; })}
      {getFaceNozzles(nozzles, 'right').map(n => { const p = pt(bx,lerp(by,0,n.position.y),lerp(bz,-bz,n.position.x)); return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />; })}
    </>
  );
}

function VerticalCylinderIso({ config, selectedNozzleId, onSelectNozzle }: ShapeProps) {
  const { nozzles, dimensions: d } = config;
  const diameter = Math.max(d.length, d.width);
  const { rx, rz, h } = normalizeCylinder(diameter, d.length, d.height, 140, false);
  const ox = W / 2 - 20, oy = H / 2 + h * 0.35;
  const segs = 64;
  function ep(t: number, dy: number) {
    const a = (t / segs) * Math.PI * 2;
    return isoProject(Math.cos(a) * rx, dy, Math.sin(a) * rz, ox, oy);
  }
  const topPts = Array.from({length: segs}, (_, i) => ep(i, h));
  const botPts = Array.from({length: segs}, (_, i) => ep(i, 0));
  const topPath = topPts.map((p, i) => `${i===0?'M':'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const botPath = botPts.map((p, i) => `${i===0?'M':'L'}${p.px},${p.py}`).join(' ') + 'Z';
  const rightPts: string[] = [];
  for (let i = Math.ceil(segs*.25); i <= Math.floor(segs*.75); i++) { const p = ep(i, h); rightPts.push(`${i===Math.ceil(segs*.25)?'M':'L'}${p.px},${p.py}`); }
  for (let i = Math.floor(segs*.75); i >= Math.ceil(segs*.25); i--) { const p = ep(i, 0); rightPts.push(`L${p.px},${p.py}`); }
  rightPts.push('Z');
  const hTopArc: string[] = [], hBotArc: string[] = [];
  for (let i = 0; i <= Math.ceil(segs*.25); i++) { const p = ep(i,h); hTopArc.push(`${i===0?'M':'L'}${p.px},${p.py}`); }
  for (let i = Math.floor(segs*.75); i <= segs; i++) { const p = ep(i,h); hTopArc.push(`L${p.px},${p.py}`); }
  for (let i = 0; i <= Math.ceil(segs*.25); i++) { const p = ep(i,0); hBotArc.push(`${i===0?'M':'L'}${p.px},${p.py}`); }
  for (let i = Math.floor(segs*.75); i <= segs; i++) { const p = ep(i,0); hBotArc.push(`L${p.px},${p.py}`); }
  const leftTop = ep(0, h), leftBot = ep(0, 0);
  const topC = isoProject(0,h,0,ox,oy), botC = isoProject(0,0,0,ox,oy);
  const tX1 = isoProject(rx,h,0,ox,oy), tX2 = isoProject(-rx,h,0,ox,oy);
  const tZ1 = isoProject(0,h,rz,ox,oy), tZ2 = isoProject(0,h,-rz,ox,oy);
  const bX1 = isoProject(rx,0,0,ox,oy), bX2 = isoProject(-rx,0,0,ox,oy);
  const bZ1 = isoProject(0,0,rz,ox,oy), bZ2 = isoProject(0,0,-rz,ox,oy);
  return (
    <>
      <path d={hTopArc.join(' ')} fill="none" {...DASH_PROPS} />
      <path d={hBotArc.join(' ')} fill="none" {...DASH_PROPS} />
      <line x1={leftTop.px} y1={leftTop.py} x2={leftBot.px} y2={leftBot.py} {...DASH_PROPS} />
      <path d={rightPts.join(' ')} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={botPath} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={topPath} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <AxisCross cx={topC.px} cy={topC.py} dx1={(tX1.px-tX2.px)/2} dy1={(tX1.py-tX2.py)/2} dx2={(tZ1.px-tZ2.px)/2} dy2={(tZ1.py-tZ2.py)/2} />
      <line x1={bX2.px} y1={bX2.py} x2={bX1.px} y2={bX1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
      <line x1={bZ2.px} y1={bZ2.py} x2={bZ1.px} y2={bZ1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
      <line x1={topC.px} y1={topC.py} x2={botC.px} y2={botC.py} {...AXIS_PROPS} />
      {getFaceNozzles(nozzles,'top').map(n => { const a = n.position.x*Math.PI*2; const p = isoProject(Math.cos(a)*rx*.4,h,Math.sin(a)*rz*.4,ox,oy); return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />; })}
      {(['front','right','left'] as const).flatMap(face => getFaceNozzles(nozzles,face).map(n => { const a = (n.position.x-.5)*Math.PI; const p = isoProject(Math.cos(a)*rx,lerp(h,0,n.position.y),Math.sin(a)*rz,ox,oy); return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />; }))}
    </>
  );
}

function HorizontalCylinderIso({ config, selectedNozzleId, onSelectNozzle }: ShapeProps) {
  const { nozzles, dimensions: d } = config;
  const diameter = Math.max(d.width, d.height);
  const { len, ry, rz } = normalizeCylinder(diameter, d.length, d.height, 140, true);
  const ox = W / 2 - 20, oy = H / 2 + ry * 0.3;
  const segs = 64;
  function ep(t: number, dx: number) {
    const a = (t/segs)*Math.PI*2;
    return isoProject(dx, Math.sin(a)*ry+ry, Math.cos(a)*rz, ox, oy);
  }
  const frontPts = Array.from({length:segs},(_,i)=>ep(i,len));
  const backPts  = Array.from({length:segs},(_,i)=>ep(i,-len));
  const frontPath = frontPts.map((p,i)=>`${i===0?'M':'L'}${p.px},${p.py}`).join(' ')+'Z';
  const backPath  = backPts.map((p,i)=>`${i===0?'M':'L'}${p.px},${p.py}`).join(' ')+'Z';
  const topShell: string[] = [];
  for (let i=0;i<=Math.floor(segs/2);i++){const a=(i/segs)*Math.PI*2;const p=isoProject(len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);topShell.push(`${i===0?'M':'L'}${p.px},${p.py}`);}
  for (let i=Math.floor(segs/2);i>=0;i--){const a=(i/segs)*Math.PI*2;const p=isoProject(-len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);topShell.push(`L${p.px},${p.py}`);}
  topShell.push('Z');
  const rightShell: string[] = [];
  for (let i=0;i<=Math.floor(segs/4);i++){const a=(i/segs)*Math.PI*2;const p=isoProject(len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);rightShell.push(`${i===0?'M':'L'}${p.px},${p.py}`);}
  for (let i=Math.floor(segs/4);i>=0;i--){const a=(i/segs)*Math.PI*2;const p=isoProject(-len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);rightShell.push(`L${p.px},${p.py}`);}
  rightShell.push('Z');
  const hiddenBot: string[] = [];
  for (let i=Math.floor(segs/2);i<=segs;i++){const a=(i/segs)*Math.PI*2;const p=isoProject(len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);hiddenBot.push(`${i===Math.floor(segs/2)?'M':'L'}${p.px},${p.py}`);}
  const hiddenBotBack: string[] = [];
  for (let i=Math.floor(segs/2);i<=segs;i++){const a=(i/segs)*Math.PI*2;const p=isoProject(-len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);hiddenBotBack.push(`${i===Math.floor(segs/2)?'M':'L'}${p.px},${p.py}`);}
  const botFront = ep(Math.floor(segs/2),len), botBack = ep(Math.floor(segs/2),-len);
  const supH = ry*.45, supX = [-len*.55, len*.55];
  const supPts = supX.map(sx => ({bot:isoProject(sx,-supH,0,ox,oy),topL:isoProject(sx,0,-rz*.8,ox,oy),topR:isoProject(sx,0,rz*.8,ox,oy)}));
  const fC=isoProject(len,ry,0,ox,oy),fY1=isoProject(len,ry*2,0,ox,oy),fY2=isoProject(len,0,0,ox,oy),fZ1=isoProject(len,ry,rz,ox,oy),fZ2=isoProject(len,ry,-rz,ox,oy);
  const bC=isoProject(-len,ry,0,ox,oy),bY1=isoProject(-len,ry*2,0,ox,oy),bY2=isoProject(-len,0,0,ox,oy),bZ1=isoProject(-len,ry,rz,ox,oy),bZ2=isoProject(-len,ry,-rz,ox,oy);
  return (
    <>
      {supPts.map((s,i)=><g key={i}><line x1={s.topL.px} y1={s.topL.py} x2={s.bot.px} y2={s.bot.py} stroke={EDGE_COLOR} strokeWidth={Math.max(2,ry*.035)} /><line x1={s.topR.px} y1={s.topR.py} x2={s.bot.px} y2={s.bot.py} stroke={EDGE_COLOR} strokeWidth={Math.max(2,ry*.035)} /></g>)}
      <path d={hiddenBot.join(' ')} fill="none" {...DASH_PROPS} />
      <path d={hiddenBotBack.join(' ')} fill="none" {...DASH_PROPS} />
      <line x1={botFront.px} y1={botFront.py} x2={botBack.px} y2={botBack.py} {...DASH_PROPS} />
      <path d={backPath} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={topShell.join(' ')} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={rightShell.join(' ')} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <path d={frontPath} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      <AxisCross cx={fC.px} cy={fC.py} dx1={(fY1.px-fY2.px)/2} dy1={(fY1.py-fY2.py)/2} dx2={(fZ1.px-fZ2.px)/2} dy2={(fZ1.py-fZ2.py)/2} />
      <line x1={bY2.px} y1={bY2.py} x2={bY1.px} y2={bY1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
      <line x1={bZ2.px} y1={bZ2.py} x2={bZ1.px} y2={bZ1.py} {...AXIS_PROPS} strokeDasharray="6 4" opacity={0.45} />
      <line x1={fC.px} y1={fC.py} x2={bC.px} y2={bC.py} {...AXIS_PROPS} />
      {getFaceNozzles(nozzles,'top').map(n=>{const p=isoProject(lerp(-len,len,n.position.x),ry*2,0,ox,oy);return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={()=>onSelectNozzle(n.id)} />;  })}
      {(['front','right'] as const).flatMap(face=>getFaceNozzles(nozzles,face).map(n=>{const a=n.position.y*Math.PI*2;const p=isoProject(len,Math.sin(a)*ry+ry,Math.cos(a)*rz,ox,oy);return <NozzleDot key={n.id} cx={p.px} cy={p.py} nozzle={n} selected={selectedNozzleId===n.id} onClick={()=>onSelectNozzle(n.id)} />;}))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORTHOGRAPHIC VIEWS — плоские проекции
// ═══════════════════════════════════════════════════════════════════════════════

// Ортопроекция: масштабируем (w, h) в SVG с отступом
function orthoScale(w: number, h: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / w, maxH / h) * 0.72;
  return s;
}

// Вид спереди (Front): ось X слева-направо, ось Y снизу-вверх
function FrontView({ config, selectedNozzleId, onSelectNozzle }: ShapeProps) {
  const { nozzles, dimensions: d } = config;
  const cx = W / 2, cy = H / 2 + 10;
  const s = orthoScale(d.length, d.height, W, H);
  const hw = d.length / 2 * s, hh = d.height / 2 * s;

  const isCylinder = config.tankType !== 'rectangular';
  const isHoriz    = config.tankType === 'horizontal-cylinder';

  // Размеры для горизонтального цилиндра: width = d.length, height = d.height
  const rw = isHoriz ? d.length / 2 * s : d.length / 2 * s;
  const rh = isHoriz ? d.height / 2 * s : d.height / 2 * s;

  // Осевые
  const axisOverhang = 18;

  return (
    <>
      <ViewLabel text="Вид спереди" />
      {/* Скрытые рёбра (контур сзади = тот же прямоугольник, для цилиндра — нет) */}
      {!isCylinder && (
        <rect x={cx - hw} y={cy - hh} width={hw * 2} height={hh * 2}
              fill="none" stroke={HIDDEN_COLOR} strokeWidth={1.2} strokeDasharray="6 4" opacity={0.6} />
      )}

      {/* Тело */}
      {isCylinder ? (
        <>
          {/* Эллипс торца + прямоугольный силуэт */}
          {!isHoriz && (
            <>
              <rect x={cx - rw} y={cy - rh} width={rw*2} height={rh*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
              <ellipse cx={cx} cy={cy - rh} rx={rw} ry={rw * 0.25} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
              <ellipse cx={cx} cy={cy + rh} rx={rw} ry={rw * 0.25} fill="none" stroke={HIDDEN_COLOR} strokeWidth={1.2} strokeDasharray="6 4" opacity={0.7} />
            </>
          )}
          {isHoriz && (
            <>
              <rect x={cx - rw} y={cy - rh} width={rw*2} height={rh*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
              <ellipse cx={cx - rw} cy={cy} rx={rh * 0.3} ry={rh} fill={FACE_FILL} stroke={HIDDEN_COLOR} strokeWidth={1.2} strokeDasharray="6 4" opacity={0.7} />
              <ellipse cx={cx + rw} cy={cy} rx={rh * 0.3} ry={rh} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
            </>
          )}
        </>
      ) : (
        <rect x={cx - hw} y={cy - hh} width={hw*2} height={hh*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      )}

      {/* Осевые линии */}
      <line x1={cx - rw - axisOverhang} y1={cy} x2={cx + rw + axisOverhang} y2={cy} {...AXIS_PROPS} />
      <line x1={cx} y1={cy - rh - axisOverhang} x2={cx} y2={cy + rh + axisOverhang} {...AXIS_PROPS} />

      {/* Патрубки на передней грани */}
      {getFaceNozzles(nozzles, 'front').map(n => {
        const px = cx + lerp(-hw, hw, n.position.x);
        const py = cy + lerp(-hh, hh, n.position.y) * (isHoriz ? 1 : -1) * -1;
        return <NozzleDot key={n.id} cx={px} cy={py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
      {getFaceNozzles(nozzles, 'top').map(n => {
        const px = cx + lerp(-hw, hw, n.position.x);
        return <NozzleDot key={n.id} cx={px} cy={cy - hh} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
    </>
  );
}

// Вид сбоку (Side): ось Z слева-направо, ось Y снизу-вверх
function SideView({ config, selectedNozzleId, onSelectNozzle }: ShapeProps) {
  const { nozzles, dimensions: d } = config;
  const cx = W / 2, cy = H / 2 + 10;
  const s = orthoScale(d.width, d.height, W, H);
  const hw = d.width / 2 * s, hh = d.height / 2 * s;
  const isCylinder = config.tankType !== 'rectangular';
  const isHoriz    = config.tankType === 'horizontal-cylinder';
  const axisOverhang = 18;

  return (
    <>
      <ViewLabel text="Вид сбоку" />
      {isCylinder ? (
        <>
          {!isHoriz && (
            <>
              <rect x={cx - hw} y={cy - hh} width={hw*2} height={hh*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
              <ellipse cx={cx} cy={cy - hh} rx={hw} ry={hw * 0.25} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
              <ellipse cx={cx} cy={cy + hh} rx={hw} ry={hw * 0.25} fill="none" stroke={HIDDEN_COLOR} strokeWidth={1.2} strokeDasharray="6 4" opacity={0.7} />
            </>
          )}
          {isHoriz && (
            <>
              {/* Горизонтальный цилиндр с боку выглядит как круг */}
              <circle cx={cx} cy={cy} r={hh} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
              <line x1={cx - hh - axisOverhang} y1={cy} x2={cx + hh + axisOverhang} y2={cy} {...AXIS_PROPS} />
            </>
          )}
        </>
      ) : (
        <>
          <rect x={cx - hw} y={cy - hh} width={hw*2} height={hh*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
          <rect x={cx - hw} y={cy - hh} width={hw*2} height={hh*2} fill="none" stroke={HIDDEN_COLOR} strokeWidth={1.2} strokeDasharray="6 4" opacity={0.5} />
        </>
      )}

      {/* Осевые */}
      <line x1={cx - hw - axisOverhang} y1={cy} x2={cx + hw + axisOverhang} y2={cy} {...AXIS_PROPS} />
      <line x1={cx} y1={cy - hh - axisOverhang} x2={cx} y2={cy + hh + axisOverhang} {...AXIS_PROPS} />

      {getFaceNozzles(nozzles, 'right').map(n => {
        const py = cy - lerp(-hh, hh, n.position.y);
        return <NozzleDot key={n.id} cx={cx + hw} cy={py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
      {getFaceNozzles(nozzles, 'left').map(n => {
        const py = cy - lerp(-hh, hh, n.position.y);
        return <NozzleDot key={n.id} cx={cx - hw} cy={py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
    </>
  );
}

// Вид сверху (Top): ось X слева-направо, ось Z сверху-вниз
function TopView({ config, selectedNozzleId, onSelectNozzle }: ShapeProps) {
  const { nozzles, dimensions: d } = config;
  const cx = W / 2, cy = H / 2 + 10;
  const s = orthoScale(d.length, d.width, W, H);
  const hw = d.length / 2 * s, hd = d.width / 2 * s;
  const isCylinder = config.tankType !== 'rectangular';
  const isHoriz    = config.tankType === 'horizontal-cylinder';
  const axisOverhang = 18;

  return (
    <>
      <ViewLabel text="Вид сверху" />
      {isCylinder ? (
        isHoriz ? (
          // горизонтальный: сверху прямоугольник с эллипсами по торцам
          <>
            <rect x={cx - hw} y={cy - hd} width={hw*2} height={hd*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
            <ellipse cx={cx - hw} cy={cy} rx={hd * 0.3} ry={hd} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
            <ellipse cx={cx + hw} cy={cy} rx={hd * 0.3} ry={hd} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
          </>
        ) : (
          // вертикальный: сверху круг / эллипс
          <>
            <ellipse cx={cx} cy={cy} rx={hw} ry={hd} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
          </>
        )
      ) : (
        <rect x={cx - hw} y={cy - hd} width={hw*2} height={hd*2} fill={FACE_FILL} stroke={EDGE_COLOR} strokeWidth={2} />
      )}

      {/* Осевые */}
      <line x1={cx - hw - axisOverhang} y1={cy} x2={cx + hw + axisOverhang} y2={cy} {...AXIS_PROPS} />
      <line x1={cx} y1={cy - hd - axisOverhang} x2={cx} y2={cy + hd + axisOverhang} {...AXIS_PROPS} />

      {getFaceNozzles(nozzles, 'top').map(n => {
        const px = cx + lerp(-hw, hw, n.position.x);
        const py = cy + lerp(-hd, hd, n.position.y);
        return <NozzleDot key={n.id} cx={px} cy={py} nozzle={n} selected={selectedNozzleId===n.id} onClick={() => onSelectNozzle(n.id)} />;
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function IsometricTank({ config, selectedNozzleId, onSelectNozzle, viewMode = 'iso' }: Props) {
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
          {viewMode === 'iso' && (
            <>
              {config.tankType === 'rectangular'         && <RectangularIso        config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />}
              {config.tankType === 'vertical-cylinder'   && <VerticalCylinderIso   config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />}
              {config.tankType === 'horizontal-cylinder' && <HorizontalCylinderIso config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />}
            </>
          )}
          {viewMode === 'front' && <FrontView config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />}
          {viewMode === 'side'  && <SideView  config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />}
          {viewMode === 'top'   && <TopView   config={config} selectedNozzleId={selectedNozzleId} onSelectNozzle={onSelectNozzle} />}
        </g>

        <text x={W - 12} y={H - 8} fontSize={10} fill={HIDDEN_COLOR} textAnchor="end"
              fontFamily="IBM Plex Mono, monospace" opacity={0.7}>
          {dim.length}×{dim.width}×{dim.height} мм
        </text>
      </svg>
    </div>
  );
}
