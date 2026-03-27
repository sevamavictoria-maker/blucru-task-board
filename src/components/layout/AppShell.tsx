import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, BarChart3, FileBarChart, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/board', label: 'Board', icon: LayoutDashboard },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
] as const

export default function AppShell() {
  const { session, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-brand-600">
            BluCru Task Board
          </span>

          {/* Nav toggles */}
          <nav className="ml-4 flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User section */}
        <div className="flex items-center gap-3">
          {session?.user?.email && (
            <span className="hidden text-sm text-gray-500 sm:inline">
              {session.user.email}
            </span>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-600"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-full flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
