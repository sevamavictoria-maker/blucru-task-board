import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { DEPARTMENTS } from '@/lib/constants'
import type { Profile } from '@/types/database'

interface UserStats {
  user: Profile
  total: number
  completed: number
  rate: number
  active: number
}

export default function ReportsPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: users = [] } = useUsers()

  const userStats = useMemo<UserStats[]>(() => {
    const map = new Map<string, UserStats>()
    for (const user of users) {
      map.set(user.id, { user, total: 0, completed: 0, rate: 0, active: 0 })
    }
    for (const t of tasks) {
      if (!t.assignee_id) continue
      const entry = map.get(t.assignee_id)
      if (!entry) continue
      entry.total++
      if (t.status === 'done') {
        entry.completed++
      } else {
        entry.active++
      }
    }
    for (const entry of map.values()) {
      entry.rate = entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0
    }
    return Array.from(map.values()).filter((s) => s.total > 0)
  }, [tasks, users])

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
      .map(([dept, stats]) => ({
        department: dept,
        ...stats,
        rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.rate - a.rate)
  }, [tasks])

  const topPerformers = useMemo(() => {
    return [...userStats].sort((a, b) => b.rate - a.rate || b.completed - a.completed)
  }, [userStats])

  const kpis = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'done').length
    const active = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // On-time: completed tasks that had a due date and were completed (simplified -
    // we don't track completion date, so we use tasks done that have a due date)
    const completedWithDue = tasks.filter((t) => t.status === 'done' && t.due_date)
    const onTimeRate =
      completedWithDue.length > 0
        ? Math.round(
            (completedWithDue.filter(
              (t) => new Date(t.updated_at) <= new Date(t.due_date!),
            ).length /
              completedWithDue.length) *
              100,
          )
        : 0

    // Team utilization: avg tasks per user who has any assignment
    const activeUsers = userStats.filter((s) => s.total > 0)
    const avgUtilization =
      activeUsers.length > 0
        ? Math.round(activeUsers.reduce((sum, s) => sum + s.active, 0) / activeUsers.length)
        : 0

    return { completionRate, onTimeRate, avgUtilization, active }
  }, [tasks, userStats])

  if (tasksLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* KPI Header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white shadow-lg">
        <h2 className="mb-4 text-lg font-bold">Team KPIs</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <KpiItem label="Completion Rate" value={`${kpis.completionRate}%`} />
          <KpiItem label="On-Time %" value={`${kpis.onTimeRate}%`} />
          <KpiItem
            label="Avg. Utilization"
            value={`${kpis.avgUtilization} tasks`}
          />
          <KpiItem label="Active Tasks" value={kpis.active} />
        </div>
      </div>

      {/* Individual Performance Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Individual Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="pb-2 pr-4">Team Member</th>
                <th className="pb-2 pr-4 text-right">Total</th>
                <th className="pb-2 pr-4 text-right">Completed</th>
                <th className="pb-2 pr-4 text-right">Rate</th>
                <th className="pb-2 text-right">Active</th>
              </tr>
            </thead>
            <tbody>
              {userStats
                .sort((a, b) => b.rate - a.rate)
                .map((s) => (
                  <tr key={s.user.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-700">
                      {s.user.full_name ?? s.user.email}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-600">{s.total}</td>
                    <td className="py-2.5 pr-4 text-right text-green-600">{s.completed}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-brand-600">
                      {s.rate}%
                    </td>
                    <td className="py-2.5 text-right text-amber-600">{s.active}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Performance */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Department Performance
          </h3>
          <div className="space-y-4">
            {departmentStats.map((d) => (
              <div key={d.department}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{d.department}</span>
                  <span className="font-semibold text-brand-600">{d.rate}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${d.rate}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {d.completed} of {d.total} completed
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Top Performers
          </h3>
          {topPerformers.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((s, idx) => {
                let medalColor = ''
                let medalBg = ''
                if (idx === 0) {
                  medalColor = 'text-yellow-700'
                  medalBg = 'bg-yellow-50 border-yellow-200'
                } else if (idx === 1) {
                  medalColor = 'text-gray-500'
                  medalBg = 'bg-gray-50 border-gray-200'
                } else if (idx === 2) {
                  medalColor = 'text-amber-700'
                  medalBg = 'bg-amber-50 border-amber-200'
                }

                return (
                  <div
                    key={s.user.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      idx < 3 ? medalBg : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {idx < 3 ? (
                        <Trophy size={18} className={medalColor} />
                      ) : (
                        <span className="flex h-[18px] w-[18px] items-center justify-center text-xs font-bold text-gray-400">
                          {idx + 1}
                        </span>
                      )}
                      <span
                        className={`text-sm font-medium ${idx < 3 ? medalColor : 'text-gray-700'}`}
                      >
                        {s.user.full_name ?? s.user.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-brand-600">{s.rate}%</span>
                      <span className="text-xs text-gray-400">
                        {s.completed}/{s.total}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-white/70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
