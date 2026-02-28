// app/usl/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  parsePhoneNumberFromString,
  CountryCode
} from "libphonenumber-js";
import PhoneAuth from "@/components/auth/PhoneAuth";
import EmailAuth from "@/components/auth/EmailAuth";
import { useRouter } from "next/navigation";
import { useCooldownStore } from '@/store/cooldown.store';

type AuthMethod = "phone" | "email";

export default function USLPage() {
  const [country, setCountry] = useState<CountryCode>("PK");
  const [phone, setPhone] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const { remaining, isActive, start } = useCooldownStore();


  const router = useRouter();

  function validateE164(): string | null {
    const parsed = parsePhoneNumberFromString(phone, country);
    

    if (!parsed || !parsed.isValid()) {
      setError("Invalid phone number");
      return null;
    }

    setError(null);
    return parsed.number; // canonical E.164
  }

  function validateEmail(): string | null {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError("Email is required");
      return null;
    }

    const ok =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (!ok) {
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

    let payload: {
      method: "phone" | "email";
      identifier: string;
    };

    if (method === "phone") {
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
      headers: { 
        "Content-Type": "application/json",
       },
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
    if (res.ok) {
      start();
      const url = new URL(res.url);
      router.push(`/otp`);
      return;
    }

  }



  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-sans text-primary">
          Authenticate
        </h1>

        {method === "phone" ? (
        <PhoneAuth
          country={country}
          setCountry={setCountry}
          phone={phone}
          setPhone={setPhone}
          error={error}
        />
      ) : (
        <EmailAuth
          email={email}
          setEmail={setEmail}
          error={error}
        />
      )}

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

        {/* Google */}
        <button className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
          <Image src="/icons/google.svg" alt="Google" width={18} height={18} />
          Continue with Google
        </button>

        {/* Email */}
        {method === "phone" ? (
          <button
            onClick={() => {
              setError(null);
              setMethod("email");
            }}
            className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            Continue with Email
          </button>
        ) : (
          <button
            onClick={() => {
              setError(null);
              setMethod("phone");
            }}
            className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            Use phone instead
          </button>
        )}


        {/* Acknowledgement */}
        <div className="mt-4 flex items-start gap-2">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1"
          />
          <p className="text-xs text-gray-600">
            I acknowledge that this system currently has no published
            Terms of Service or Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
