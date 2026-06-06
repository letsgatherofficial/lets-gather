"use client";

import { useTransition, useState } from "react";
import { Power, Users } from "lucide-react";
import { toggleDelegateTier } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function ToggleDelegateTier({ active, delegateCount }: { active: boolean; delegateCount: number }) {
  const [enabled, setEnabled] = useState(active);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4 rounded-md bg-white/78 p-4 shadow-line">
        <div>
          <p className="text-sm font-bold text-ink">{enabled ? "Delegate tier active" : "Delegate tier disabled"}</p>
          <p className="mt-1 text-sm text-ink/56">{delegateCount} delegate profile{delegateCount === 1 ? "" : "s"} available</p>
        </div>
        <div className={`h-3 w-3 rounded-full ${enabled ? "bg-jade" : "bg-ember"}`} />
      </div>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = !enabled;
            const result = await toggleDelegateTier(next);
            setMessage(result.message ?? null);
            if (result.ok) setEnabled(next);
          })
        }
      >
        <Power size={16} />
        {enabled ? "Disable delegate tier" : "Enable delegate tier"}
      </Button>
      {message && (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
          <Users size={15} />
          {message}
        </p>
      )}
    </div>
  );
}
