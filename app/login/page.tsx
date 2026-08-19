import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-5xl text-ink">
          Career Explorer
        </h1>
        <p className="mt-3 text-center text-sm text-slate">
          Shared coach login
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
