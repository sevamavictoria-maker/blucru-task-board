import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const faqs = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How do I create a new task?',
        a: 'Go to the Board page and click the "+ New Task" button in the top right. Fill in the title, department, urgency, assignee, due date, and any other details. Click "Create" to save.',
      },
      {
        q: 'How do I create a project?',
        a: 'Go to the Projects page and click "+ New Project". Enter the project name, description, department, status, and start/end dates. You can also create projects automatically from SOP templates on the Board page.',
      },
      {
        q: 'How do I use an SOP template?',
        a: 'On the Board page, click "Use SOP Template" and select a template. You can either create a new project or add tasks to an existing project. Set a start date and the system will auto-calculate due dates for each step based on the duration hours.',
      },
      {
        q: 'How do I invite team members?',
        a: 'Go to the Team page and click "Invite User". Enter their email, name, and role. They will receive an email with a link to set their password and access the system.',
      },
    ],
  },
  {
    category: 'Task Management',
    items: [
      {
        q: 'What do the task statuses mean?',
        a: 'New: Just created, not started yet. Assigned: Given to someone but not started. In Progress: Actively being worked on. Dependency: Blocked by another task or external factor. Review: Work done, awaiting review/approval. Done: Completed.',
      },
      {
        q: 'How do I change a task\'s status?',
        a: 'Click on any task card to open the detail view. You\'ll see 6 status buttons at the top — click any one to change the status instantly. The activity timeline will record the change automatically.',
      },
      {
        q: 'How do I assign a task to someone?',
        a: 'When creating or editing a task, select a person from the "Assignee" dropdown. The assigned person will receive a notification.',
      },
      {
        q: 'How do I delete a task?',
        a: 'Each task card has a small trash icon in the bottom-right corner. Click it and confirm to delete. This action cannot be undone.',
      },
      {
        q: 'What does "Overdue" mean?',
        a: 'A task is overdue when its due date has passed and it\'s not marked as Done. Overdue tasks show a red border and an "Overdue" badge on the card.',
      },
      {
        q: 'How do I add file links to a task?',
        a: 'When creating or editing a task, scroll to the "File Links" section. You can add links to SharePoint, Excel, Word documents, or any URL. These appear as clickable icons on the task card.',
      },
    ],
  },
  {
    category: 'Projects',
    items: [
      {
        q: 'How do I see all my projects?',
        a: 'Go to the Projects page from the nav bar. You\'ll see all active projects with their status, progress, team members, and dates.',
      },
      {
        q: 'How do I archive a project?',
        a: 'On the Projects page, click the archive icon on any project card. Archived projects are hidden by default. Toggle "Show archived" to see them, and click the restore icon to bring them back.',
      },
      {
        q: 'How do I see tasks grouped by project?',
        a: 'On the Board page, change the "Group by" dropdown to "Project". Each project will appear as a bucket showing its description, progress bar, and all its tasks.',
      },
    ],
  },
  {
    category: 'SOP Templates',
    items: [
      {
        q: 'How do I create an SOP template?',
        a: 'Go to the SOPs page and click "+ Create Template". Enter the template name, department, and description. Then add steps with titles, duration in hours, and urgency levels.',
      },
      {
        q: 'How do I upload an SOP from Excel?',
        a: 'On the SOPs page, click "Template" to download a sample Excel file. Fill it in with your steps (columns: Step, Task Title, Duration (hours), Urgency), then click "Upload Excel/CSV" to import it.',
      },
      {
        q: 'What happens when I use an SOP template?',
        a: 'The system creates a task for each step in the SOP. Due dates are automatically calculated by stacking the duration hours from your chosen start date (8 hours = 1 working day).',
      },
      {
        q: 'Can I add SOP tasks to an existing project?',
        a: 'Yes. When you click "Use SOP Template" on the Board, you can choose "Existing Project" and select from your current projects instead of creating a new one.',
      },
    ],
  },
  {
    category: 'Filtering & Views',
    items: [
      {
        q: 'How do I filter tasks?',
        a: 'On the Board page, use the filter dropdowns at the top: Person, Project, Status, and Urgency. You can combine multiple filters. Use "What\'s Next" toggles to filter by due date (Today, This Week, This Month).',
      },
      {
        q: 'What are the Group By options?',
        a: 'Status: Shows tasks in Kanban columns (New → Assigned → In Progress → Dependency → Review → Done). Person: Groups tasks by assignee. Project: Shows tasks inside project buckets with progress bars.',
      },
    ],
  },
  {
    category: 'Notifications & Activity',
    items: [
      {
        q: 'How do notifications work?',
        a: 'You receive notifications when: someone assigns a task to you, a task status changes, or someone @mentions you in a comment. Click the bell icon in the header to see your notifications.',
      },
      {
        q: 'How do I @mention someone in a comment?',
        a: 'In the task detail view, type @ in the comment box followed by a person\'s name. A dropdown will appear — select the person to tag them. They\'ll receive a notification.',
      },
      {
        q: 'Where can I see the activity history of a task?',
        a: 'Click on any task card to open the detail view. The activity timeline at the bottom shows all changes: status updates, comments, assignments, and more — each with a timestamp.',
      },
    ],
  },
  {
    category: 'Reports & Dashboard',
    items: [
      {
        q: 'What does the Dashboard show?',
        a: 'The Dashboard gives you an overview of all tasks: total count, completion rate, status distribution, and upcoming deadlines.',
      },
      {
        q: 'What metrics are in Reports?',
        a: 'Reports shows: team KPIs (completion rate, on-time delivery), individual performance table, department breakdown with progress bars, and a top performers leaderboard.',
      },
    ],
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  function toggle(key: string) {
    setOpenIndex((prev) => (prev === key ? null : key))
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="text-brand-600" size={28} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="text-sm text-gray-500">Everything you need to know about the BluCru Task Board</p>
        </div>
      </div>

      <div className="space-y-6">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {section.category}
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`
                const isOpen = openIndex === key
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900 pr-4">{item.q}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed slide-in">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
