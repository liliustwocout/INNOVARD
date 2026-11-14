'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { SubmissionsView } from '@/components/project/SubmissionsView';
import { ProgressView } from '@/components/project/ProgressView';

function ProjectPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'submissions' | 'progress'>(
    tabParam === 'progress' ? 'progress' : 'submissions'
  );

  useEffect(() => {
    if (tabParam === 'progress' || tabParam === 'submissions') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="space-y-6">
      <ProjectHeader activeTab={activeTab} onTabSelect={setActiveTab} />
      {activeTab === 'submissions' ? <SubmissionsView /> : <ProgressView />}
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải không gian dự án...
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}
