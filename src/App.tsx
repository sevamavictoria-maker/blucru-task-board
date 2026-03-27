import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SetPasswordPage = lazy(() => import('@/pages/SetPasswordPage'))
const TaskBoard = lazy(() => import('@/components/board/TaskBoard'))
const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'))
const ReportsPage = lazy(() => import('@/components/reports/ReportsPage'))
const SopsPage = lazy(() => import('@/components/sops/SopsPage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const InvitePage = lazy(() => import('@/pages/InvitePage'))

function Fallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  )
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <Fallback />
  return <Navigate to={isAuthenticated ? '/board' : '/login'} replace />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/board" element={<TaskBoard />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/sops" element={<SopsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/team" element={<InvitePage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
