import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, Grip, ListTodo, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { OPEN_TODO_COMPOSER_EVENT, type TodoComposerDetail } from '@/lib/todo-events';
import type { ApplicationRecord, TodoRecord } from '@shared/types';
import { TodoComposer } from './TodoComposer';
import { useTodoSummary } from './TodoProvider';

const POSITION_KEY = 'qz-todo-bubble-position-v2';
const SIZE = 52;
const GAP = 12;
const SNAP_DISTANCE = 20;

interface Position { x: number; y: number }
interface StoredPosition { xRatio: number; yRatio: number }
interface DragState { pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean }

function defaultPosition(): Position {
  return { x: Math.max(GAP, window.innerWidth - SIZE - 20), y: Math.max(GAP, window.innerHeight - SIZE - 20) };
}
function clamp(position: Position): Position {
  return {
    x: Math.min(Math.max(GAP, position.x), Math.max(GAP, window.innerWidth - SIZE - GAP)),
    y: Math.min(Math.max(GAP, position.y), Math.max(GAP, window.innerHeight - SIZE - GAP)),
  };
}

function readPosition(): Position {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}') as Partial<StoredPosition>;
    if (typeof saved.xRatio === 'number' && typeof saved.yRatio === 'number') {
      return clamp({ x: saved.xRatio * Math.max(1, window.innerWidth - SIZE), y: saved.yRatio * Math.max(1, window.innerHeight - SIZE) });
    }
  } catch { /* 损坏的位置数据使用默认值。 */ }
  return defaultPosition();
}

function persist(position: Position): void {
  localStorage.setItem(POSITION_KEY, JSON.stringify({
    xRatio: position.x / Math.max(1, window.innerWidth - SIZE),
    yRatio: position.y / Math.max(1, window.innerHeight - SIZE),
  } satisfies StoredPosition));
}

function softlySnap(position: Position): Position {
  const next = clamp(position);
  const right = window.innerWidth - SIZE - GAP;
  const bottom = window.innerHeight - SIZE - GAP;
  if (next.x - GAP <= SNAP_DISTANCE) next.x = GAP;
  if (right - next.x <= SNAP_DISTANCE) next.x = right;
  if (next.y - GAP <= SNAP_DISTANCE) next.y = GAP;
  if (bottom - next.y <= SNAP_DISTANCE) next.y = bottom;
  return next;
}

export function TodoBubble() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { summary } = useTodoSummary();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>(() => readPosition());
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [composer, setComposer] = useState<TodoComposerDetail>({});
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const handleOpen = (event: Event): void => {
      setComposer((event as CustomEvent<TodoComposerDetail>).detail || {});
      setOpen(true);
    };
    window.addEventListener(OPEN_TODO_COMPOSER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_TODO_COMPOSER_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open || applications.length) return;
    void api.listApplications().then(setApplications).catch(() => undefined);
  }, [applications.length, open]);

  useEffect(() => {
    const resize = (): void => setPosition((current) => {
      const next = clamp(current);
      persist(next);
      return next;
    });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const pointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (isMobile || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) > 6) current.moved = true;
    if (current.moved) setPosition(clamp({ x: current.originX + dx, y: current.originY + dy }));
  };
  const pointerUp = (event: ReactPointerEvent<HTMLElement>): void => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    suppressClick.current = current.moved;
    drag.current = null;
    if (current.moved) {
      const next = softlySnap({
        x: current.originX + event.clientX - current.startX,
        y: current.originY + event.clientY - current.startY,
      });
      setPosition(next);
      persist(next);
    }
  };

  const moveByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const delta: Record<string, [number, number]> = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
    if (!delta[event.key]) return;
    event.preventDefault();
    const next = clamp({ x: position.x + delta[event.key][0], y: position.y + delta[event.key][1] });
    setPosition(next);
    persist(next);
  };

  const reset = (): void => {
    const next = defaultPosition();
    setPosition(next);
    persist(next);
  };

  const panelAbove = position.y > window.innerHeight / 2;
  const panelLeft = position.x > window.innerWidth / 2;
  return (
    <div className={isMobile ? 'todo-bubble-root todo-bubble-root-mobile' : 'todo-bubble-root'} style={isMobile ? undefined : { left: position.x, top: position.y }}>
      {open && (
        <div className={isMobile ? '' : `todo-bubble-popover ${panelAbove ? 'todo-bubble-popover-above' : 'todo-bubble-popover-below'} ${panelLeft ? 'todo-bubble-popover-right' : 'todo-bubble-popover-left'}`}>
          <section className={`todo-bubble-panel ${isMobile ? 'todo-bubble-panel-mobile' : ''}`} aria-label="快捷待办">
            <div className="todo-bubble-panel-header" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
              <div className="flex min-w-0 items-center gap-2"><Grip className="size-4 text-muted-foreground" /><div><p className="text-sm font-bold">快捷待办</p><p className="text-xs text-muted-foreground">拖动标题栏可移动</p></div></div>
              <div className="flex gap-1">
                {!isMobile && <Button variant="ghost" size="icon" onPointerDown={(event) => event.stopPropagation()} onClick={reset} aria-label="移到右下角"><RotateCcw className="size-4" /></Button>}
                <Button variant="ghost" size="icon" onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)} aria-label="收起待办"><X className="size-4" /></Button>
              </div>
            </div>
            <TodoComposer key={`${composer.applicationId || ''}-${composer.title || ''}`} applications={applications} initialTitle={composer.title} initialApplicationId={composer.applicationId} compact autoFocus />
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">今天与逾期</span><Link to="/todos" className="text-xs font-semibold text-primary" onClick={() => setOpen(false)}>查看全部</Link></div>
              {summary.items.length === 0 ? <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">今天没有紧急待办</p> : summary.items.map((todo: TodoRecord) => (
                <div key={todo.id} className="todo-bubble-row"><Checkbox checked={Boolean(todo.completedAt)} onCheckedChange={async () => { try { await api.updateTodo(todo.id, { title: todo.title, completed: !todo.completedAt }); } catch (error) { toast.error(error instanceof Error ? error.message : '更新失败'); } }} /><span className="min-w-0 flex-1 truncate">{todo.title}</span>{todo.completedAt && <Check className="size-4" />}</div>
              ))}
            </div>
          </section>
          {isMobile && <button className="todo-bubble-backdrop" aria-label="关闭快捷待办" onClick={() => setOpen(false)} />}
        </div>
      )}
      {!open && (
        <button
          type="button"
          className="todo-bubble-button"
          aria-label="打开快捷待办；桌面端可拖动位置"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onKeyDown={moveByKeyboard}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(true); }}
        >
          <ListTodo />
          {summary.overdueCount > 0 && <span className="todo-bubble-badge">{summary.overdueCount}</span>}
        </button>
      )}
    </div>
  );
}
