import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  CalendarDays,
  CalendarRange,
  Calendar,
  FileStack,
  Loader2,
} from 'lucide-react'
import { isToday, isThisWeek, isThisMonth } from 'date-fns'
import type { Task, TaskStatus } from '@/types/database'
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useUsers'
import { useSopTemplates } from '@/hooks/useSops'
import { useAuth } from '@/hooks/useAuth'
import { useCreateNotification } from '@/hooks/useNotifications'
import { useAddActivity } from '@/hooks/useTaskActivity'
import { STATUS_COLUMNS, URGENCY_OPTIONS, DEPARTMENTS } from '@/lib/constants'
import TaskColumn from '@/components/board/TaskColumn'
import TaskCard from '@/components/board/TaskCard'
import TaskFormModal from '@/components/board/TaskFormModal'
import TaskDetailModal from '@/components/task-detail/TaskDetailModal'

/* ── Types ──────────────────────────────────────────────────────────── */

type WhatsNext = 'all' | 'today' | 'week' | 'month'
type GroupBy = 'status' | 'person' | 'project'

interface Filters {
  person: string
  project: string
  status: string
  urgency: string
}

const WHATS_NEXT_OPTIONS = [
  { key: 'all' as const, label: 'All', icon: null },
  { key: 'today' as const, label: 'Today', icon: CalendarDays },
  { key: 'week' as const, label: 'This Week', icon: CalendarRange },
  { key: 'month' as const, label: 'This Month', icon: Calendar },
]

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'person', label: 'Person' },
  { value: 'project', label: 'Project' },
]

/* ── Component ──────────────────────────────────────────────────────── */

export default function TaskBoard() {
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()
  const { data: sopTemplates = [] } = useSopTemplates()
  const { session, profile } = useAuth()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const createProject = useCreateProject()
  const createNotification = useCreateNotification()
  const addActivity = useAddActivity()

  /* State */
  const [filters, setFilters] = useState<Filters>({
    person: '',
    project: '',
    status: '',
    urgency: '',
  })
  const [whatsNext, setWhatsNext] = useState<WhatsNext>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [sopDropdownOpen, setSopDropdownOpen] = useState(false)
  const [sopCreating, setSopCreating] = useState(false)

  const userId = session?.user?.id
  const currentUserName = profile?.full_name ?? session?.user?.email ?? 'Someone'

  /* ── Filtering ────────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let list = [...tasks]

    // Person filter
    if (filters.person === 'unassigned') {
      list = list.filter((t) => !t.assignee_id)
    } else if (filters.person) {
      list = list.filter((t) => t.assignee_id === filters.person)
    }

    // Project filter
    if (filters.project === 'none') {
      list = list.filter((t) => !t.project_id)
    } else if (filters.project) {
      list = list.filter((t) => t.project_id === filters.project)
    }

    // Status filter
    if (filters.status) {
      list = list.filter((t) => t.status === filters.status)
    }

    // Urgency filter
    if (filters.urgency) {
      list = list.filter((t) => t.urgency === filters.urgency)
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
  }, [tasks, filters, whatsNext])

  /* ── Grouping ─────────────────────────────────────────────────────── */

  const groupedByPerson = useMemo(() => {
    if (groupBy !== 'person') return null
    const map = new Map<string, { label: string; tasks: Task[] }>()
    for (const t of filtered) {
      const key = t.assignee_id ?? '__unassigned__'
      const label = t.assignee?.full_name ?? t.assignee?.email ?? 'Unassigned'
      if (!map.has(key)) map.set(key, { label, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    return [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label))
  }, [filtered, groupBy])

  const groupedByProject = useMemo(() => {
    if (groupBy !== 'project') return null
    const map = new Map<string, { label: string; tasks: Task[] }>()
    for (const t of filtered) {
      const key = t.project_id ?? '__none__'
      const label = t.project?.name ?? 'No Project'
      if (!map.has(key)) map.set(key, { label, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    return [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label))
  }, [filtered, groupBy])

  /* ── Handlers ─────────────────────────────────────────────────────── */

  const handleTaskClick = useCallback((task: Task) => setDetailTask(task), [])

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      const oldStatus = task.status
      updateTask.mutate({ id: taskId, status: newStatus })

      if (userId) {
        addActivity.mutate({
          task_id: taskId,
          type: 'status_change',
          user_id: userId,
          data: { from: oldStatus, to: newStatus },
        })
      }

      if (task.assignee_id && task.assignee_id !== userId) {
        createNotification.mutate({
          user_id: task.assignee_id,
          task_id: taskId,
          type: 'status_change',
          message: `${currentUserName} changed "${task.title}" to ${STATUS_COLUMNS.find((c) => c.value === newStatus)?.label ?? newStatus}`,
        })
      }

      // Update detailTask in state so modal reflects the change
      if (detailTask?.id === taskId) {
        setDetailTask((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    },
    [tasks, userId, currentUserName, updateTask, addActivity, createNotification, detailTask],
  )

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setEditTask(null)
  }, [])

  /* ── SOP Template handler ─────────────────────────────────────────── */

  const handleSopSelect = useCallback(
    async (templateId: string) => {
      const template = sopTemplates.find((s) => s.id === templateId)
      if (!template?.tasks?.length) return

      const projectName = window.prompt(
        `Enter a project name for the SOP "${template.name}":`,
      )
      if (!projectName?.trim()) return

      setSopDropdownOpen(false)
      setSopCreating(true)

      try {
        const newProject = await createProject.mutateAsync({
          name: projectName.trim(),
          department: template.department,
          color: null,
          status: 'new' as TaskStatus,
          sop_template_id: template.id,
          external_links: [],
        })

        for (const step of template.tasks) {
          await createTask.mutateAsync({
            title: step.title,
            description: null,
            department: template.department,
            project_id: newProject.id,
            urgency: step.default_urgency,
            status: 'new' as TaskStatus,
            assignee_id: null,
            assigned_by: null,
            due_date: null,
            tags: [],
            file_links: [],
            sequence: step.sequence,
            recurring_frequency: null,
            recurring_auto_create: false,
            recurring_parent_id: null,
          })
        }
      } catch {
        // errors surfaced via react-query
      } finally {
        setSopCreating(false)
      }
    },
    [sopTemplates, createProject, createTask],
  )

  /* ── Select class ─────────────────────────────────────────────────── */

  const selectClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Task Board</h1>

        <div className="flex items-center gap-2">
          {/* What's Next toggles */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
            {WHATS_NEXT_OPTIONS.map(({ key, label, icon: Icon }) => (
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

          {/* SOP Template button */}
          <div className="relative">
            <button
              onClick={() => setSopDropdownOpen((v) => !v)}
              disabled={sopCreating}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {sopCreating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileStack size={16} />
              )}
              {sopCreating ? 'Creating...' : 'Use SOP Template'}
            </button>

            {sopDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSopDropdownOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  {sopTemplates.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      No SOP templates found
                    </p>
                  ) : (
                    sopTemplates.map((sop) => (
                      <button
                        key={sop.id}
                        onClick={() => handleSopSelect(sop.id)}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <span className="font-medium">{sop.name}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {sop.department} &middot; {sop.tasks?.length ?? 0} steps
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* New Task button */}
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

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        {/* Person */}
        <select
          value={filters.person}
          onChange={(e) => setFilters((f) => ({ ...f, person: e.target.value }))}
          className={selectClass}
        >
          <option value="">All People</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.email}
            </option>
          ))}
        </select>

        {/* Project */}
        <select
          value={filters.project}
          onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
          className={selectClass}
        >
          <option value="">All Projects</option>
          <option value="none">No Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          {STATUS_COLUMNS.map((col) => (
            <option key={col.value} value={col.value}>
              {col.label}
            </option>
          ))}
        </select>

        {/* Urgency */}
        <select
          value={filters.urgency}
          onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
          className={selectClass}
        >
          <option value="">All Urgencies</option>
          {URGENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-gray-200 sm:block" />

        {/* Group By */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Group by:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className={selectClass}
          >
            {GROUP_BY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {tasksLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {tasksError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
          Failed to load tasks. Please try refreshing the page.
        </div>
      )}

      {/* ── Kanban columns (grouped by status) ──────────────────────── */}
      {!tasksLoading && !tasksError && groupBy === 'status' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => (
            <TaskColumn
              key={col.value}
              status={col.value}
              tasks={filtered.filter((t) => t.status === col.value)}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      )}

      {/* ── Grouped by Person ───────────────────────────────────────── */}
      {!tasksLoading && !tasksError && groupBy === 'person' && groupedByPerson && (
        <div className="space-y-6">
          {groupedByPerson.map(([key, group]) => (
            <div key={key}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span>{group.label}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {group.tasks.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.tasks.map((task) => (
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

      {/* ── Grouped by Project (bucket view) ────────────────────────── */}
      {!tasksLoading && !tasksError && groupBy === 'project' && groupedByProject && (
        <div className="space-y-6">
          {groupedByProject.map(([key, group]) => {
            const project = projects.find((p) => p.id === key)
            const projectStatus = project ? STATUS_COLUMNS.find((c) => c.value === project.status) : null
            const doneCount = group.tasks.filter((t) => t.status === 'done').length
            const totalCount = group.tasks.length
            const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
            const hasOverdue = group.tasks.some(
              (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done',
            )

            return (
              <div
                key={key}
                className={`rounded-xl border bg-white shadow-sm ${
                  hasOverdue ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                {/* Project header */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-gray-900">{group.label}</h2>
                        {projectStatus && (
                          <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${projectStatus.bg} ${projectStatus.color}`}>
                            {projectStatus.label}
                          </span>
                        )}
                        {hasOverdue && (
                          <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600">
                            Overdue
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {doneCount}/{totalCount} done
                        </span>
                      </div>
                      {project?.description && (
                        <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                      )}
                      {project?.department && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-brand-50 text-brand-700">
                          {project.department}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="shrink-0 w-24 pt-1">
                      <div className="text-xs text-right text-gray-500 mb-1">{progressPct}%</div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${hasOverdue ? 'bg-red-500' : 'bg-brand-600'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Tasks grid */}
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!tasksLoading && !tasksError && filtered.length === 0 && (
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

      {/* ── Modals ──────────────────────────────────────────────────── */}
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
