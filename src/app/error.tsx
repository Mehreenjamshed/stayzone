"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]); // Sentry hooks in here when configured
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">This page didn’t load</h1>
      <p className="mt-3 text-muted">Try again. If it keeps happening, contact support{error.digest ? <> and mention code <span className="num">{error.digest}</span></> : null}.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
