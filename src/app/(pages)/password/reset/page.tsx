'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function goBack() {
    const res = await fetch('/api/back', { method: 'POST' });
    if (!res.ok) return;
    const { redirectTo } = await res.json();
    if (redirectTo) router.push(redirectTo);
  }

  async function onSubmit() {
    if (loading) return;

    if (password.length < 8 || password.length > 128) {
      setError('Password must be between 8 and 128 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? 'Reset failed');
      setLoading(false);
      return;
    }

    if (res.redirected && res.url) {
      const url = new URL(res.url);
      router.push(`${url.pathname}${url.search}`);
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition"
        >
          ← Back
        </button>

        <h1 className="mb-2 text-2xl font-semibold text-neutral-100">
          Set new password
        </h1>

        <p className="mb-6 text-sm text-neutral-400">
          Choose a new password for your account.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Set new password'}
        </button>
      </div>
    </div>
  );
}
