export type TaskStatus = 'new' | 'assigned' | 'in_progress' | 'dependency' | 'review' | 'done'
export type TaskUrgency = 'high' | 'medium' | 'low' | 'scheduled'
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'bi-monthly'
export type ActivityType = 'created' | 'assigned' | 'status_change' | 'comment' | 'file' | 'duplicated' | 'auto_created' | 'recurring_set' | 'tagged'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  department: string
  color: string | null
  status: TaskStatus
  sop_template_id: string | null
  external_links: ExternalLink[]
  created_at: string
}

export interface ExternalLink {
  type: 'sharepoint' | 'excel' | 'word' | 'url'
  url: string
  label: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  department: string
  project_id: string | null
  urgency: TaskUrgency
  status: TaskStatus
  assignee_id: string | null
  assigned_by: string | null
  due_date: string | null
  tags: string[]
  file_links: ExternalLink[]
  sequence: number | null
  recurring_frequency: RecurringFrequency | null
  recurring_auto_create: boolean
  recurring_parent_id: string | null
  created_at: string
  updated_at: string
  assignee?: Profile | null
  project?: Project | null
}

export interface TaskActivity {
  id: string
  task_id: string
  type: ActivityType
  user_id: string | null
  timestamp: string
  data: Record<string, unknown> | null
  user?: Profile | null
}

export interface Notification {
  id: string
  user_id: string
  task_id: string | null
  type: 'status_change' | 'assigned' | 'comment' | 'tagged' | 'due_soon'
  message: string
  read: boolean
  created_at: string
  task?: Task | null
}

export interface SopTemplate {
  id: string
  name: string
  department: string
  description: string | null
  created_at: string
  tasks?: SopTemplateTask[]
}

export interface SopTemplateTask {
  id: string
  sop_template_id: string
  sequence: number
  title: string
  duration_hours: number | null
  default_urgency: TaskUrgency
  created_at: string
}
