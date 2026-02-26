'use client';

import { useEffect, useState } from "react";

export default function OTPPage() {
  const OTP_LENGTH = 6;
  const OTP_COOLDOWN_SEC = 300; // 5 minutes
    
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  setSecondsLeft(OTP_COOLDOWN_SEC);

  const i = setInterval(() => {
    setSecondsLeft(v => Math.max(v - 1, 0));
  }, 1000);

  return () => clearInterval(i);
}, []);

  function formatTime(seconds: number) {
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

  }

  async function resendOtp() {
    if (secondsLeft > 0) return;

    setError(null);

    const res = await fetch("/api/otp/resend", {
      method: "POST",
    });

    if (!res.ok) {
      setError("Resend failed");
      return;
    }

    setSecondsLeft(OTP_COOLDOWN_SEC);

  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900">
          Enter verification code
        </h1>

        <p className="mt-1 text-sm text-gray-600">
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
          className="
            mt-4 h-12 w-full rounded-lg border
            px-3 text-center text-lg tracking-widest
            focus:outline-none focus:ring-2 focus:ring-black
          "
        />

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={verifyOtp}
          disabled={loading}
          className="
            mt-5 h-11 w-full rounded-lg
            bg-black text-sm font-medium text-white
          "
        >
          Verify
        </button>

        <div className="mt-4 text-center text-sm text-gray-600">
          {secondsLeft > 0 ? (
            <>Resend available in <span className="font-medium">{formatTime(secondsLeft)}</span></>
          ) : (
            <button
              onClick={resendOtp}
              className="font-medium text-black underline"
            >
              Resend code
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
