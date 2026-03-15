'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const OTP_LENGTH = 6;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [maskedIdentifier, setMaskedIdentifier] = useState<string | null>(null);
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);

  const router = useRouter();

  async function goBack() {
    const res = await fetch('/api/back', { method: 'POST' });
    if (!res.ok) return;
    const { redirectTo } = await res.json();
    if (redirectTo) router.push(redirectTo);
  }

  useEffect(() => {
    fetch('/api/password/forgot')
      .then((r) => r.json())
      .then((data) => {
        if (data.maskedIdentifier) setMaskedIdentifier(data.maskedIdentifier);
        if (data.method) setMethod(data.method);
      })
      .catch(() => {});
  }, []);

  async function onSubmit() {
    if (loading) return;

    if (otp.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    const res = await fetch('/api/password/forgot/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? 'Invalid or expired code');
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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md border border-black p-8">

        {/* header badge */}
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary2">
            Password reset
          </span>
        </div>

        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-secondary2 transition-colors hover:text-black"
        >
          ← Back
        </button>

        <h1 className="font-heading text-2xl font-bold leading-tight">
          Check your {method === 'phone' ? 'phone' : 'email'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary1">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-black">
            {maskedIdentifier ?? '…'}
          </span>
          . Enter it below to continue.
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, ''));
            setError(null);
          }}
          placeholder="000000"
          className="mt-6 h-14 w-full border border-black bg-white px-3 text-center text-xl tracking-[0.5em] placeholder-secondary2 focus:outline-none focus:ring-1 focus:ring-black"
        />

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-4 h-11 w-full bg-black text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Verifying…' : 'Verify code'}
        </button>
      </div>
    </main>
  );
}
