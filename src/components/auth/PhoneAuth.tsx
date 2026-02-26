import {getCountries, getCountryCallingCode, CountryCode} from "libphonenumber-js";

const COUNTRIES = getCountries().map((code) => ({
  code,
  dial: `+${getCountryCallingCode(code)}`,
}));

type PhoneAuthProps = {
  country: CountryCode;
  setCountry: (c: CountryCode) => void;
  phone: string;
  setPhone: (p: string) => void;
  error: string | null;
};

export default function PhoneAuth({
  country,
  setCountry,
  phone,
  setPhone,
  error,
}: PhoneAuthProps) {
  return (
    <div className="mt-8 space-y-2">
      <label className="block text-sm font-medium text-gray-800">
        Phone number
      </label>

      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) =>
            setCountry(e.target.value as CountryCode)
          }
          className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.dial}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="numeric"
          placeholder="National number"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, ""))
          }
          className="h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
