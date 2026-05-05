import { HistoryEntry } from '@/types/tank';
import Icon from '@/components/ui/icon';

interface Props {
  history: HistoryEntry[];
  currentIndex: number;
  onRestore: (index: number) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPanel({ history, currentIndex, onRestore }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <Icon name="ClockFading" fallback="Clock" size={24} />
        <span className="text-sm">История пуста</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {[...history].reverse().map((entry, i) => {
        const originalIndex = history.length - 1 - i;
        const isCurrent = originalIndex === currentIndex;
        return (
          <div
            key={entry.id}
            className={[
              'flex items-start gap-2.5 px-3 py-2.5 rounded-md border transition-all',
              isCurrent
                ? 'border-primary/40 bg-primary/5'
                : 'border-transparent hover:border-border hover:bg-secondary/40 cursor-pointer',
            ].join(' ')}
            onClick={() => !isCurrent && onRestore(originalIndex)}
          >
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${isCurrent ? 'font-medium text-primary' : 'text-foreground'}`}>
                {entry.description}
              </div>
              <div className="text-xs text-muted-foreground">{timeAgo(entry.timestamp)}</div>
            </div>
            {isCurrent ? (
              <span className="text-xs text-primary font-medium flex-shrink-0">текущий</span>
            ) : (
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                <Icon name="RotateCcw" size={11} />
                откат
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
