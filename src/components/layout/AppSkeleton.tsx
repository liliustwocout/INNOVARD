/**
 * Doherty threshold: while auth and data load, show the shape of the workspace
 * (rail + header + cards) instead of a splash screen, so the wait reads as progress.
 */
export function AppSkeleton() {
  return (
    <div
      className="flex min-h-screen bg-slate-50"
      role="status"
      aria-live="polite"
      aria-label="Đang tải không gian làm việc"
    >
      <aside
        aria-hidden="true"
        className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col gap-6 px-4 py-5 lg:flex"
        style={{ backgroundColor: 'var(--rail-bg)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <div className="h-3.5 w-24 rounded-full" style={{ backgroundColor: 'var(--rail-raised)' }} />
        </div>
        <div className="h-10 rounded-xl" style={{ backgroundColor: 'var(--rail-raised)' }} />
        <div className="space-y-2.5">
          {[72, 56, 64, 80, 60, 52].map((w, i) => (
            <div key={i} className="flex h-10 items-center gap-3 px-3">
              <div className="h-4 w-4 rounded" style={{ backgroundColor: 'var(--rail-raised)' }} />
              <div
                className="h-2.5 rounded-full"
                style={{ width: `${w}%`, backgroundColor: 'var(--rail-raised)' }}
              />
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg object-cover" />
          <div className="ui-skeleton h-3 w-28 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-6xl flex-1 p-5 sm:p-8 lg:p-10">
          <ContentSkeleton />
        </div>
      </div>
    </div>
  );
}

/** The page area only: used by route-level loading inside the shell. */
export function ContentSkeleton() {
  return (
    <div aria-hidden="true">
          <div className="ui-skeleton h-7 w-56 rounded-lg" />
          <div className="ui-skeleton mt-3 h-3.5 w-80 max-w-full rounded-full" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="ui-skeleton h-3 w-20 rounded-full" />
                <div className="ui-skeleton mt-4 h-6 w-16 rounded-md" />
                <div className="ui-skeleton mt-4 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-0">
                <div className="ui-skeleton h-8 w-8 rounded-full" />
                <div className="ui-skeleton h-3 w-1/3 rounded-full" />
                <div className="ui-skeleton ml-auto h-3 w-16 rounded-full" />
              </div>
            ))}
          </div>
    </div>
  );
}
