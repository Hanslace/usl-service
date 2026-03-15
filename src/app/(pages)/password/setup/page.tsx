"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPasswordPage({
}: {
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
      setError("Password must be at least 8 and at most 128 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/password/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Setup failed");
        setLoading(false);
        return;
      }

      const redirectTo = data?.redirectTo;

      if (typeof redirectTo === "string" && redirectTo.length > 0) {
        // Important: top-level navigation triggers openAuthSessionAsync completion
        window.location.href = redirectTo; // or assign()
        return;
      }

      setError("Setup completed, but redirect failed");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md border border-black p-8">

        {/* header badge */}
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary2">
            Account setup
          </span>
        </div>

        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-secondary2 transition-colors hover:text-black"
        >
          ← Back
        </button>

        <h1 className="font-heading text-2xl font-bold leading-tight">Create password</h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary1">
          This password will secure your account.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-6 h-11 w-full border border-black bg-white px-3 text-sm placeholder-secondary2 focus:outline-none focus:ring-1 focus:ring-black"
        />

        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          className="mt-3 h-11 w-full border border-black bg-white px-3 text-sm placeholder-secondary2 focus:outline-none focus:ring-1 focus:ring-black"
        />

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-4 h-11 w-full bg-black text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </div>
    </main>
  );
}
