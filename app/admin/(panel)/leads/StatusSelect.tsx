"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus } from "./actions";

const STATUSES = ["new", "contacted", "call_booked", "qualified", "won", "lost"];

export default function StatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="adm-status-wrap">
      <select
        className={`adm-status st-${status}`}
        defaultValue={status}
        disabled={pending}
        aria-label="Lead status"
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          startTransition(async () => {
            const res = await updateLeadStatus(leadId, next);
            if (res.error) setError(res.error);
            router.refresh();
          });
        }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      {error && <span className="adm-error">{error}</span>}
    </span>
  );
}
