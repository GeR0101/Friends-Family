"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The chat now lives directly on the dashboard — keep this route as a redirect
// for old links/bookmarks.
export default function ChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
