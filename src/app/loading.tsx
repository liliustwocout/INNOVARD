export default function Loading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40"
      />
      <div
        aria-hidden="true"
        className="innovard-float pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="innovard-float pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl"
        style={{ animationDelay: '1.2s' }}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur-xs">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-slate-100 border-t-indigo-600 border-r-sky-500" />
          <div className="innovard-spin-reverse absolute inset-2.5 rounded-full border-2 border-transparent border-b-indigo-400 border-l-sky-400" />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 text-xs font-extrabold tracking-wider text-white shadow-sm">
            IN
          </div>
        </div>

        <span className="mt-5 inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
          WORKSPACE HUB
        </span>

        <p className="innovard-shimmer mt-2 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600 bg-clip-text text-2xl font-black tracking-tight text-transparent">
          INNOVARD
        </p>

        <div className="mt-2 flex items-center justify-center gap-1.5">
          <p className="text-sm font-medium text-slate-600">
            Đang tải không gian làm việc...
          </p>
          <span className="inline-flex items-center gap-1">
            <span
              className="innovard-dot-bounce h-1.5 w-1.5 rounded-full bg-indigo-600"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="innovard-dot-bounce h-1.5 w-1.5 rounded-full bg-indigo-500"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="innovard-dot-bounce h-1.5 w-1.5 rounded-full bg-sky-500"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        </div>

        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="innovard-progress h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600" />
        </div>
      </div>
    </div>
  );
}
