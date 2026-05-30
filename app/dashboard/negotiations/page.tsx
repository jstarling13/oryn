"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Negotiations are managed in the main dashboard via tabs.
// This route redirects there.
export default function NegotiationsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard?tab=negotiations"); }, [router]);
  return null;
}
