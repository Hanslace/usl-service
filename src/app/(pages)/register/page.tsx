"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import IdentifierInput, { detectMethod } from "@/components/auth/IdentifierInput";
import { useCooldownStore } from "@/store/cooldown.store";

export default function RegisterPage() {
  const [firstMethod, setFirstMethod] = useState<"email" | "phone" | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [country, setCountry] = useState<CountryCode>("PK");
  const [error, setError] = useState<string | null>(null);

  const { start } = useCooldownStore();
  const router = useRouter();

  async function goBack() {
    const res = await fetch('/api/back', { method: 'POST' });
    if (!res.ok) return;
    const { redirectTo } = await res.json();
    if (redirectTo) router.push(redirectTo);
  }

  useEffect(() => {
    fetch("/api/otp/method")
      .then((r) => r.json())
      .then((d) => {
        if (d.method === "email" || d.method === "phone") {
          setFirstMethod(d.method);
        } else {
          setError("Session error — please start over");
          setTimeout(() => goBack(), 2000);
        }
      })
      .catch(() => {
        setError("Session error — please start over");
        setTimeout(() => goBack(), 2000);
      });
  }, []);

  const detectedMethod = detectMethod(identifier);
  const expectedMethod = firstMethod === "email" ? "phone" : firstMethod === "phone" ? "email" : null;

  const hint =
    expectedMethod === "phone"
      ? "Add your phone number"
      : expectedMethod === "email"
      ? "Add your email address"
      : "Add another sign-in method";

  async function onContinue() {
    if (!detectedMethod) {
      setError("Please enter a valid email or phone number");
      return;
    }

    if (expectedMethod && detectedMethod !== expectedMethod) {
      setError(
        expectedMethod === "phone"
          ? "Please enter a phone number, not an email"
          : "Please enter an email address, not a phone number"
      );
      return;
    }

    let normalized = identifier.trim();

    if (detectedMethod === "email") {
      normalized = identifier.trim().toLowerCase();
    } else {
      const parsed = parsePhoneNumberFromString(identifier, country);
      if (!parsed || !parsed.isValid()) {
        setError("Invalid phone number");
        return;
      }
      normalized = parsed.number;
    }

    setError(null);

    const res = await fetch("/api/otp/issue-second", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: detectedMethod, identifier: normalized }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to send verification code");
      return;
    }

    start();
    router.push("/otp");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-sans text-primary">{hint}</h1>
        <p className="mt-1 text-sm text-gray-600">
          We'll verify it with a one-time code.
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
          disabled={!firstMethod}
          className="
            mt-6 h-11 w-full rounded-lg
            bg-black text-sm font-medium text-white
            transition disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          Continue
        </button>
      </div>
    </main>
  );
}
