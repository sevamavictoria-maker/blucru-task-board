import { useState, useRef, useCallback } from 'react'
import {
  X,
  Sparkles,
  UserPlus,
  ArrowRight,
  MessageSquare,
  Copy,
  Clock,
  Repeat,
  Calendar,
  Tag,
  Building2,
  FolderOpen,
  AlertTriangle,
  User,
  FileSpreadsheet,
  FileText,
  Globe,
  Plus,
  Link2,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTaskActivity, useAddComment, useAddActivity } from '@/hooks/useTaskActivity'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useCreateNotification } from '@/hooks/useNotifications'
import { STATUS_COLUMNS, URGENCY_OPTIONS } from '@/lib/constants'
import type { Task, TaskStatus, ActivityType, ExternalLink } from '@/types/database'

/* ── Props ──────────────────────────────────────────────────────────── */

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

/* ── Activity config ────────────────────────────────────────────────── */

const ACTIVITY_ICONS: Record<ActivityType, typeof Sparkles> = {
  created: Sparkles,
  assigned: UserPlus,
  status_change: ArrowRight,
  comment: MessageSquare,
  duplicated: Copy,
  auto_created: Clock,
  recurring_set: Repeat,
  file: Link2,
  tagged: Tag,
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  created: 'created this task',
  assigned: 'assigned this task',
  status_change: 'changed status',
  comment: 'commented',
  duplicated: 'duplicated this task',
  auto_created: 'auto-created from recurring',
  recurring_set: 'set recurring schedule',
  file: 'attached a file',
  tagged: 'tagged someone',
}

const linkTypeOptions: { value: ExternalLink['type']; label: string }[] = [
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'excel', label: 'Excel' },
  { value: 'word', label: 'Word' },
  { value: 'url', label: 'URL' },
]

function fileLinkIcon(type: ExternalLink['type']) {
  switch (type) {
    case 'excel':
    case 'sharepoint':
      return <FileSpreadsheet size={14} />
    case 'word':
      return <FileText size={14} />
    default:
      return <Globe size={14} />
  }
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function TaskDetailModal({
  task,
  onClose,
  onStatusChange,
}: TaskDetailModalProps) {
  const [comment, setComment] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '')
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLinkType, setNewLinkType] = useState<ExternalLink['type']>('url')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const currentUserName = profile?.full_name ?? session?.user?.email ?? 'Someone'

  const { data: activities = [], isLoading: activitiesLoading } = useTaskActivity(task.id)
  const { data: users = [] } = useUsers()
  const addComment = useAddComment()
  const addActivity = useAddActivity()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const createNotification = useCreateNotification()

  const urgencyConfig = URGENCY_OPTIONS.find((u) => u.value === task.urgency)

  /* ── Status change ────────────────────────────────────────────────── */

  const handleStatusChange = useCallback(
    (status: TaskStatus) => {
      onStatusChange(task.id, status)
    },
    [task.id, onStatusChange],
  )

  /* ── Assignee change ──────────────────────────────────────────────── */

  const handleAssigneeChange = useCallback(
    (newAssigneeId: string) => {
      setAssigneeId(newAssigneeId)
      updateTask.mutate({ id: task.id, assignee_id: newAssigneeId || null })

      if (newAssigneeId && newAssigneeId !== task.assignee_id) {
        createNotification.mutate({
          user_id: newAssigneeId,
          task_id: task.id,
          type: 'assigned',
          message: `${currentUserName} assigned you to: ${task.title}`,
        })

        if (userId) {
          addActivity.mutate({
            task_id: task.id,
            type: 'assigned',
            user_id: userId,
            data: {
              assignee_id: newAssigneeId,
              assignee_name:
                users.find((u) => u.id === newAssigneeId)?.full_name ?? 'someone',
            },
          })
        }
      }
    },
    [task, userId, currentUserName, users, updateTask, createNotification, addActivity],
  )

  /* ── Duplicate ────────────────────────────────────────────────────── */

  const handleDuplicate = useCallback(() => {
    createTask.mutate(
      {
        title: `${task.title} (Copy)`,
        description: task.description,
        department: task.department,
        project_id: task.project_id,
        urgency: task.urgency,
        status: 'new' as TaskStatus,
        assignee_id: null,
        assigned_by: null,
        due_date: task.due_date,
        tags: task.tags,
        file_links: task.file_links,
        sequence: task.sequence,
        recurring_frequency: task.recurring_frequency,
        recurring_auto_create: task.recurring_auto_create,
        recurring_parent_id: task.recurring_parent_id,
      },
      {
        onSuccess: (newTask) => {
          if (userId) {
            addActivity.mutate({
              task_id: newTask.id,
              type: 'duplicated',
              user_id: userId,
              data: { source_task_id: task.id },
            })
          }
        },
      },
    )
  }, [task, userId, createTask, addActivity])

  /* ── Add file link ────────────────────────────────────────────────── */

  const handleAddLink = useCallback(() => {
    if (!newLinkUrl.trim()) return

    const updatedLinks: ExternalLink[] = [
      ...(task.file_links ?? []),
      { type: newLinkType, url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() },
    ]

    updateTask.mutate({ id: task.id, file_links: updatedLinks })

    if (userId) {
      addActivity.mutate({
        task_id: task.id,
        type: 'file',
        user_id: userId,
        data: { url: newLinkUrl.trim(), label: newLinkLabel.trim() },
      })
    }

    setNewLinkType('url')
    setNewLinkUrl('')
    setNewLinkLabel('')
    setShowAddLink(false)
  }, [task, newLinkType, newLinkUrl, newLinkLabel, userId, updateTask, addActivity])

  /* ── Comment with @mention ────────────────────────────────────────── */

  const handleCommentInput = useCallback(
    (value: string) => {
      setComment(value)

      // Detect @mention trigger
      const cursorPos = commentRef.current?.selectionStart ?? value.length
      const textUpToCursor = value.slice(0, cursorPos)
      const atMatch = textUpToCursor.match(/@(\w*)$/)

      if (atMatch) {
        setShowMentions(true)
        setMentionFilter(atMatch[1].toLowerCase())
      } else {
        setShowMentions(false)
        setMentionFilter('')
      }
    },
    [],
  )

  const insertMention = useCallback(
    (user: { id: string; full_name: string | null; email: string }) => {
      const name = user.full_name ?? user.email
      const cursorPos = commentRef.current?.selectionStart ?? comment.length
      const textUpToCursor = comment.slice(0, cursorPos)
      const atIndex = textUpToCursor.lastIndexOf('@')

      if (atIndex >= 0) {
        const before = comment.slice(0, atIndex)
        const after = comment.slice(cursorPos)
        setComment(`${before}@${name} ${after}`)
      }

      setShowMentions(false)
      setMentionFilter('')
      commentRef.current?.focus()
    },
    [comment],
  )

  const filteredMentionUsers = users.filter((u) => {
    if (!mentionFilter) return true
    const name = (u.full_name ?? u.email).toLowerCase()
    return name.includes(mentionFilter)
  })

  const handleAddComment = useCallback(() => {
    if (!comment.trim() || !userId) return

    // Extract @mentions
    const mentionRegex = /@([\w\s]+?)(?=\s@|\s*$|[.,!?])/g
    const mentions: string[] = []
    let match: RegExpExecArray | null

    while ((match = mentionRegex.exec(comment)) !== null) {
      const mentionName = match[1].trim()
      const mentionedUser = users.find(
        (u) =>
          (u.full_name ?? u.email).toLowerCase() === mentionName.toLowerCase(),
      )
      if (mentionedUser && mentionedUser.id !== userId) {
        mentions.push(mentionedUser.id)
      }
    }

    addComment.mutate(
      { taskId: task.id, userId, comment: comment.trim() },
      {
        onSuccess: () => {
          setComment('')

          // Notify @mentioned users
          for (const mentionedId of mentions) {
            createNotification.mutate({
              user_id: mentionedId,
              task_id: task.id,
              type: 'tagged',
              message: `${currentUserName} mentioned you in a comment on: ${task.title}`,
            })
          }
        },
      },
    )
  }, [comment, userId, currentUserName, task, users, addComment, createNotification])

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pb-12 pt-12">
      <div className="slide-in w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6 pb-4">
          <div className="min-w-0 flex-1 pr-4">
            <div className="mb-1 flex items-center gap-2">
              {task.sequence != null && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {task.sequence}
                </span>
              )}
              <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
            </div>
            {task.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {task.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Metadata */}
        <div className="border-b border-gray-200 p-6 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Building2 size={15} />
              <span className="font-medium text-gray-700">{task.department}</span>
            </div>
            {task.project && (
              <div className="flex items-center gap-2 text-gray-500">
                <FolderOpen size={15} />
                <span className="font-medium text-gray-700">{task.project.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-500">
              <AlertTriangle size={15} />
              <span className={`font-medium ${urgencyConfig?.color ?? 'text-gray-700'}`}>
                {urgencyConfig?.label ?? task.urgency}
              </span>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={15} />
                <span className="font-medium text-gray-700">
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.recurring_frequency && (
              <div className="flex items-center gap-2 text-gray-500">
                <Repeat size={15} />
                <span className="font-medium capitalize text-gray-700">
                  {task.recurring_frequency}
                  {task.recurring_auto_create ? ' (auto)' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Tag size={14} className="text-gray-400" />
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Assignee selector */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <User size={15} className="text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Assignee
            </span>
            <select
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="input ml-auto w-48"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File links */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              File Links
            </p>
            <button
              onClick={() => setShowAddLink((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              <Plus size={14} />
              Add Link
            </button>
          </div>

          {(task.file_links?.length ?? 0) === 0 && !showAddLink && (
            <p className="text-xs text-gray-400">No file links</p>
          )}

          {task.file_links?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.file_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600"
                >
                  {fileLinkIcon(link.type)}
                  {link.label || link.url}
                </a>
              ))}
            </div>
          )}

          {showAddLink && (
            <div className="mt-2 flex items-end gap-2">
              <select
                value={newLinkType}
                onChange={(e) => setNewLinkType(e.target.value as ExternalLink['type'])}
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
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="input flex-1"
              />
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Label"
                className="input w-24 shrink-0"
              />
              <button
                onClick={handleAddLink}
                disabled={!newLinkUrl.trim()}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Status buttons */}
        <div className="border-b border-gray-200 p-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_COLUMNS.map((col) => {
              const isActive = task.status === col.value
              return (
                <button
                  key={col.value}
                  onClick={() => handleStatusChange(col.value)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {col.label}
                </button>
              )
            })}
          </div>

          {/* Duplicate button */}
          <button
            onClick={handleDuplicate}
            disabled={createTask.isPending}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <Copy size={14} />
            {createTask.isPending ? 'Duplicating...' : 'Duplicate Task'}
          </button>
        </div>

        {/* Activity Timeline */}
        <div className="p-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Activity
          </p>

          {activitiesLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : activities.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No activity yet</p>
          ) : (
            <div className="relative space-y-3 pl-4">
              {/* Vertical line */}
              <div className="absolute bottom-0 left-[13px] top-0 w-px bg-gray-200" />

              {activities.map((activity) => {
                const IconComp = ACTIVITY_ICONS[activity.type] ?? Clock
                const label = ACTIVITY_LABELS[activity.type] ?? activity.type

                return (
                  <div key={activity.id} className="relative flex gap-3">
                    <div className="z-10 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <IconComp size={14} className="text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">
                          {activity.user?.full_name ?? 'System'}
                        </span>{' '}
                        {activity.type === 'status_change' && activity.data
                          ? `changed status from ${activity.data.from as string} \u2192 ${activity.data.to as string}`
                          : label}
                      </p>

                      {/* Comment body */}
                      {activity.type === 'comment' && activity.data && (
                        <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                          {activity.data.comment as string}
                        </div>
                      )}

                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add Comment */}
        <div className="border-t border-gray-200 p-6 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Add Comment
          </p>
          <div className="relative">
            <textarea
              ref={commentRef}
              value={comment}
              onChange={(e) => handleCommentInput(e.target.value)}
              placeholder="Write a comment... (use @ to mention someone)"
              rows={3}
              className="input resize-none"
            />

            {/* @mention dropdown */}
            {showMentions && filteredMentionUsers.length > 0 && (
              <div className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {filteredMentionUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => insertMention(u)}
                    className="block w-full px-4 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {u.full_name ?? u.email}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={!comment.trim() || addComment.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {addComment.isPending && <Loader2 size={14} className="animate-spin" />}
              {addComment.isPending ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
