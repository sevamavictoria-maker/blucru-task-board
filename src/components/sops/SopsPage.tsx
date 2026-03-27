import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ListChecks, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { SopTemplate, TaskUrgency } from '@/types/database'
import { useSopTemplates, useDeleteSopTemplate, useCreateSopTemplate, useCreateSopTask } from '@/hooks/useSops'
import { URGENCY_OPTIONS } from '@/lib/constants'
import SopFormModal from './SopFormModal'

export default function SopsPage() {
  const { data: templates = [], isLoading, error } = useSopTemplates()
  const deleteMutation = useDeleteSopTemplate()
  const createTemplate = useCreateSopTemplate()
  const createTask = useCreateSopTask()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SopTemplate | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      if (rows.length === 0) {
        alert('No data found in file.')
        return
      }

      // Prompt for template name
      const templateName = window.prompt('Enter SOP template name:', file.name.replace(/\.(xlsx|xls|csv)$/i, ''))
      if (!templateName) return

      const department = window.prompt('Enter department:', 'Operations') || 'Operations'

      // Create the template
      const template = await createTemplate.mutateAsync({
        name: templateName,
        department,
        description: `Imported from ${file.name}`,
      })

      // Parse and create steps
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        // Support various column name formats
        const title = String(row['Task Title'] || row['Title'] || row['task_title'] || row['title'] || row['Step Name'] || row['step_name'] || '')
        const duration = Number(row['Duration (days)'] || row['Duration'] || row['duration_days'] || row['duration'] || 0)
        const rawUrgency = String(row['Urgency'] || row['urgency'] || row['default_urgency'] || 'medium').toLowerCase()
        const urgency = (['high', 'medium', 'low', 'scheduled'].includes(rawUrgency) ? rawUrgency : 'medium') as TaskUrgency
        const sequence = Number(row['Step'] || row['step'] || row['Sequence'] || row['sequence'] || row['#'] || (i + 1))

        if (!title) continue

        await createTask.mutateAsync({
          sop_template_id: template.id,
          sequence,
          title,
          duration_days: duration || null,
          default_urgency: urgency,
        })
      }

      alert(`Imported "${templateName}" with ${rows.length} steps successfully.`)
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function openCreate() {
    setEditingTemplate(null)
    setFormOpen(true)
  }

  function openEdit(template: SopTemplate) {
    setEditingTemplate(template)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingTemplate(null)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this SOP template and all its steps?')) return
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      if (expandedId === id) setExpandedId(null)
    } catch {
      // handled by react-query
    } finally {
      setDeletingId(null)
    }
  }

  function getUrgencyBadge(urgency: string) {
    const opt = URGENCY_OPTIONS.find((o) => o.value === urgency)
    if (!opt) return null
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${opt.bg} ${opt.color}`}
      >
        {opt.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-sm text-red-600">
          Failed to load SOP templates. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">SOP Templates</h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {templates.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 shadow-sm transition-colors hover:bg-brand-100 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={16} />
            {importing ? 'Importing...' : 'Upload Excel/CSV'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>
      </div>

      {/* Empty state */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <ListChecks size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No SOP templates yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create your first template to standardize recurring procedures.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const isExpanded = expandedId === tpl.id
            const stepCount = tpl.tasks?.length ?? 0
            const isDeleting = deletingId === tpl.id

            return (
              <div
                key={tpl.id}
                className={`rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
                  isExpanded
                    ? 'col-span-full border-brand-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Card top */}
                <div
                  className="cursor-pointer px-5 py-4"
                  onClick={() => toggleExpand(tpl.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="flex-shrink-0 text-gray-400" />
                        )}
                        <h3 className="truncate text-sm font-bold text-gray-900">
                          {tpl.name}
                        </h3>
                      </div>
                      {tpl.description && (
                        <p className="mt-1 line-clamp-2 pl-6 text-xs text-gray-500">
                          {tpl.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(tpl)
                        }}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-600"
                        title="Edit template"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(tpl.id)
                        }}
                        disabled={isDeleting}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        title="Delete template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="mt-3 flex items-center gap-2 pl-6">
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">
                      {tpl.department}
                    </span>
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                    </span>
                  </div>
                </div>

                {/* Expanded steps */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {stepCount === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-400">
                        No steps defined for this template.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {tpl.tasks!.map((step) => (
                          <li
                            key={step.id}
                            className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                          >
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                              {step.sequence}
                            </span>
                            <span className="flex-1 text-sm font-medium text-gray-700">
                              {step.title}
                            </span>
                            {step.duration_days != null && (
                              <span className="text-xs text-gray-400">
                                {step.duration_days}d
                              </span>
                            )}
                            {getUrgencyBadge(step.default_urgency)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <SopFormModal template={editingTemplate} onClose={closeForm} />
      )}
    </div>
  )
}
