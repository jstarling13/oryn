import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-gray-900">
            Oryn
          </a>
          <p className="text-gray-500 text-sm mt-1">Stop paying more than you should.</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              card: "shadow-sm border border-gray-200",
              headerTitle: "text-gray-900 font-semibold",
              formButtonPrimary:
                "bg-amber-600 hover:bg-amber-700 text-white font-medium",
              footerActionLink: "text-amber-600 hover:text-amber-700",
            },
          }}
          afterSignInUrl="/dashboard"
          redirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
