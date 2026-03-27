import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function SetPasswordPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  // On mount, pick up the recovery session from the URL hash token
  useEffect(() => {
    async function recoverSession() {
      try {
        // Supabase redirects with #access_token=... in the URL hash.
        // Calling getSession() after the auth state listener picks up
        // the hash will give us the recovery session.
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          setSessionReady(true)
        } else {
          setError(
            'No recovery session found. Please use the link from your email.'
          )
        }
      } catch {
        setError('Failed to verify your recovery link. Please try again.')
      } finally {
        setChecking(false)
      }
    }

    // Small delay to let Supabase's auth listener process the hash fragment
    const timeout = setTimeout(recoverSession, 500)
    return () => clearTimeout(timeout)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      // Password set successfully - redirect to board
      navigate('/board', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to set password. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state while checking session
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          {/* Brand icon */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white shadow-md">
              BC
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Set Your Password
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Choose a secure password for your account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {sessionReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !password || !confirm}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? 'Setting password...' : 'Set Password'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Unable to verify your invite link. Please check that you used
                the link from your invitation email.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="mt-4 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
