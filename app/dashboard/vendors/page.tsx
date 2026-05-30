"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Vendors are managed in the main dashboard via tabs.
// This route redirects there with the vendors tab active.
export default function VendorsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return null;
}
