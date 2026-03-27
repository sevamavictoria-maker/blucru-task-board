export interface TaskFilterState {
  department: string
  project: string
  urgency: string
  assignee: string
  showCompleted: boolean
  groupBy: 'status' | 'department' | 'project' | 'urgency'
}

interface TaskFiltersProps {
  filters: TaskFilterState
  onChange: (update: Partial<TaskFilterState>) => void
  departments: string[]
  projects: { id: string; name: string }[]
  users: { id: string; full_name: string }[]
}

const urgencyOptions: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'priority', label: 'Priority Only' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'scheduled', label: 'Scheduled' },
]

const groupByOptions: { value: TaskFilterState['groupBy']; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'department', label: 'Department' },
  { value: 'project', label: 'Project' },
  { value: 'urgency', label: 'Urgency' },
]

const selectClass =
  'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

export default function TaskFilters({
  filters,
  onChange,
  departments,
  projects,
  users,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Department */}
      <select
        value={filters.department}
        onChange={(e) => onChange({ department: e.target.value })}
        className={selectClass}
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* Project */}
      <select
        value={filters.project}
        onChange={(e) => onChange({ project: e.target.value })}
        className={selectClass}
      >
        <option value="">All Projects</option>
        <option value="none">None</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Urgency */}
      <select
        value={filters.urgency}
        onChange={(e) => onChange({ urgency: e.target.value })}
        className={selectClass}
      >
        {urgencyOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Assignee */}
      <select
        value={filters.assignee}
        onChange={(e) => onChange({ assignee: e.target.value })}
        className={selectClass}
      >
        <option value="">All</option>
        <option value="me">Me</option>
        <option value="unassigned">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div className="hidden h-6 w-px bg-gray-200 sm:block" />

      {/* Show completed toggle */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={filters.showCompleted}
          onChange={(e) => onChange({ showCompleted: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 accent-brand-600"
        />
        Show completed
      </label>

      {/* Divider */}
      <div className="hidden h-6 w-px bg-gray-200 sm:block" />

      {/* Group By */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">Group by:</span>
        <select
          value={filters.groupBy}
          onChange={(e) =>
            onChange({ groupBy: e.target.value as TaskFilterState['groupBy'] })
          }
          className={selectClass}
        >
          {groupByOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
