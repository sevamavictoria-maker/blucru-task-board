import { useState, useMemo } from 'react'
import { Plus, Pencil, Archive, ArchiveRestore, FolderOpen, Calendar, Users, Repeat } from 'lucide-react'
import { format, isPast } from 'date-fns'
import type { Project, TaskStatus } from '@/types/database'
import { useProjects, useUpdateProject, useCreateProject } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { STATUS_COLUMNS, DEPARTMENTS } from '@/lib/constants'

export default function ProjectsPage() {
  const [showArchived, setShowArchived] = useState(false)
  const { data: projects = [], isLoading } = useProjects(showArchived)
  const { data: tasks = [] } = useTasks()
  const { data: users = [] } = useUsers()
  const { session } = useAuth()
  const updateProject = useUpdateProject()
  const createProject = useCreateProject()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects])
  const archivedProjects = useMemo(() => projects.filter((p) => p.archived), [projects])

  function getProjectTasks(projectId: string) {
    return tasks.filter((t) => t.project_id === projectId)
  }

  function getAssignees(projectId: string) {
    const assigneeIds = new Set(
      getProjectTasks(projectId)
        .map((t) => t.assignee_id)
        .filter(Boolean),
    )
    return users.filter((u) => assigneeIds.has(u.id))
  }

  function handleArchive(project: Project) {
    if (!window.confirm(`Archive "${project.name}"? It will be hidden from the board.`)) return
    updateProject.mutate({ id: project.id, archived: true })
  }

  function handleRestore(project: Project) {
    updateProject.mutate({ id: project.id, archived: false })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{activeProjects.length} active projects</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-600"
            />
            Show archived
          </label>
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Active Projects */}
      {activeProjects.length === 0 && !showArchived ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FolderOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No projects yet</p>
          <p className="mt-1 text-xs text-gray-400">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={getProjectTasks(project.id)}
              assignees={getAssignees(project.id)}
              onEdit={() => { setEditing(project); setFormOpen(true) }}
              onArchive={() => handleArchive(project)}
            />
          ))}
        </div>
      )}

      {/* Archived */}
      {showArchived && archivedProjects.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pt-4">Archived</h2>
          <div className="space-y-4 opacity-70">
            {archivedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                tasks={getProjectTasks(project.id)}
                assignees={getAssignees(project.id)}
                onEdit={() => { setEditing(project); setFormOpen(true) }}
                onRestore={() => handleRestore(project)}
                archived
              />
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {formOpen && (
        <ProjectFormModal
          project={editing}
          userId={session?.user?.id ?? null}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSave={async (data) => {
            if (editing) {
              await updateProject.mutateAsync({ id: editing.id, ...data })
            } else {
              await createProject.mutateAsync(data as Parameters<typeof createProject.mutateAsync>[0])
            }
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/* ── Project Card ──────────────────────────────────────────────────── */

function ProjectCard({
  project,
  tasks,
  assignees,
  onEdit,
  onArchive,
  onRestore,
  archived,
}: {
  project: Project
  tasks: { id: string; status: string; due_date: string | null }[]
  assignees: { id: string; full_name: string | null; email: string }[]
  onEdit: () => void
  onArchive?: () => void
  onRestore?: () => void
  archived?: boolean
}) {
  const statusCol = STATUS_COLUMNS.find((c) => c.value === project.status)
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const totalCount = tasks.length
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const overdueCount = tasks.filter(
    (t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done',
  ).length
  const isOverdue = project.end_date && isPast(new Date(project.end_date)) && project.status !== 'done'

  return (
    <div className={`rounded-xl border bg-white shadow-sm ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Name + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-bold text-gray-900">{project.name}</h3>
              {statusCol && (
                <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${statusCol.bg} ${statusCol.color}`}>
                  {statusCol.label}
                </span>
              )}
              {isOverdue && (
                <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600">
                  Overdue
                </span>
              )}
              {project.recurring_auto_create && project.recurring_frequency && (
                <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 text-purple-700">
                  <Repeat size={10} />
                  {project.recurring_frequency}
                </span>
              )}
              {overdueCount > 0 && (
                <span className="text-[10px] text-red-500 font-medium">
                  {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <p className="text-sm text-gray-500 mb-2">{project.description}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                {project.department}
              </span>
              {project.creator && (
                <span>Created by {project.creator.full_name ?? project.creator.email}</span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {format(new Date(project.start_date), 'MMM d')}
                  {project.end_date && ` — ${format(new Date(project.end_date), 'MMM d, yyyy')}`}
                </span>
              )}
            </div>

            {/* Assignees */}
            {assignees.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Users size={12} className="text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {assignees.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                    >
                      {u.full_name ?? u.email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side: progress + actions */}
          <div className="shrink-0 text-right space-y-2">
            {/* Progress */}
            <div>
              <div className="text-xs text-gray-500 mb-1">{doneCount}/{totalCount} tasks</div>
              <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : 'bg-brand-600'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{progressPct}%</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={onEdit}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                title="Edit project"
              >
                <Pencil size={14} />
              </button>
              {archived ? (
                <button
                  onClick={onRestore}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                  title="Restore project"
                >
                  <ArchiveRestore size={14} />
                </button>
              ) : (
                <button
                  onClick={onArchive}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                  title="Archive project"
                >
                  <Archive size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Project Form Modal ────────────────────────────────────────────── */

function ProjectFormModal({
  project,
  userId,
  onClose,
  onSave,
}: {
  project: Project | null
  userId: string | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
}) {
  const isEdit = !!project

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [department, setDepartment] = useState(project?.department ?? DEPARTMENTS[0])
  const [status, setStatus] = useState<TaskStatus>(project?.status ?? 'new')
  const [startDate, setStartDate] = useState(project?.start_date ?? '')
  const [endDate, setEndDate] = useState(project?.end_date ?? '')
  const [recurringFrequency, setRecurringFrequency] = useState(project?.recurring_frequency ?? '')
  const [recurringAutoCreate, setRecurringAutoCreate] = useState(project?.recurring_auto_create ?? false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        department,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        recurring_frequency: recurringFrequency || null,
        recurring_auto_create: recurringAutoCreate,
        ...(isEdit ? {} : {
          color: null,
          sop_template_id: null,
          external_links: [],
          created_by: userId,
          archived: false,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]">
      <form onSubmit={handleSubmit} className="slide-in w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
              placeholder="e.g. Client Onboarding - Acme Corp"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input resize-y"
              placeholder="Project details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input">
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input">
                {STATUS_COLUMNS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </div>
          </div>

          {/* Recurring */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={recurringAutoCreate}
                onChange={(e) => setRecurringAutoCreate(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Recurring Project</span>
            </label>
            {recurringAutoCreate && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="input"
                >
                  <option value="">Select frequency...</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <p className="text-[10px] text-purple-600 mt-1">
                  When all tasks are done, a new copy of this project with all tasks and subtasks will be auto-created.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
