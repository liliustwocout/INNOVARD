'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { isHydrated, currentUser, loginWithGoogleOAuth } = useApp();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);

  useEffect(() => {
    if (isHydrated && currentUser) {
      router.replace('/overview');
    }
  }, [isHydrated, currentUser, router]);

  const handleGoogleOAuth = async () => {
    setAuthError(null);
    setIsLoadingOAuth(true);
    const res = await loginWithGoogleOAuth();
    setIsLoadingOAuth(false);
    if (res.error) {
      setAuthError(res.error);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 text-slate-900 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel: the logo's navy tile, with the artwork behind it */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
        style={{ backgroundColor: 'var(--rail-bg)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('/login-artwork.png')" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: 'var(--rail-bg)', opacity: 0.55 }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo.png"
            alt=""
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15"
          />
          <span className="text-xl font-bold tracking-tight text-white">INNOVARD</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-white xl:text-[44px]">
            Tiến độ của cả đội, đi lên từng ngày.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--rail-muted)]">
            Daily Standup, biên bản họp nhóm, task và lịch deadline trên một không gian làm việc.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[var(--rail-muted)]">© 2026 INNOVARD Workspace</p>
      </section>

      {/* Sign-in */}
      <main className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="ui-page w-full max-w-[380px]">
          <img
            src="/logo.png"
            alt="INNOVARD"
            className="h-12 w-12 rounded-2xl object-cover shadow-md lg:hidden"
          />
          <h2 className="mt-6 text-[28px] leading-tight font-bold tracking-tight text-slate-900 lg:mt-0">
            Đăng nhập
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Dùng tài khoản Google của bạn. Tên, ảnh đại diện và đội nhóm được đồng bộ tự động.
          </p>

          <button
            type="button"
            onClick={handleGoogleOAuth}
            disabled={isLoadingOAuth}
            aria-busy={isLoadingOAuth}
            className="ui-anticipate mt-8 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 text-[15px] font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-progress disabled:opacity-70"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900"
            >
              G
            </span>
            {isLoadingOAuth ? 'Đang mở Google…' : 'Tiếp tục với Google'}
            {!isLoadingOAuth && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
          </button>

          {authError && (
            <div
              role="alert"
              className="ui-shake mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700"
            >
              {authError}
            </div>
          )}

          <p className="mt-8 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
            Lần đầu đăng nhập và chưa có đội? Bạn có thể chọn đội và gửi yêu cầu gia nhập ngay
            trong ứng dụng.
          </p>
        </div>
      </main>
    </div>
  );
}
