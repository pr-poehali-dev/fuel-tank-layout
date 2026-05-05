import { useState, useCallback } from 'react';
import {
  TankConfig, TankType, Nozzle, HistoryEntry,
  TANK_PRESETS, createDefaultNozzles,
} from '@/types/tank';
import IsometricTank, { ViewMode } from '@/components/IsometricTank';
import TankSelector from '@/components/TankSelector';
import NozzleEditor from '@/components/NozzleEditor';
import DimensionsPanel from '@/components/DimensionsPanel';
import HistoryPanel from '@/components/HistoryPanel';
import Icon from '@/components/ui/icon';

function makeId() { return Math.random().toString(36).slice(2, 10); }

function initialConfig(): TankConfig {
  return {
    id: makeId(),
    tankType: 'vertical-cylinder',
    dimensions: { ...TANK_PRESETS['vertical-cylinder'].dimensions },
    nozzles: createDefaultNozzles(),
    name: 'Новый бак',
    timestamp: Date.now(),
  };
}

type Panel = 'tank' | 'dimensions' | 'nozzles' | 'history';

const PANELS: { id: Panel; label: string; icon: string }[] = [
  { id: 'tank',       label: 'Тип бака',  icon: 'Layers' },
  { id: 'dimensions', label: 'Размеры',    icon: 'Ruler' },
  { id: 'nozzles',    label: 'Патрубки',   icon: 'CircleDot' },
  { id: 'history',    label: 'История',    icon: 'History' },
];

export default function Index() {
  const [config, setConfig] = useState<TankConfig>(initialConfig);
  const [history, setHistory] = useState<HistoryEntry[]>(() => [{
    id: makeId(),
    config: initialConfig(),
    description: 'Начальная конфигурация',
    timestamp: Date.now(),
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activePanel, setActivePanel] = useState<Panel>('tank');
  const [selectedNozzleId, setSelectedNozzleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('iso');

  const pushHistory = useCallback((cfg: TankConfig, description: string) => {
    const entry: HistoryEntry = {
      id: makeId(),
      config: JSON.parse(JSON.stringify(cfg)),
      description,
      timestamp: Date.now(),
    };
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, entry];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  function updateConfig(cfg: TankConfig, description: string) {
    setConfig(cfg);
    pushHistory(cfg, description);
  }

  function handleTankTypeChange(type: TankType) {
    const newConfig: TankConfig = {
      ...config,
      id: makeId(),
      tankType: type,
      dimensions: { ...TANK_PRESETS[type].dimensions },
      nozzles: createDefaultNozzles(),
    };
    updateConfig(newConfig, `Тип изменён: ${TANK_PRESETS[type].label}`);
    setSelectedNozzleId(null);
  }

  function handleDimensionsUpdate(cfg: TankConfig) {
    setConfig(cfg);
    pushHistory(cfg, 'Размеры обновлены');
  }

  function handleUpdateNozzle(nozzle: Nozzle) {
    const nozzles = config.nozzles.map(n => n.id === nozzle.id ? nozzle : n);
    const cfg = { ...config, nozzles };
    setConfig(cfg);
    pushHistory(cfg, `Патрубок: ${nozzle.name}`);
  }

  function handleAddNozzle() {
    const newNozzle: Nozzle = {
      id: makeId(),
      name: 'Новый патрубок',
      diameter: 40,
      position: { face: 'top', x: 0.5, y: 0.5 },
      type: 'inlet',
      enabled: true,
    };
    const cfg = { ...config, nozzles: [...config.nozzles, newNozzle] };
    updateConfig(cfg, 'Добавлен патрубок');
    setSelectedNozzleId(newNozzle.id);
    setActivePanel('nozzles');
  }

  function handleDeleteNozzle(id: string) {
    const cfg = { ...config, nozzles: config.nozzles.filter(n => n.id !== id) };
    updateConfig(cfg, 'Патрубок удалён');
  }

  function handleRestoreHistory(index: number) {
    const entry = history[index];
    if (!entry) return;
    setConfig(JSON.parse(JSON.stringify(entry.config)));
    setHistoryIndex(index);
    setSelectedNozzleId(null);
  }

  function handleExport() {
    const data = JSON.stringify({ ...config, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tank-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    const c = initialConfig();
    setConfig(c);
    setHistory([{ id: makeId(), config: JSON.parse(JSON.stringify(c)), description: 'Сброс конфигурации', timestamp: Date.now() }]);
    setHistoryIndex(0);
    setSelectedNozzleId(null);
  }

  const preset = TANK_PRESETS[config.tankType];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-border bg-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Layers" size={15} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">TankConfig</span>
            <span className="text-xs text-muted-foreground ml-2">{preset.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md bg-white hover:bg-secondary/60 text-foreground transition-all"
          >
            <Icon name="Download" size={14} />
            Экспорт JSON
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md bg-white hover:bg-secondary/60 text-foreground transition-all"
          >
            <Icon name="RotateCcw" size={14} />
            Сбросить
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar */}
        <aside className="flex-shrink-0 w-72 border-r border-border bg-white flex flex-col overflow-hidden">
          {/* Panel nav tabs */}
          <div className="flex border-b border-border">
            {PANELS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id)}
                title={p.label}
                className={[
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-all border-b-2',
                  activePanel === p.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                ].join(' ')}
              >
                <Icon name={p.icon} size={16} />
                <span className="text-[10px] leading-none">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === 'tank' && (
              <div className="animate-fade-in">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">Выберите тип резервуара</p>
                <TankSelector selected={config.tankType} onChange={handleTankTypeChange} />
              </div>
            )}
            {activePanel === 'dimensions' && (
              <div className="animate-fade-in">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">Параметры бака</p>
                <DimensionsPanel config={config} onUpdate={handleDimensionsUpdate} />
              </div>
            )}
            {activePanel === 'nozzles' && (
              <div className="animate-fade-in">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">Патрубки</p>
                <NozzleEditor
                  config={config}
                  selectedNozzleId={selectedNozzleId}
                  onSelectNozzle={setSelectedNozzleId}
                  onUpdateNozzle={handleUpdateNozzle}
                  onAddNozzle={handleAddNozzle}
                  onDeleteNozzle={handleDeleteNozzle}
                />
              </div>
            )}
            {activePanel === 'history' && (
              <div className="animate-fade-in">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">История изменений</p>
                <HistoryPanel history={history} currentIndex={historyIndex} onRestore={handleRestoreHistory} />
              </div>
            )}
          </div>
        </aside>

        {/* Main view */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-white/60 backdrop-blur-sm">
            {/* View switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-secondary/70 rounded-lg border border-border">
              {([
                { id: 'iso'   as ViewMode, label: 'Изо',    icon: 'Box' },
                { id: 'front' as ViewMode, label: 'Спереди', icon: 'RectangleHorizontal' },
                { id: 'side'  as ViewMode, label: 'Сбоку',   icon: 'RectangleVertical' },
                { id: 'top'   as ViewMode, label: 'Сверху',  icon: 'Square' },
              ]).map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all font-medium',
                    viewMode === v.id
                      ? 'bg-white text-primary shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon name={v.icon} fallback="Square" size={12} />
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{config.nozzles.filter(n => n.enabled).length} патрубков</span>
              <span>·</span>
              <span className="font-mono">{config.dimensions.length} × {config.dimensions.width} × {config.dimensions.height} мм</span>
              <span>·</span>
              <span className="font-mono">{config.dimensions.material}</span>
            </div>
          </div>

          {/* Isometric canvas */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.15]"
                 style={{
                   backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                   backgroundSize: '24px 24px',
                 }} />
            <div className="relative z-10">
              <IsometricTank
                config={config}
                selectedNozzleId={selectedNozzleId}
                onSelectNozzle={id => { setSelectedNozzleId(id); setActivePanel('nozzles'); }}
                viewMode={viewMode}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex-shrink-0 flex items-center gap-5 px-6 py-3 border-t border-border bg-white/60">
            <span className="text-xs text-muted-foreground font-medium">Типы патрубков:</span>
            {([
              { color: '#1a6bc4', label: 'Подача' },
              { color: '#16a34a', label: 'Отбор' },
              { color: '#9333ea', label: 'Вентиляция' },
              { color: '#ea580c', label: 'Слив' },
              { color: '#ca8a04', label: 'Прибор' },
            ] as const).map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
            <div className="ml-auto text-xs text-muted-foreground italic">
              Кликните на патрубок для редактирования
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}