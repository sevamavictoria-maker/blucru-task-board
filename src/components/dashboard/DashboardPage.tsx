import { useMemo } from 'react'
import {
  CheckCircle2,
  ListTodo,
  Loader2,
  AlertTriangle,
  Repeat,
  Calendar,
} from 'lucide-react'
import { isAfter, isBefore, addDays, parseISO, format } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { STATUS_COLUMNS, DEPARTMENTS } from '@/lib/constants'
import type { Task, TaskStatus } from '@/types/database'

const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  inbox: 'bg-gray-400',
  assigned: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
}

export default function DashboardPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: users = [] } = useUsers()

  const now = useMemo(() => new Date(), [])
  const weekFromNow = useMemo(() => addDays(now, 7), [now])

  const metrics = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'done').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const overdue = tasks.filter(
      (t) => t.due_date && t.status !== 'done' && isBefore(parseISO(t.due_date), now),
    ).length
    const recurring = tasks.filter((t) => t.recurring_frequency !== null).length
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, completionPct, inProgress, overdue, recurring }
  }, [tasks, now])

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      inbox: 0,
      assigned: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    }
    for (const t of tasks) counts[t.status]++
    return counts
  }, [tasks])

  const departmentStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>()
    for (const dept of DEPARTMENTS) map.set(dept, { total: 0, completed: 0 })
    for (const t of tasks) {
      const entry = map.get(t.department) ?? { total: 0, completed: 0 }
      entry.total++
      if (t.status === 'done') entry.completed++
      map.set(t.department, entry)
    }
    return Array.from(map.entries())
      .map(([dept, stats]) => ({ department: dept, ...stats }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [tasks])

  const teamWorkload = useMemo(() => {
    const map = new Map<string, { name: string; active: number; highUrgency: number }>()
    for (const user of users) {
      map.set(user.id, { name: user.full_name ?? user.email, active: 0, highUrgency: 0 })
    }
    for (const t of tasks) {
      if (!t.assignee_id || t.status === 'done') continue
      const entry = map.get(t.assignee_id)
      if (entry) {
        entry.active++
        if (t.urgency === 'high') entry.highUrgency++
      }
    }
    return Array.from(map.values())
      .filter((u) => u.active > 0)
      .sort((a, b) => b.active - a.active)
  }, [tasks, users])

  const upcomingThisWeek = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.due_date &&
          t.status !== 'done' &&
          isAfter(parseISO(t.due_date), now) &&
          isBefore(parseISO(t.due_date), weekFromNow),
      )
      .sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime())
  }, [tasks, now, weekFromNow])

  if (tasksLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  const maxStatus = Math.max(...Object.values(statusCounts), 1)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          icon={ListTodo}
          label="Total Tasks"
          value={metrics.total}
          color="text-brand-600"
          bg="bg-brand-50"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completed"
          value={`${metrics.completed} (${metrics.completionPct}%)`}
          color="text-green-600"
          bg="bg-green-50"
        />
        <MetricCard
          icon={Loader2}
          label="In Progress"
          value={metrics.inProgress}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Overdue"
          value={metrics.overdue}
          color="text-red-600"
          bg="bg-red-50"
        />
        <MetricCard
          icon={Repeat}
          label="Recurring"
          value={metrics.recurring}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Status Distribution
          </h3>
          <div className="space-y-3">
            {STATUS_COLUMNS.map((col) => {
              const count = statusCounts[col.value]
              const pct = maxStatus > 0 ? (count / maxStatus) * 100 : 0
              return (
                <div key={col.value} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-600">{col.label}</span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_BAR_COLORS[col.value]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Department Breakdown
          </h3>
          {departmentStats.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">Tasks</th>
                  <th className="pb-2 text-right">Completed</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((d) => (
                  <tr key={d.department} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-700">{d.department}</td>
                    <td className="py-2 text-right text-gray-600">{d.total}</td>
                    <td className="py-2 text-right text-green-600">{d.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Team Workload */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Team Workload
          </h3>
          {teamWorkload.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No active assignments</p>
          ) : (
            <div className="space-y-2">
              {teamWorkload.map((user) => (
                <div
                  key={user.name}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {user.active} active
                    </span>
                    {user.highUrgency > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertTriangle size={12} />
                        {user.highUrgency} high
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming This Week */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Upcoming This Week
          </h3>
          {upcomingThisWeek.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No upcoming tasks</p>
          ) : (
            <div className="space-y-2">
              {upcomingThisWeek.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-700">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {task.assignee?.full_name ?? 'Unassigned'}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={12} />
                    {format(parseISO(task.due_date!), 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof ListTodo
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
