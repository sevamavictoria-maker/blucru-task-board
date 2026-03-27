import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { SopTemplate, SopTemplateTask, TaskUrgency } from '@/types/database'
import {
  useCreateSopTemplate,
  useUpdateSopTemplate,
  useCreateSopTask,
  useUpdateSopTask,
  useDeleteSopTask,
} from '@/hooks/useSops'
import { DEPARTMENTS, URGENCY_OPTIONS } from '@/lib/constants'

interface SopFormModalProps {
  template: SopTemplate | null
  onClose: () => void
}

interface StepDraft {
  /** Existing task id, or null for new steps */
  existingId: string | null
  title: string
  durationHours: string
  urgency: TaskUrgency
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

function buildInitialSteps(template: SopTemplate | null): StepDraft[] {
  if (!template?.tasks?.length) return []
  return template.tasks.map((t) => ({
    existingId: t.id,
    title: t.title,
    durationHours: t.duration_hours?.toString() ?? '',
    urgency: t.default_urgency,
  }))
}

export default function SopFormModal({ template, onClose }: SopFormModalProps) {
  const isEdit = !!template

  const createTemplate = useCreateSopTemplate()
  const updateTemplate = useUpdateSopTemplate()
  const createTask = useCreateSopTask()
  const updateTask = useUpdateSopTask()
  const deleteTask = useDeleteSopTask()

  const [name, setName] = useState(template?.name ?? '')
  const [department, setDepartment] = useState(
    template?.department ?? (DEPARTMENTS[0] ?? '')
  )
  const [description, setDescription] = useState(template?.description ?? '')
  const [steps, setSteps] = useState<StepDraft[]>(buildInitialSteps(template))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Track which existing step IDs are still present so we can delete removed ones
  const originalStepIds = new Set(
    (template?.tasks ?? []).map((t) => t.id)
  )

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { existingId: null, title: '', durationHours: '', urgency: 'medium' },
    ])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateStepField<K extends keyof StepDraft>(
    index: number,
    field: K,
    value: StepDraft[K]
  ) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError('')

    try {
      // 1. Create or update the template
      let templateId: string

      if (isEdit && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: name.trim(),
          department,
          description: description.trim() || null,
        })
        templateId = template.id
      } else {
        const created = await createTemplate.mutateAsync({
          name: name.trim(),
          department,
          description: description.trim() || null,
        })
        templateId = created.id
      }

      // 2. Delete steps that were removed
      if (isEdit) {
        const currentExistingIds = new Set(
          steps.filter((s) => s.existingId).map((s) => s.existingId!)
        )
        const removedIds = [...originalStepIds].filter(
          (id) => !currentExistingIds.has(id)
        )
        await Promise.all(removedIds.map((id) => deleteTask.mutateAsync(id)))
      }

      // 3. Create or update each step
      await Promise.all(
        steps.map((step, index) => {
          const payload = {
            sequence: index + 1,
            title: step.title.trim(),
            duration_hours: step.durationHours ? parseInt(step.durationHours, 10) : null,
            default_urgency: step.urgency,
          }

          if (step.existingId) {
            return updateTask.mutateAsync({ id: step.existingId, ...payload })
          }
          return createTask.mutateAsync({
            sop_template_id: templateId,
            ...payload,
          })
        })
      )

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[6vh]">
      <div className="slide-in w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit SOP Template' : 'New SOP Template'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Employee Onboarding"
              required
              className={inputClass}
            />
          </div>

          {/* Department + Description */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputClass}
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
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this SOP..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Steps</h3>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No steps yet. Click "Add Step" to begin.
              </p>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                  >
                    {/* Sequence number */}
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {index + 1}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) =>
                          updateStepField(index, 'title', e.target.value)
                        }
                        placeholder="Step title"
                        required
                        className={inputClass}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
                            Duration (hours)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={step.durationHours}
                            onChange={(e) =>
                              updateStepField(index, 'durationHours', e.target.value)
                            }
                            placeholder="Optional"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
                            Urgency
                          </label>
                          <select
                            value={step.urgency}
                            onChange={(e) =>
                              updateStepField(
                                index,
                                'urgency',
                                e.target.value as TaskUrgency
                              )
                            }
                            className={inputClass}
                          >
                            {URGENCY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="mt-1 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove step"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
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
              disabled={saving || !name.trim()}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : isEdit
                  ? 'Update Template'
                  : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
