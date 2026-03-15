'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCooldownStore } from "@/store/cooldown.store";
import { REACT_LOADABLE_MANIFEST } from "next/dist/shared/lib/constants";

export default function OTPPage() {
  const OTP_LENGTH = 6;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string | null>(null);

  const { remaining, isActive, start , stop } = useCooldownStore();

  const router = useRouter();

  async function goBack() {
    const res = await fetch('/api/back', { method: 'POST' });
    if (!res.ok) return;
    const { redirectTo } = await res.json();
    if (redirectTo) router.push(redirectTo);
  }

  function formatTime(seconds: number) {
    seconds = Math.ceil(seconds / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function verifyOtp() {
    if (loading) return;

    if (otp.length !== OTP_LENGTH) {
      setError("Enter the full OTP");
      return;
    }

    setError(null);
    setLoading(true);
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Invalid or expired OTP");
      setLoading(false);
      return;
    }
    if (res.redirected && res.url) {
      const url = new URL(res.url);
      stop();
      router.push(`${url.pathname}${url.search}`);
      return;
    }
  }

  async function resendOtp() {
    if (isActive) return;

    setError(null);

    const res = await fetch("/api/otp/resend", {
      method: "POST",
    });

    if (!res.ok) {
      setError("Resend failed");
      return;
    }

    start();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md border border-black p-8">

        {/* header badge */}
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary2">
            Verification
          </span>
        </div>

        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-secondary2 transition-colors hover:text-black"
        >
          ← Back
        </button>

        <h1 className="font-heading text-2xl font-bold leading-tight">
          Enter verification code
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary1">
          We sent a 6-digit code to your contact method.
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          className="mt-6 h-14 w-full border border-black bg-white px-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-1 focus:ring-black"
        />

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}

        <button
          onClick={verifyOtp}
          disabled={loading}
          className="mt-4 h-11 w-full bg-black text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>

        <div className="mt-5 text-center text-sm text-secondary2">
          {isActive ? (
            <>
              Resend in{" "}
              <span className="font-semibold text-black">{formatTime(remaining)}</span>
            </>
          ) : (
            <button
              onClick={resendOtp}
              className="font-semibold text-black underline underline-offset-2 hover:no-underline transition-all"
            >
              Resend code
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
