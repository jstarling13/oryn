"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-gray-500 mb-8">
          An unexpected error occurred. Please try again — if it persists, contact support.
        </p>
        <button
          onClick={reset}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors mr-3"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
