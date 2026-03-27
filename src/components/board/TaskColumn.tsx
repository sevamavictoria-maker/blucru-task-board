import type { Task, TaskStatus } from '@/types/database'
import TaskCard from '@/components/board/TaskCard'

interface TaskColumnProps {
  status: TaskStatus
  label: string
  color: string
  bg: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

export default function TaskColumn({
  status,
  label,
  color,
  bg,
  tasks,
  onTaskClick,
}: TaskColumnProps) {
  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50/60">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: bg, color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
        <span className="ml-auto text-xs font-medium text-gray-400">
          {tasks.length}
        </span>
      </div>

      {/* Scrollable task list */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">
            No tasks
          </p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  )
}
