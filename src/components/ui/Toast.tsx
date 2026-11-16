'use client';

import { CircleCheck } from 'lucide-react';

/**
 * Success confirmation that floats above the page.
 * Moving in arcs: X eases out while Y eases in, so it swoops into the corner;
 * exaggerated feedback: the check pops as it lands.
 */
export function Toast({ message }: { message: string }) {
  return (
    <div className="ui-arc pointer-events-none fixed right-4 bottom-24 z-[80] max-w-[calc(100vw-2rem)] lg:right-8 lg:bottom-8">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white py-3 pr-5 pl-3 text-sm font-medium text-slate-800 shadow-xl"
      >
        <span className="ui-success flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 [animation-delay:240ms]">
          <CircleCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        {message}
      </div>
    </div>
  );
}
