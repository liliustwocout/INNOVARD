'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

interface ProjectHeaderProps {
  activeTab: 'submissions' | 'progress';
  onTabSelect?: (tab: 'submissions' | 'progress') => void;
}

export function ProjectHeader({ activeTab, onTabSelect }: ProjectHeaderProps) {
  const { currentTeam } = useApp();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              currentTeam.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {currentTeam.id ? `${currentTeam.name} · ${currentTeam.code}` : 'Chưa có đội'}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {currentTeam.id
              ? `Dự án: ${currentTeam.projectName}`
              : 'Bạn chưa tham gia dự án của đội nào'}
          </h1>
        </div>

        {currentTeam.id ? (
          <a
            href={currentTeam.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 sm:text-sm"
          >
            Repo nhóm
          </a>
        ) : (
          <Link
            href="/team"
            className="self-start rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 sm:text-sm"
          >
            Chọn đội để xin gia nhập
          </Link>
        )}
      </div>

      {/* Sub-page Tabs */}
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
        {onTabSelect ? (
          <>
            <button
              type="button"
              onClick={() => onTabSelect('submissions')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === 'submissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Bài nộp của tôi
            </button>
            <button
              type="button"
              onClick={() => onTabSelect('progress')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === 'progress'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tiến độ của tôi
            </button>
          </>
        ) : (
          <>
            <Link
              href="/project/submissions"
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === 'submissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Bài nộp của tôi
            </Link>
            <Link
              href="/project/progress"
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === 'progress'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tiến độ của tôi
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
