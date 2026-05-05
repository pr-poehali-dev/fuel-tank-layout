import { TankConfig } from '@/types/tank';

interface Props {
  config: TankConfig;
  onUpdate: (config: TankConfig) => void;
}

interface FieldProps {
  label: string;
  unit: string;
  value: number | string;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  onChange: (val: string) => void;
}

function DimField({ label, unit, value, type = 'number', min, max, onChange }: FieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(e.target.value)}
          className="w-24 px-2 py-1.5 text-sm text-right font-mono border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <span className="text-xs text-muted-foreground w-8">{unit}</span>
      </div>
    </div>
  );
}

export default function DimensionsPanel({ config, onUpdate }: Props) {
  const d = config.dimensions;

  function setDim(key: keyof typeof d, val: string) {
    const numeric = Number(val);
    if (key === 'material') {
      onUpdate({ ...config, dimensions: { ...d, material: val } });
    } else if (!isNaN(numeric) && numeric > 0) {
      onUpdate({ ...config, dimensions: { ...d, [key]: numeric } });
    }
  }

  const volume = Math.round(d.length * d.width * d.height / 1e6) / 1000; // m³

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <DimField label="Длина / диаметр" unit="мм" value={d.length}        min={100} max={50000} onChange={v => setDim('length', v)} />
        <DimField label="Ширина"           unit="мм" value={d.width}         min={100} max={50000} onChange={v => setDim('width', v)} />
        <DimField label="Высота"           unit="мм" value={d.height}        min={100} max={50000} onChange={v => setDim('height', v)} />
        <DimField label="Толщина стенки"   unit="мм" value={d.wallThickness} min={1}   max={100}   onChange={v => setDim('wallThickness', v)} />
        <DimField label="Материал"         unit=""   value={d.material}      type="text"            onChange={v => setDim('material', v)} />
      </div>

      <div className="rounded-lg bg-secondary/60 border border-border p-3 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Объём (габаритный)</span>
          <span className="font-mono font-medium text-foreground">{volume.toFixed(3)} м³</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Объём в литрах</span>
          <span className="font-mono font-medium text-foreground">{Math.round(volume * 1000)} л</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Патрубков активных</span>
          <span className="font-mono font-medium text-foreground">
            {config.nozzles.filter(n => n.enabled).length} / {config.nozzles.length}
          </span>
        </div>
      </div>
    </div>
  );
}
