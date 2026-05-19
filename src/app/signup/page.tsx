import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold text-slate-900">
        Create an account
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        We&apos;ll use your email to send booking confirmations.
      </p>
      <SignupForm />
    </div>
  );
}
