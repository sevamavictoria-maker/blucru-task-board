import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, UserPlus, Shield, User } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
]

function roleBadge(role: string) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">
        <Shield size={10} />
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600">
      <User size={10} />
      User
    </span>
  )
}

export default function InvitePage() {
  const { data: users = [], isLoading, error: loadError } = useUsers()

  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function resetForm() {
    setEmail('')
    setFullName('')
    setRole('user')
    setError('')
    setSuccess('')
  }

  function openModal() {
    resetForm()
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Generate a random temporary password (user will reset it via email)
      const tempPassword =
        crypto.randomUUID().replace(/-/g, '').slice(0, 24) + '!Aa1'

      // Sign up the user with a temp password and metadata
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: {
          data: {
            full_name: fullName.trim() || null,
            role,
          },
        },
      })

      if (signUpError) throw signUpError

      // Update the profile role if the user was created
      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role, full_name: fullName.trim() || null })
          .eq('id', signUpData.user.id)

        if (profileError) {
          console.error('Profile update failed:', profileError.message)
        }
      }

      // Send password reset so the invited user can set their own password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin + '/set-password' }
      )

      if (resetError) throw resetError

      setSuccess(
        "Invite sent! They'll receive an email to set their password."
      )
      setEmail('')
      setFullName('')
      setRole('user')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to invite user. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-sm text-red-600">
          Failed to load team members. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Team Members</h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {users.length}
          </span>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <UserPlus size={16} />
          Invite User
        </button>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <UserPlus size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No team members yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Invite your first team member to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user.full_name ?? 'Unnamed'}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {roleBadge(user.role)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]">
          <div className="slide-in w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleInvite} className="space-y-4 px-6 py-5">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-600">
                  {success}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@blucru.com"
                  required
                  className={inputClass}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputClass}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
