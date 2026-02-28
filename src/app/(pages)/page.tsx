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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-sans text-primary">Authenticate</h1>

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
          className="
            mt-6 h-11 w-full rounded-lg
            bg-black text-sm font-medium text-white
            transition disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          Continue
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <a
          href="/api/oauth/google"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <Image src="/icons/google.svg" alt="Google" width={18} height={18} />
          Sign in with Google
        </a>

        {/* Acknowledgement */}
        <div className="mt-4 flex items-start gap-2">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1"
          />
          <p className="text-xs text-gray-600">
            I acknowledge that this system currently has no published Terms of
            Service or Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
