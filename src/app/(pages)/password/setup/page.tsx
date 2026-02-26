"use client";

import { useState } from "react";

export default function SetupPasswordPage({
}: {
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    const res = await fetch("/api/password/setup", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
       },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => null);

        const msg = data?.message ?? "Setup failed";
        setError(msg);
        setLoading(false);
        
      
        return;
      }

    if (res.redirected && res.url) {
      window.location.assign(res.url);
      return;
    }

    const data = await res.json().catch(() => null);
    if (data?.redirectTo && typeof data.redirectTo === "string") {
      window.location.assign(data.redirectTo);
      return;
    }

    setError("Setup completed, but redirect failed");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">
          Create password
        </h1>

        <p className="mb-6 text-sm text-neutral-600">
          This password will secure your account.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-3 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          className="mb-3 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        {error && (
          <div className="mb-3 rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </div>
    </div>
  );
}
