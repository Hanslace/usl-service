// app/usl/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import IdentifierInput, { detectMethod } from "@/components/auth/IdentifierInput";
import { useRouter } from "next/navigation";
import { useCooldownStore } from "@/store/cooldown.store";

export default function USLPage() {
  const [country, setCountry] = useState<CountryCode>("PK");
  const [identifier, setIdentifier] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remaining, isActive, start } = useCooldownStore();

  const router = useRouter();
  const detectedMethod = detectMethod(identifier);

  function validateE164(): string | null {
    const parsed = parsePhoneNumberFromString(identifier, country);

    if (!parsed || !parsed.isValid()) {
      setError("Invalid phone number");
      return null;
    }

    setError(null);
    return parsed.number;
  }

  function validateEmail(): string | null {
    const trimmed = identifier.trim().toLowerCase();

    if (!trimmed) {
      setError("Email is required");
      return null;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Invalid email address");
      return null;
    }

    setError(null);
    return trimmed;
  }

  async function onContinue() {
    if (!ack) {
      setError("Acknowledgement required");
      return;
    }

    if (!detectedMethod) {
      setError("Please enter a valid email or phone number");
      return;
    }

    let payload: { method: "phone" | "email"; identifier: string };

    if (detectedMethod === "phone") {
      const e164 = validateE164();
      if (!e164) return;
      payload = { method: "phone", identifier: e164 };
    } else {
      const normalizedEmail = validateEmail();
      if (!normalizedEmail) return;
      payload = { method: "email", identifier: normalizedEmail };
    }

    if (isActive) {
      setError("Please wait a minute before trying again");
      return;
    }

    const res = await fetch("/api/otp/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (res.status === 501) {
        setError(body?.message ?? "Feature not implemented");
        return;
      }
      setError(body?.error ?? "Failed to initiate verification");
      return;
    }

    start();
    router.push(`/otp`);
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

        <h1 className="font-heading text-2xl font-bold leading-tight">
          Sign in or create account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary1">
          Enter your email or phone number to continue.
        </p>

        <IdentifierInput
          identifier={identifier}
          setIdentifier={setIdentifier}
          country={country}
          setCountry={setCountry}
          detectedMethod={detectedMethod}
          error={error}
        />

        <button
          onClick={onContinue}
          disabled={!ack}
          className="mt-4 h-11 w-full bg-black text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/15" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary2">or</span>
          <div className="h-px flex-1 bg-black/15" />
        </div>

        <a
          href="/api/oauth/google"
          className="flex h-11 w-full items-center justify-center gap-3 border border-black px-4 text-sm font-medium transition-colors hover:bg-black hover:text-white"
        >
          <Image src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt="Google" width={18} height={18} />
          Continue with Google
        </a>

        {/* Acknowledgement */}
        <div className="mt-6 flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 accent-black"
          />
          <p className="text-xs leading-relaxed text-secondary2">
            I acknowledge that this system currently has no published Terms of
            Service or Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
