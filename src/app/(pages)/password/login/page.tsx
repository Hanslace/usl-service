"use client";

import { useEffect, useState } from "react";

export default function LoginPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotDone, setForgotDone] = useState(false);

  async function onSubmit() {
    if (loading) return;
    if (password.length < 8) {
      setError("Invalid password");
      return;
    }

    setLoading(true);
    setError(null);
    
    const res = await fetch("/api/auth/password/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Authentication failed");
      setLoading(false);
      return;
    }

    window.location.href = "/app";
  }

  async function onForgot() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Request failed");
      setLoading(false);
      return;
    }

    setForgotDone(true);
    setLoading(false);
  }

  useEffect(() => {
    if (forgotDone) {
      const t = setTimeout(() => {
        window.location.href = "/";
      }, 5000);

      return () => clearTimeout(t);
    }
  }, [forgotDone]);

  if (forgotDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center shadow-xl">
          <p className="text-lg font-semibold text-neutral-100">
            An email or SMS has been sent to your registered credentials.
          </p>
          <p className="mt-3 text-sm text-neutral-400">
            Follow the instructions there to reset your password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-semibold text-neutral-100">
          Welcome back
        </h1>

        <p className="mb-6 text-sm text-neutral-400">
          Enter your password to continue.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
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
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={onForgot}
          disabled={loading}
          className="mt-4 w-full text-sm text-neutral-400 transition hover:text-neutral-200"
        >
          Forgot password ?
        </button>
      </div>
    </div>
  );
}
