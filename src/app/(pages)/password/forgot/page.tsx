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
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-semibold text-neutral-100">
          Check your {method === 'phone' ? 'phone' : 'email'}
        </h1>

        <p className="mb-6 text-sm text-neutral-400">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-neutral-200">
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
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-center text-xl tracking-widest text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
          {loading ? 'Verifying…' : 'Verify code'}
        </button>
      </div>
    </div>
  );
}
