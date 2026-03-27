import { useState } from 'react'
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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTaskActivity, useAddComment, useAddActivity } from '@/hooks/useTaskActivity'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { STATUS_COLUMNS, URGENCY_OPTIONS } from '@/lib/constants'
import type { Task, TaskStatus, ActivityType } from '@/types/database'

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onStatusChange: (status: TaskStatus) => void
}

const ACTIVITY_ICONS: Record<ActivityType, typeof Sparkles> = {
  created: Sparkles,
  assigned: UserPlus,
  status_change: ArrowRight,
  comment: MessageSquare,
  duplicated: Copy,
  auto_created: Clock,
  recurring_set: Repeat,
  file: Tag,
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
}

export default function TaskDetailModal({
  task,
  onClose,
  onStatusChange,
}: TaskDetailModalProps) {
  const [comment, setComment] = useState('')
  const { session } = useAuth()
  const userId = session?.user?.id

  const { data: activities = [], isLoading: activitiesLoading } = useTaskActivity(task.id)
  const addComment = useAddComment()
  const addActivity = useAddActivity()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const urgencyConfig = URGENCY_OPTIONS.find((u) => u.value === task.urgency)

  function handleStatusChange(status: TaskStatus) {
    const oldStatus = task.status
    onStatusChange(status)
    updateTask.mutate({ id: task.id, status })
    if (userId) {
      addActivity.mutate({
        task_id: task.id,
        type: 'status_change',
        user_id: userId,
        data: { from: oldStatus, to: status },
      })
    }
  }

  function handleDuplicate() {
    createTask.mutate(
      {
        title: `${task.title} (Copy)`,
        description: task.description,
        department: task.department,
        project_id: task.project_id,
        urgency: task.urgency,
        status: 'inbox',
        assignee_id: null,
        assigned_by: null,
        due_date: task.due_date,
        tags: task.tags,
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
  }

  function handleAddComment() {
    if (!comment.trim() || !userId) return
    addComment.mutate(
      { taskId: task.id, userId, comment: comment.trim() },
      { onSuccess: () => setComment('') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12 pb-12">
      <div className="slide-in w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6 pb-4">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
            {task.description && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{task.description}</p>
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
            {task.assignee && (
              <div className="flex items-center gap-2 text-gray-500">
                <User size={15} />
                <span className="font-medium text-gray-700">
                  {task.assignee.full_name ?? task.assignee.email}
                </span>
              </div>
            )}
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
                <span className="font-medium text-gray-700 capitalize">
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
            <div className="space-y-3">
              {activities.map((activity) => {
                const IconComp = ACTIVITY_ICONS[activity.type] ?? Clock
                const label = ACTIVITY_LABELS[activity.type] ?? activity.type

                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
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
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="input resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={!comment.trim() || addComment.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {addComment.isPending ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
