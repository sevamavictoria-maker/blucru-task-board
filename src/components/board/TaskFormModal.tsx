import { useState } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import type {
  Task,
  TaskStatus,
  TaskUrgency,
  RecurringFrequency,
  ExternalLink,
} from '@/types/database'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useUsers'
import { useCreateNotification } from '@/hooks/useNotifications'
import { useAddActivity } from '@/hooks/useTaskActivity'
import { useAuth } from '@/hooks/useAuth'
import { STATUS_COLUMNS, URGENCY_OPTIONS, DEPARTMENTS } from '@/lib/constants'

/* ── Props ──────────────────────────────────────────────────────────── */

interface TaskFormModalProps {
  task: Task | null
  onClose: () => void
  onSave: () => void
}

/* ── Options ────────────────────────────────────────────────────────── */

const frequencyOptions: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-monthly', label: 'Bi-monthly' },
]

const linkTypeOptions: { value: ExternalLink['type']; label: string }[] = [
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'excel', label: 'Excel' },
  { value: 'word', label: 'Word' },
  { value: 'url', label: 'URL' },
]

const emptyLink: ExternalLink = { type: 'url', url: '', label: '' }

/* ── Component ──────────────────────────────────────────────────────── */

export default function TaskFormModal({ task, onClose, onSave }: TaskFormModalProps) {
  const isEdit = !!task
  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()
  const { session, profile } = useAuth()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const createNotification = useCreateNotification()
  const addActivity = useAddActivity()

  const userId = session?.user?.id
  const currentUserName = profile?.full_name ?? session?.user?.email ?? 'Someone'

  /* ── Form state ───────────────────────────────────────────────────── */

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [department, setDepartment] = useState(task?.department ?? (DEPARTMENTS[0] ?? ''))
  const [projectId, setProjectId] = useState(task?.project_id ?? '')
  const [urgency, setUrgency] = useState<TaskUrgency>(task?.urgency ?? 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'new')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [tagsText, setTagsText] = useState(task?.tags?.join(', ') ?? '')
  const [fileLinks, setFileLinks] = useState<ExternalLink[]>(task?.file_links ?? [])
  const [recurring, setRecurring] = useState(!!task?.recurring_frequency)
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    task?.recurring_frequency ?? 'weekly',
  )
  const [autoCreate, setAutoCreate] = useState(task?.recurring_auto_create ?? false)
  const [saving, setSaving] = useState(false)

  /* ── File links helpers ───────────────────────────────────────────── */

  function addLink() {
    setFileLinks((prev) => [...prev, { ...emptyLink }])
  }

  function removeLink(index: number) {
    setFileLinks((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLink(index: number, field: keyof ExternalLink, value: string) {
    setFileLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    )
  }

  /* ── Submit ───────────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    // Filter out empty file links
    const validLinks = fileLinks.filter((l) => l.url.trim())

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      department,
      project_id: projectId || null,
      urgency,
      status,
      assignee_id: assigneeId || null,
      assigned_by: assigneeId ? (userId ?? null) : null,
      due_date: dueDate || null,
      tags,
      file_links: validLinks,
      sequence: task?.sequence ?? null,
      recurring_frequency: recurring ? frequency : null,
      recurring_auto_create: recurring ? autoCreate : false,
      recurring_parent_id: task?.recurring_parent_id ?? null,
    }

    setSaving(true)
    try {
      if (isEdit && task) {
        const oldStatus = task.status
        const oldAssigneeId = task.assignee_id

        await updateTask.mutateAsync({ id: task.id, ...payload })

        // Activity for status change
        if (status !== oldStatus && userId) {
          addActivity.mutate({
            task_id: task.id,
            type: 'status_change',
            user_id: userId,
            data: { from: oldStatus, to: status },
          })
        }

        // Notification for assignee change
        if (assigneeId && assigneeId !== oldAssigneeId) {
          createNotification.mutate({
            user_id: assigneeId,
            task_id: task.id,
            type: 'assigned',
            message: `${currentUserName} assigned you to: ${title.trim()}`,
          })

          if (userId) {
            addActivity.mutate({
              task_id: task.id,
              type: 'assigned',
              user_id: userId,
              data: {
                assignee_id: assigneeId,
                assignee_name:
                  users.find((u) => u.id === assigneeId)?.full_name ?? 'someone',
              },
            })
          }
        }
      } else {
        const newTask = await createTask.mutateAsync(payload)

        // Activity for creation
        if (userId) {
          addActivity.mutate({
            task_id: newTask.id,
            type: 'created',
            user_id: userId,
            data: null,
          })
        }

        // Notification for initial assignee
        if (assigneeId && assigneeId !== userId) {
          createNotification.mutate({
            user_id: assigneeId,
            task_id: newTask.id,
            type: 'assigned',
            message: `${currentUserName} assigned you to: ${title.trim()}`,
          })
        }
      }

      onSave()
    } catch {
      // errors handled by react-query
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]">
      <div className="slide-in w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              className="input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Department + Project row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Urgency + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as TaskUrgency)}
                className="input"
              >
                {URGENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="input"
              >
                {STATUS_COLUMNS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="input"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Tags
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Comma-separated tags"
              className="input"
            />
            <p className="mt-1 text-[10px] text-gray-400">Separate tags with commas</p>
          </div>

          {/* File Links */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">File Links</label>
              <button
                type="button"
                onClick={addLink}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                <Plus size={14} />
                Add Link
              </button>
            </div>
            {fileLinks.length === 0 && (
              <p className="text-xs text-gray-400">No file links added</p>
            )}
            <div className="space-y-2">
              {fileLinks.map((link, i) => (
                <div key={i} className="flex items-start gap-2">
                  <select
                    value={link.type}
                    onChange={(e) =>
                      updateLink(i, 'type', e.target.value)
                    }
                    className="input w-28 shrink-0"
                  >
                    {linkTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(i, 'url', e.target.value)}
                    placeholder="https://..."
                    className="input flex-1"
                  />
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(i, 'label', e.target.value)}
                    placeholder="Label"
                    className="input w-24 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="mt-1.5 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-brand-600"
              />
              <span className="font-medium">Recurring task</span>
            </label>

            {recurring && (
              <div className="mt-3 flex flex-wrap items-center gap-3 pl-6">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                  className="input w-auto"
                >
                  {frequencyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoCreate}
                    onChange={(e) => setAutoCreate(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600"
                  />
                  Auto-create next
                </label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
