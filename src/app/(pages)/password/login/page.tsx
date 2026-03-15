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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md border border-black p-8">

        {/* header badge */}
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary2">
            Secure authentication
          </span>
        </div>

        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-secondary2 transition-colors hover:text-black"
        >
          ← Back
        </button>

        <h1 className="font-heading text-2xl font-bold leading-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary1">
          Enter your password to continue.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-6 h-11 w-full border border-black bg-white px-3 text-sm placeholder-secondary2 focus:outline-none focus:ring-1 focus:ring-black"
        />

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-4 h-11 w-full bg-black text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={onForgot}
          disabled={loading}
          className="mt-4 w-full text-sm text-secondary2 underline underline-offset-2 transition-colors hover:text-black hover:no-underline disabled:opacity-40"
        >
          Forgot password?
        </button>
      </div>
    </main>
  );
}
