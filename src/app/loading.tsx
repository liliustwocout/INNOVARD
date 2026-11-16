import { ContentSkeleton } from '@/components/layout/AppSkeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải trang">
      <ContentSkeleton />
    </div>
  );
}
