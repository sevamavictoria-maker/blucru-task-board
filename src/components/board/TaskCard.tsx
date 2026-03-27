import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import {
  User,
  CalendarDays,
  Repeat,
  FileSpreadsheet,
  FileText,
  Globe,
} from 'lucide-react'
import type { Task, ExternalLink as ExternalLinkType } from '@/types/database'
import { STATUS_COLUMNS } from '@/lib/constants'

/* ── Props ──────────────────────────────────────────────────────────── */

interface TaskCardProps {
  task: Task
  onClick: () => void
}

/* ── Config ─────────────────────────────────────────────────────────── */

const urgencyConfig: Record<string, { dot: string; text: string; label: string }> = {
  high: { dot: 'bg-red-500', text: 'text-red-700', label: 'High' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Medium' },
  low: { dot: 'bg-green-500', text: 'text-green-700', label: 'Low' },
  scheduled: { dot: 'bg-indigo-500', text: 'text-indigo-700', label: 'Scheduled' },
}

const frequencyAbbrev: Record<string, string> = {
  daily: 'D',
  weekly: 'W',
  monthly: 'M',
  'bi-monthly': '2M',
}

function linkIcon(type: ExternalLinkType['type']) {
  switch (type) {
    case 'excel':
    case 'sharepoint':
      return <FileSpreadsheet size={12} />
    case 'word':
      return <FileText size={12} />
    default:
      return <Globe size={12} />
  }
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const urgency = urgencyConfig[task.urgency] ?? urgencyConfig.low
  const statusCol = STATUS_COLUMNS.find((c) => c.value === task.status)
  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done'

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isOverdue ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
      }`}
    >
      {/* Top row: status pill + urgency dot + sequence badge */}
      <div className="mb-1.5 flex items-center gap-1.5">
        {/* Status pill */}
        {statusCol && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCol.bg} ${statusCol.color}`}
          >
            {statusCol.label}
          </span>
        )}

        {/* Urgency dot */}
        <span className={`inline-block h-2 w-2 rounded-full ${urgency.dot}`} />
        <span className={`text-xs font-medium ${urgency.text}`}>{urgency.label}</span>

        {/* Overdue badge */}
        {isOverdue && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            Overdue
          </span>
        )}

        {/* Sequence badge */}
        {task.sequence != null && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
            {task.sequence}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="mb-1 text-sm font-medium leading-snug text-gray-900">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-gray-500">{task.description}</p>
      )}

      {/* Badges row */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {/* Department */}
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          {task.department}
        </span>

        {/* Project */}
        {task.project && (
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
            {task.project.name}
          </span>
        )}

        {/* Recurring */}
        {task.recurring_frequency && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
            <Repeat size={10} />
            {frequencyAbbrev[task.recurring_frequency] ?? task.recurring_frequency}
          </span>
        )}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 ring-1 ring-gray-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: assignee, file links, due date */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {task.assignee ? (
            <>
              {task.assignee.avatar ? (
                <img
                  src={task.assignee.avatar}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-medium text-brand-700">
                  {(task.assignee.full_name ?? task.assignee.email)
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <span className="max-w-[80px] truncate">
                {task.assignee.full_name ?? task.assignee.email}
              </span>
            </>
          ) : (
            <>
              <User size={14} className="text-gray-400" />
              <span className="text-gray-400">Unassigned</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* File links on the task */}
          {task.file_links?.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={link.label || link.url}
              className="text-gray-400 transition-colors hover:text-brand-600"
            >
              {linkIcon(link.type)}
            </a>
          ))}

          {/* Due date */}
          {task.due_date && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                isOverdue ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <CalendarDays size={12} />
              {isToday(new Date(task.due_date))
                ? 'Today'
                : isPast(new Date(task.due_date))
                  ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true })
                  : format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
