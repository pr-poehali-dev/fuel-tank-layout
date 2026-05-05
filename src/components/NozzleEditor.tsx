import { useState } from 'react';
import { Nozzle, NozzleFace, NOZZLE_TYPES, TankConfig } from '@/types/tank';
import Icon from '@/components/ui/icon';

interface Props {
  config: TankConfig;
  selectedNozzleId: string | null;
  onSelectNozzle: (id: string | null) => void;
  onUpdateNozzle: (nozzle: Nozzle) => void;
  onAddNozzle: () => void;
  onDeleteNozzle: (id: string) => void;
}

const FACES: { value: NozzleFace; label: string }[] = [
  { value: 'top',    label: 'Верх' },
  { value: 'front',  label: 'Перед' },
  { value: 'back',   label: 'Зад' },
  { value: 'right',  label: 'Право' },
  { value: 'left',   label: 'Лево' },
  { value: 'bottom', label: 'Дно' },
];

function NozzleRow({ nozzle, selected, onClick }: { nozzle: Nozzle; selected: boolean; onClick: () => void }) {
  const meta = NOZZLE_TYPES[nozzle.type];
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left transition-all',
        selected
          ? 'border-primary/60 bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-secondary/50',
        !nozzle.enabled && 'opacity-45',
      ].filter(Boolean).join(' ')}
    >
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
      <span className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate block">{nozzle.name}</span>
        <span className="text-xs text-muted-foreground">
          {meta.label} · Ø{nozzle.diameter} мм · {FACES.find(f => f.value === nozzle.position.face)?.label}
        </span>
      </span>
      {selected && <Icon name="ChevronRight" size={14} className="text-primary flex-shrink-0" />}
    </button>
  );
}

export default function NozzleEditor({ config, selectedNozzleId, onSelectNozzle, onUpdateNozzle, onAddNozzle, onDeleteNozzle }: Props) {
  const selected = config.nozzles.find(n => n.id === selectedNozzleId) ?? null;

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* List */}
      <div className="flex flex-col gap-0.5">
        {config.nozzles.map(n => (
          <NozzleRow
            key={n.id}
            nozzle={n}
            selected={n.id === selectedNozzleId}
            onClick={() => onSelectNozzle(n.id === selectedNozzleId ? null : n.id)}
          />
        ))}
      </div>

      <button
        onClick={onAddNozzle}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
      >
        <Icon name="Plus" size={14} />
        Добавить патрубок
      </button>

      {/* Editor */}
      {selected && (
        <div className="border border-border rounded-lg p-4 flex flex-col gap-4 animate-fade-in bg-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Редактирование</span>
            <button onClick={() => onSelectNozzle(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={14} />
            </button>
          </div>

          <Field label="Название">
            <input
              className="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={selected.name}
              onChange={e => onUpdateNozzle({ ...selected, name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Тип">
              <select
                className="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={selected.type}
                onChange={e => onUpdateNozzle({ ...selected, type: e.target.value as Nozzle['type'] })}
              >
                {(Object.keys(NOZZLE_TYPES) as Nozzle['type'][]).map(t => (
                  <option key={t} value={t}>{NOZZLE_TYPES[t].label}</option>
                ))}
              </select>
            </Field>

            <Field label="Диаметр, мм">
              <input
                type="number"
                className="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={selected.diameter}
                min={10} max={500}
                onChange={e => onUpdateNozzle({ ...selected, diameter: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Грань">
            <div className="grid grid-cols-3 gap-1">
              {FACES.map(f => (
                <button
                  key={f.value}
                  onClick={() => onUpdateNozzle({ ...selected, position: { ...selected.position, face: f.value } })}
                  className={[
                    'py-1.5 text-xs rounded-md border transition-all',
                    selected.position.face === f.value
                      ? 'border-primary bg-primary text-white font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-white',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Позиция X (0–1)">
              <input
                type="range" min={0} max={1} step={0.01}
                value={selected.position.x}
                className="w-full accent-primary"
                onChange={e => onUpdateNozzle({ ...selected, position: { ...selected.position, x: Number(e.target.value) } })}
              />
              <span className="text-xs font-mono text-muted-foreground">{selected.position.x.toFixed(2)}</span>
            </Field>
            <Field label="Позиция Y (0–1)">
              <input
                type="range" min={0} max={1} step={0.01}
                value={selected.position.y}
                className="w-full accent-primary"
                onChange={e => onUpdateNozzle({ ...selected, position: { ...selected.position, y: Number(e.target.value) } })}
              />
              <span className="text-xs font-mono text-muted-foreground">{selected.position.y.toFixed(2)}</span>
            </Field>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.enabled}
                onChange={e => onUpdateNozzle({ ...selected, enabled: e.target.checked })}
                className="accent-primary w-4 h-4"
              />
              <span className="text-sm text-foreground">Активен</span>
            </label>
            <button
              onClick={() => { onDeleteNozzle(selected.id); onSelectNozzle(null); }}
              className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <Icon name="Trash2" size={14} />
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
