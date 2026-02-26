
type EmailAuthProps = {
  email: string;
  setEmail: (e: string) => void;
  error: string | null;
};

export default function EmailAuth({ email, setEmail, error }: EmailAuthProps) {
  return (
    <div className="mt-8 space-y-2">
      <label className="block text-sm font-medium text-gray-800">
        Email address
      </label>

      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
