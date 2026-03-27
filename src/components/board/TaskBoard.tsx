import { useState, useMemo } from 'react'
import {
  Plus,
  CalendarDays,
  CalendarRange,
  Calendar,
} from 'lucide-react'
import {
  isToday,
  isThisWeek,
  isThisMonth,
} from 'date-fns'
import type { Task, TaskStatus } from '@/types/database'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import TaskFilters from '@/components/board/TaskFilters'
import type { TaskFilterState } from '@/components/board/TaskFilters'
import TaskColumn from '@/components/board/TaskColumn'
import TaskCard from '@/components/board/TaskCard'
import TaskFormModal from '@/components/board/TaskFormModal'
import TaskDetailModal from '@/components/task-detail/TaskDetailModal'

/* ── Column definitions ────────────────────────────────────────────── */

const columns: {
  status: TaskStatus
  label: string
  color: string
  bg: string
}[] = [
  { status: 'inbox', label: 'Inbox', color: '#6b7280', bg: '#f3f4f6' },
  { status: 'assigned', label: 'Assigned', color: '#2563eb', bg: '#dbeafe' },
  {
    status: 'in_progress',
    label: 'In Progress',
    color: '#d97706',
    bg: '#fef3c7',
  },
  { status: 'review', label: 'Review', color: '#7c3aed', bg: '#ede9fe' },
  { status: 'done', label: 'Done', color: '#16a34a', bg: '#dcfce7' },
]

type WhatsNext = 'all' | 'today' | 'week' | 'month'

/* ── Component ─────────────────────────────────────────────────────── */

export default function TaskBoard() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()
  const { session } = useAuth()
  const updateTask = useUpdateTask()

  /* Filters */
  const [filters, setFilters] = useState<TaskFilterState>({
    department: '',
    project: '',
    urgency: '',
    assignee: '',
    showCompleted: false,
    groupBy: 'status',
  })

  const updateFilters = (update: Partial<TaskFilterState>) =>
    setFilters((prev) => ({ ...prev, ...update }))

  /* What's Next */
  const [whatsNext, setWhatsNext] = useState<WhatsNext>('all')

  /* Modals */
  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  /* Derived data */
  const departments = useMemo(
    () => [...new Set(tasks.map((t: Task) => t.department))].sort(),
    [tasks],
  )

  /* ── Filtering ─────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    const userId = session?.user?.id
    let list = [...tasks]

    // Hide completed unless toggled on
    if (!filters.showCompleted) {
      list = list.filter((t) => t.status !== 'done')
    }

    // Department
    if (filters.department) {
      list = list.filter((t) => t.department === filters.department)
    }

    // Project
    if (filters.project === 'none') {
      list = list.filter((t) => !t.project_id)
    } else if (filters.project) {
      list = list.filter((t) => t.project_id === filters.project)
    }

    // Urgency
    if (filters.urgency === 'priority') {
      list = list.filter((t) => t.urgency === 'high')
    } else if (filters.urgency) {
      list = list.filter((t) => t.urgency === filters.urgency)
    }

    // Assignee
    if (filters.assignee === 'me') {
      list = list.filter((t) => t.assignee_id === userId)
    } else if (filters.assignee === 'unassigned') {
      list = list.filter((t) => !t.assignee_id)
    } else if (filters.assignee) {
      list = list.filter((t) => t.assignee_id === filters.assignee)
    }

    // What's Next time window
    if (whatsNext !== 'all') {
      list = list.filter((t) => {
        if (!t.due_date) return false
        const d = new Date(t.due_date)
        if (whatsNext === 'today') return isToday(d)
        if (whatsNext === 'week') return isThisWeek(d, { weekStartsOn: 1 })
        if (whatsNext === 'month') return isThisMonth(d)
        return true
      })
    }

    return list
  }, [tasks, filters, whatsNext, session?.user?.id])

  /* ── Grouping ──────────────────────────────────────────────────── */

  const grouped = useMemo(() => {
    if (filters.groupBy === 'status') return null // use columns instead

    const map = new Map<string, Task[]>()
    for (const t of filtered) {
      let key: string
      switch (filters.groupBy) {
        case 'department':
          key = t.department
          break
        case 'project':
          key = t.project?.name ?? 'No Project'
          break
        case 'urgency':
          key = t.urgency
          break
        default:
          key = 'Other'
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [filtered, filters.groupBy])

  /* ── Handlers ──────────────────────────────────────────────────── */

  const handleTaskClick = (task: Task) => setDetailTask(task)

  const handleStatusChange = (status: TaskStatus) => {
    if (detailTask) {
      updateTask.mutate({ id: detailTask.id, status })
      setDetailTask({ ...detailTask, status })
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditTask(null)
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Task Board</h1>

        <div className="flex items-center gap-2">
          {/* What's Next toggles */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
            {(
              [
                { key: 'all', label: 'All', icon: null },
                { key: 'today', label: 'Today', icon: CalendarDays },
                { key: 'week', label: 'This Week', icon: CalendarRange },
                { key: 'month', label: 'This Month', icon: Calendar },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setWhatsNext(key)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  whatsNext === key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {Icon && <Icon size={14} />}
                {label}
              </button>
            ))}
          </div>

          {/* Create button */}
          <button
            onClick={() => {
              setEditTask(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onChange={updateFilters}
        departments={departments}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        users={users.map((u) => ({ id: u.id, full_name: u.full_name ?? u.email }))}
      />

      {/* Loading state */}
      {tasksLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      )}

      {/* Board / Grouped view */}
      {!tasksLoading && filters.groupBy === 'status' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns
            .filter((col) => filters.showCompleted || col.status !== 'done')
            .map((col) => (
              <TaskColumn
                key={col.status}
                status={col.status}
                label={col.label}
                color={col.color}
                bg={col.bg}
                tasks={filtered.filter((t) => t.status === col.status)}
                onTaskClick={handleTaskClick}
              />
            ))}
          {/* Show done column when showCompleted is on — already included above */}
        </div>
      )}

      {!tasksLoading && filters.groupBy !== 'status' && grouped && (
        <div className="space-y-6">
          {[...grouped.entries()].map(([group, groupTasks]) => (
            <div key={group}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="capitalize">{group}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {groupTasks.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!tasksLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-sm text-gray-500">No tasks match your filters.</p>
          <button
            onClick={() => {
              setEditTask(null)
              setFormOpen(true)
            }}
            className="mt-3 text-sm font-medium text-brand-600 hover:underline"
          >
            Create a task
          </button>
        </div>
      )}

      {/* Modals */}
      {formOpen && (
        <TaskFormModal
          task={editTask}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
