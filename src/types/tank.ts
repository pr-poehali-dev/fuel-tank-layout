export type TankType = 'vertical-cylinder' | 'horizontal-cylinder' | 'rectangular';

export type NozzleFace = 'top' | 'front' | 'back' | 'left' | 'right' | 'bottom';

export interface NozzlePosition {
  face: NozzleFace;
  x: number; // 0..1 relative position along face width
  y: number; // 0..1 relative position along face height
}

export interface Nozzle {
  id: string;
  name: string;
  diameter: number; // mm
  position: NozzlePosition;
  type: 'inlet' | 'outlet' | 'vent' | 'drain' | 'gauge';
  enabled: boolean;
}

export interface TankDimensions {
  length: number;   // mm
  width: number;    // mm
  height: number;   // mm
  wallThickness: number; // mm
  material: string;
}

export interface TankConfig {
  id: string;
  tankType: TankType;
  dimensions: TankDimensions;
  nozzles: Nozzle[];
  name: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  config: TankConfig;
  description: string;
  timestamp: number;
}

export const TANK_PRESETS: Record<TankType, { label: string; description: string; dimensions: TankDimensions }> = {
  'vertical-cylinder': {
    label: 'Вертикальный цилиндр',
    description: 'Стандартный вертикальный резервуар',
    dimensions: { length: 1200, width: 1200, height: 2400, wallThickness: 6, material: 'Ст3' },
  },
  'horizontal-cylinder': {
    label: 'Горизонтальный цилиндр',
    description: 'Горизонтальный резервуар на опорах',
    dimensions: { length: 3000, width: 1000, height: 1000, wallThickness: 8, material: 'Ст3' },
  },
  'rectangular': {
    label: 'Прямоугольный бак',
    description: 'Прямоугольный стальной резервуар',
    dimensions: { length: 2000, width: 1500, height: 1800, wallThickness: 5, material: 'Ст3' },
  },
};

export const NOZZLE_TYPES: Record<Nozzle['type'], { label: string; color: string }> = {
  inlet:  { label: 'Подача',     color: '#1a6bc4' },
  outlet: { label: 'Отбор',      color: '#16a34a' },
  vent:   { label: 'Вентиляция', color: '#9333ea' },
  drain:  { label: 'Слив',       color: '#ea580c' },
  gauge:  { label: 'Прибор',     color: '#ca8a04' },
};

export function createDefaultNozzles(): Nozzle[] {
  return [
    { id: 'n1', name: 'Подача топлива', diameter: 50,  position: { face: 'top',   x: 0.3, y: 0.5 }, type: 'inlet',  enabled: true },
    { id: 'n2', name: 'Отбор топлива',  diameter: 50,  position: { face: 'front', x: 0.5, y: 0.2 }, type: 'outlet', enabled: true },
    { id: 'n3', name: 'Дыхательный',    diameter: 32,  position: { face: 'top',   x: 0.7, y: 0.5 }, type: 'vent',   enabled: true },
    { id: 'n4', name: 'Слив',           diameter: 40,  position: { face: 'bottom',x: 0.5, y: 0.5 }, type: 'drain',  enabled: false },
    { id: 'n5', name: 'Уровнемер',      diameter: 20,  position: { face: 'right', x: 0.5, y: 0.5 }, type: 'gauge',  enabled: true },
  ];
}
