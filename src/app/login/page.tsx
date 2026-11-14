'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="grid min-h-screen bg-slate-50 text-slate-900 lg:grid-cols-2">
      {/* Left Split Artwork & Brand Panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-sky-900 p-8 sm:p-12 lg:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: "url('/login-artwork.png')" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/65 via-indigo-950/35 to-indigo-950/75"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="INNOVARD"
              className="h-10 w-10 rounded-xl object-cover shadow-md ring-1 ring-white/25"
            />
            <span className="text-2xl font-extrabold tracking-tight text-white">
              INNOVARD
            </span>
          </div>

          <div className="mt-12 sm:mt-16">
            <h1 className="max-w-lg text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Không gian quản lý tiến độ và cộng tác dự án dành cho các đội nhóm.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-indigo-100/90 sm:text-base">
              Theo dõi Daily Standup, biên bản họp nhóm và tiến độ thực thi trên một nền tảng thống nhất.
            </p>
          </div>
        </div>

        <p className="relative z-10 mt-10 text-xs text-indigo-200/75">
          Copyright 2026 INNOVARD Workspace. All rights reserved.
        </p>
      </section>

      {/* Right Split Minimalist Sign-In Panel */}
      <main className="flex flex-col items-center justify-center bg-slate-50 px-6 py-12 sm:px-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center">
            <img
              src="/logo.png"
              alt="INNOVARD Logo"
              className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-lg shadow-indigo-600/15 ring-1 ring-slate-200"
            />
            <span className="mt-4 inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
              INNOVARD WORKSPACE HUB
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
              Đăng nhập
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Chọn tài khoản Google của bạn để tiếp tục vào không gian làm việc
            </p>
          </div>

          <div className="mt-7 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={isLoadingOAuth}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-indigo-600 shadow-2xs ring-1 ring-slate-200">
                  G
                </span>
                <span>
                  {isLoadingOAuth
                    ? 'Đang mở chọn tài khoản Google...'
                    : 'Tiếp tục với Google'}
                </span>
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                Google OAuth
              </span>
            </button>

            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={isLoadingOAuth}
              className="mt-3 w-full cursor-pointer rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingOAuth ? 'Đang chuyển hướng...' : 'Đăng nhập ngay'}
            </button>

            <p className="mt-3.5 border-t border-slate-100 pt-3 text-center text-[11px] leading-relaxed text-slate-400">
              Hệ thống tự động đồng bộ tên, ảnh đại diện Google và phân quyền đội nhóm của bạn.
            </p>
          </div>

          {authError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs leading-relaxed text-rose-700">
              {authError}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
