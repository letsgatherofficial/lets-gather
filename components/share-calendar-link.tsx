"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ShareCalendarLinkProps {
  calendarUrl: string;
}

export function ShareCalendarLink({ calendarUrl }: ShareCalendarLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-8 glass rounded-2xl p-6 border border-slate-100/80 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Copy size={16} className="text-brass" />
            Share This Calendar
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Share this single link with your audience. They can view all events and book appointments from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={calendarUrl}
            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-mono text-slate-600 w-64"
          />
          <button
            onClick={handleCopy}
            className="h-9 px-4 rounded-lg bg-brass text-white text-xs font-bold hover:bg-brass/90 transition flex items-center gap-2"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
