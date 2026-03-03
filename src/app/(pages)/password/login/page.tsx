"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPasswordPage() {
  const [password, setPassword] = useState("");
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
      setError("Invalid password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/password/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Authentication failed");
        setLoading(false);
        return;
      }

      const redirectTo = data?.redirectTo;

      if (typeof redirectTo === "string" && redirectTo.length > 0) {
        window.location.href = redirectTo;
        return;
      }

      setError("Login completed, but redirect failed");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  async function onForgot() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/password/forgot", {
      method: "POST",
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Request failed");
      setLoading(false);
      return;
    }

    if (res.redirected && res.url) {
      const url = new URL(res.url);
      router.push(`${url.pathname}${url.search}`);
      return;
    }

    setError("Request failed");
    setLoading(false);
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
