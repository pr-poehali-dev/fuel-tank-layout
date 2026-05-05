import { TankType, TANK_PRESETS } from '@/types/tank';

interface Props {
  selected: TankType;
  onChange: (type: TankType) => void;
}

const TANK_ICONS: Record<TankType, React.ReactNode> = {
  'vertical-cylinder': (
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none">
      <ellipse cx="20" cy="10" rx="18" ry="7" fill="var(--tank-face-top)" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <rect x="2" y="10" width="36" height="32" fill="var(--tank-face-left)" />
      <ellipse cx="20" cy="42" rx="18" ry="7" fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <line x1="2" y1="10" x2="2" y2="42" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <line x1="38" y1="10" x2="38" y2="42" stroke="var(--tank-edge)" strokeWidth="1.5" />
    </svg>
  ),
  'horizontal-cylinder': (
    <svg width="56" height="34" viewBox="0 0 56 34" fill="none">
      <ellipse cx="10" cy="17" rx="8" ry="15" fill="var(--tank-face-left)" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <rect x="10" y="2" width="36" height="30" fill="var(--tank-face-top)" />
      <ellipse cx="46" cy="17" rx="8" ry="15" fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <line x1="10" y1="2" x2="46" y2="2" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <line x1="10" y1="32" x2="46" y2="32" stroke="var(--tank-edge)" strokeWidth="1.5" />
    </svg>
  ),
  'rectangular': (
    <svg width="50" height="44" viewBox="0 0 50 44" fill="none">
      <polygon points="5,22 25,10 45,22 25,34" fill="var(--tank-face-top)" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <polygon points="5,22 5,38 25,44 25,34" fill="var(--tank-face-left)" stroke="var(--tank-edge)" strokeWidth="1.5" />
      <polygon points="45,22 45,38 25,44 25,34" fill="var(--tank-face-right)" stroke="var(--tank-edge)" strokeWidth="1.5" />
    </svg>
  ),
};

export default function TankSelector({ selected, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {(Object.keys(TANK_PRESETS) as TankType[]).map(type => {
        const preset = TANK_PRESETS[type];
        const isActive = selected === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={[
              'flex items-center gap-3 px-3 py-3 rounded-md border text-left transition-all',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-white hover:border-primary/40 hover:bg-secondary/60',
            ].join(' ')}
          >
            <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
                 style={{
                   '--tank-face-top': isActive ? '#c8daf2' : '#d0dae8',
                   '--tank-face-left': isActive ? '#a8c4e8' : '#b8c8dc',
                   '--tank-face-right': isActive ? '#88aed8' : '#9aafc8',
                   '--tank-edge': isActive ? '#1a6bc4' : '#7a9ab8',
                 } as React.CSSProperties}>
              {TANK_ICONS[type]}
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-medium leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {preset.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
              <div className="text-xs font-mono text-muted-foreground mt-1">
                {preset.dimensions.length}×{preset.dimensions.width}×{preset.dimensions.height} мм
              </div>
            </div>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
