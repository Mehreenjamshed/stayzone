"use client";
import { useState, useTransition } from "react";
import { cancelUnpaid } from "../../actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";

export function CancelButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  if (!confirming) return <Button variant="outline" onClick={() => setConfirming(true)}>Cancel reservation</Button>;
  return (
    <div className="space-y-3 rounded-2xl border border-danger/30 bg-danger-tint/50 p-5">
      <p>Cancel this reservation? The dates will be released. Nothing has been charged.</p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button variant="danger" disabled={pending} onClick={() => start(async () => { const r = await cancelUnpaid(bookingId); if (r.error) setError(r.error); })}>
          {pending ? "Cancelling…" : "Cancel reservation"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
      </div>
    </div>
  );
}
