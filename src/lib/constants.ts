import type { TaskStatus, TaskUrgency } from '@/types/database'

export const STATUS_COLUMNS: { value: TaskStatus; label: string; color: string; bg: string }[] = [
  { value: 'inbox', label: 'Inbox', color: 'text-gray-600', bg: 'bg-gray-100' },
  { value: 'assigned', label: 'Assigned', color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'in_progress', label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: 'review', label: 'Review', color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'done', label: 'Done', color: 'text-green-600', bg: 'bg-green-100' },
]

export const URGENCY_OPTIONS: { value: TaskUrgency; label: string; color: string; bg: string }[] = [
  { value: 'high', label: 'High', color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: 'low', label: 'Low', color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'scheduled', label: 'Scheduled', color: 'text-indigo-600', bg: 'bg-indigo-100' },
]

export const DEPARTMENTS = [
  'Operations',
  'Finance',
  'HR',
  'IT Support',
  'Customer Support',
  'Insurance',
  'Property Management',
  'Management',
]
