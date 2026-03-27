import type { Task, TaskStatus } from '@/types/database'
import { STATUS_COLUMNS } from '@/lib/constants'
import TaskCard from '@/components/board/TaskCard'

/* ── Props ──────────────────────────────────────────────────────────── */

interface TaskColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDeleteTask?: (task: Task) => void
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function TaskColumn({ status, tasks, onTaskClick, onDeleteTask }: TaskColumnProps) {
  const col = STATUS_COLUMNS.find((c) => c.value === status)
  const label = col?.label ?? status
  const colorClass = col?.color ?? 'text-gray-600'
  const bgClass = col?.bg ?? 'bg-gray-100'

  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50/60">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${bgClass} ${colorClass}`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${bgClass.replace('bg-', 'bg-').replace('100', '500').replace('bg-gray-500', 'bg-gray-400')}`}
            style={{ backgroundColor: 'currentColor' }}
          />
          {label}
        </span>
        <span className="ml-auto text-xs font-medium text-gray-400">
          {tasks.length}
        </span>
      </div>

      {/* Scrollable task list */}
      <div
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">No tasks</p>
        )}
        {[...tasks].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999)).map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  )
}
