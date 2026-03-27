import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import {
  User,
  CalendarDays,
  Repeat,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Globe,
} from 'lucide-react'
import type { Task, ExternalLink as ExternalLinkType } from '@/types/database'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

const urgencyConfig: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  high: { dot: 'bg-red-500', text: 'text-red-700', label: 'High' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Medium' },
  low: { dot: 'bg-green-500', text: 'text-green-700', label: 'Low' },
  scheduled: {
    dot: 'bg-indigo-500',
    text: 'text-indigo-700',
    label: 'Scheduled',
  },
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

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const urgency = urgencyConfig[task.urgency] ?? urgencyConfig.low
  const overdue =
    task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Urgency badge */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${urgency.dot}`} />
        <span className={`text-xs font-medium ${urgency.text}`}>
          {urgency.label}
        </span>
      </div>

      {/* Title */}
      <h4 className="mb-1 text-sm font-medium text-gray-900 leading-snug">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-gray-500">
          {task.description}
        </p>
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

      {/* Bottom row: assignee, due date, links */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
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
          {/* External links from project */}
          {task.project?.external_links?.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={link.label}
              className="text-gray-400 transition-colors hover:text-brand-600"
            >
              {linkIcon(link.type)}
            </a>
          ))}

          {/* Due date */}
          {task.due_date && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                overdue ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <CalendarDays size={12} />
              {isToday(new Date(task.due_date))
                ? 'Today'
                : isPast(new Date(task.due_date))
                  ? formatDistanceToNow(new Date(task.due_date), {
                      addSuffix: true,
                    })
                  : format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
