'use client';

import React from 'react';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProgressView } from '@/components/project/ProgressView';

export default function ProjectProgressPage() {
  return (
    <div className="space-y-6">
      <ProjectHeader activeTab="progress" />
      <ProgressView />
    </div>
  );
}
