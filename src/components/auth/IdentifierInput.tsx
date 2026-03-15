"use client";

import { getCountries, getCountryCallingCode, CountryCode } from "libphonenumber-js";

const COUNTRIES = getCountries().map((code) => ({
  code,
  dial: `+${getCountryCallingCode(code)}`,
}));

export type DetectedMethod = "email" | "phone" | null;

export function detectMethod(value: string): DetectedMethod {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return "email";
  if (/^\+?[\d\s\-().]+$/.test(trimmed)) return "phone";
  return null;
}

type Props = {
  identifier: string;
  setIdentifier: (v: string) => void;
  country: CountryCode;
  setCountry: (c: CountryCode) => void;
  detectedMethod: DetectedMethod;
  error: string | null;
};

export default function IdentifierInput({
  identifier,
  setIdentifier,
  country,
  setCountry,
  detectedMethod,
  error,
}: Props) {
  return (
    <div className="mt-6 space-y-2">
      <div className="flex gap-2">
        {detectedMethod === "phone" && (
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="h-11 border border-black bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.dial}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          inputMode={detectedMethod === "phone" ? "numeric" : "email"}
          placeholder="Email or phone number"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="h-11 flex-1 border border-black bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          autoComplete="username"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
