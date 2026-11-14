'use client';

import React from 'react';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { SubmissionsView } from '@/components/project/SubmissionsView';

export default function ProjectSubmissionsPage() {
  return (
    <div className="space-y-6">
      <ProjectHeader activeTab="submissions" />
      <SubmissionsView />
    </div>
  );
}
