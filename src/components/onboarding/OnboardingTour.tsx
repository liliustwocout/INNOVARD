'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export const TOUR_EVENT_NAME = 'innovard:start-tour';

export function triggerOnboardingTour() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOUR_EVENT_NAME));
}

interface TourStep {
  id: string;
  category: string;
  title: string;
  description: string;
  adminOnly?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'kpi-profile',
    category: 'Trang tổng quan',
    title: 'Hồ sơ cá nhân',
    description:
      'Theo dõi tỷ lệ hoàn thiện hồ sơ của bạn. Nhấn vào thẻ này để cập nhật kỹ năng, tiểu sử và các liên kết GitHub hoặc LinkedIn.',
  },
  {
    id: 'kpi-team',
    category: 'Trang tổng quan',
    title: 'Thành viên đội',
    description:
      'Xem sĩ số đội hiện tại so với giới hạn tối đa của chương trình. Nhấn vào đây để quản lý thành viên hoặc xin gia nhập đội khác.',
  },
  {
    id: 'kpi-progress',
    category: 'Trang tổng quan',
    title: 'Tiến độ của tôi',
    description:
      'Kiểm tra tỷ lệ hoàn thành công việc cá nhân trong dự án. Nhấn để mở bảng Kanban và cập nhật trạng thái các đầu việc được giao.',
  },
  {
    id: 'overview-deadlines',
    category: 'Trang tổng quan',
    title: 'Deadline & Đếm ngược',
    description:
      'Hiển thị đếm ngược thời gian thực tới hạn nộp Daily Standup hôm nay, báo cáo tuần và các sự kiện sắp tới. Nhấn vào từng dòng để đi tới trang nộp bài.',
  },
  {
    id: 'overview-github',
    category: 'Trang tổng quan',
    title: 'Kho mã nguồn GitHub',
    description:
      'Mở nhanh repository GitHub chính thức của đội để theo dõi mã nguồn, Pull Request và đồng bộ công việc lập trình.',
  },
  {
    id: 'overview-discord',
    category: 'Trang tổng quan',
    title: 'Kênh thảo luận Discord',
    description:
      'Truy cập nhanh server Discord của đội để họp standup, trao đổi kỹ thuật và cập nhật thông báo nhóm.',
  },
  {
    id: 'overview-my-team',
    category: 'Trang tổng quan',
    title: 'Không gian Đội của tôi',
    description:
      'Tóm tắt thông tin dự án và danh sách thành viên trong nhóm của bạn. Dùng nút mở rộng để vào trang chi tiết đội.',
  },
  {
    id: 'sidebar-search',
    category: 'Thanh điều hướng',
    title: 'Tìm kiếm nhanh trang (/)',
    description:
      'Nhấn phím "/" trên bàn phím hoặc nhập từ khóa vào ô này để lọc và chuyển nhanh tới bất kỳ chức năng nào.',
  },
  {
    id: 'nav-/project/submissions',
    category: 'Thanh điều hướng',
    title: 'Bài nộp & Daily Standup',
    description:
      'Khu vực quan trọng mỗi ngày: gửi báo cáo Daily Standup trước giờ quy định, nộp tài liệu dự án và theo dõi nhận xét.',
  },
  {
    id: 'nav-/calendar',
    category: 'Thanh điều hướng',
    title: 'Lịch & Sự kiện',
    description:
      'Xem toàn bộ lịch họp, workshop, hạn nộp sản phẩm của chương trình và tạo sự kiện mới cho đội của bạn.',
  },
  {
    id: 'nav-/admin',
    category: 'Thanh điều hướng',
    title: 'Quản trị & Nhật ký hệ thống',
    description:
      'Khu vực dành riêng cho Admin để phê duyệt yêu cầu gia nhập đội, theo dõi mọi nhật ký nộp bài và cấu hình thông số hệ thống.',
    adminOnly: true,
  },
  {
    id: 'sidebar-user',
    category: 'Thanh điều hướng',
    title: 'Tài khoản & Đăng xuất',
    description:
      'Hiển thị trạng thái kết nối cơ sở dữ liệu trực tiếp, thông tin tài khoản hiện tại và nút Thoát để đăng xuất khỏi hệ thống.',
  },
];

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 8;
const VIEWPORT_EDGE = 12;
const TOOLTIP_GAP = 16;

function findVisibleTarget(stepId: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${stepId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return el;
}

function clamp(val: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(val, min), max);
}

export function OnboardingTour() {
  const { isHydrated, isAdmin, currentUser } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [activeSteps, setActiveSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 368,
    height: 240,
  });

  const pendingManualStartRef = useRef(false);
  const autoCheckedUserRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const storageKey = currentUser
    ? `innovard_onboarding_done_${currentUser.id}`
    : null;

  const markTourCompleted = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  }, [storageKey]);

  const computeAvailableSteps = useCallback(() => {
    return TOUR_STEPS.filter((step) => {
      if (step.adminOnly && !isAdmin) return false;
      return findVisibleTarget(step.id) !== null;
    });
  }, [isAdmin]);

  const startTourNow = useCallback(() => {
    const visible = computeAvailableSteps();
    if (visible.length === 0) return;
    setActiveSteps(visible);
    setStepIndex(0);
    setIsOpen(true);
  }, [computeAvailableSteps]);

  const finishTour = useCallback(() => {
    markTourCompleted();
    setIsOpen(false);
    setTargetBox(null);
  }, [markTourCompleted]);

  // Listen for manual replay trigger from any page
  useEffect(() => {
    const handleStartEvent = () => {
      if (!currentUser || !isHydrated) return;
      if (pathname !== '/overview') {
        pendingManualStartRef.current = true;
        router.push('/overview');
        return;
      }
      startTourNow();
    };

    window.addEventListener(TOUR_EVENT_NAME, handleStartEvent);
    return () => window.removeEventListener(TOUR_EVENT_NAME, handleStartEvent);
  }, [currentUser, isHydrated, pathname, router, startTourNow]);

  // Resume manual tour once navigation to /overview settles
  useEffect(() => {
    if (!pendingManualStartRef.current) return;
    if (!isHydrated || !currentUser || pathname !== '/overview') return;

    const timer = window.setTimeout(() => {
      pendingManualStartRef.current = false;
      startTourNow();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isHydrated, currentUser, pathname, startTourNow]);

  // Auto-start tour once on /overview for newly logged-in users
  useEffect(() => {
    if (!isHydrated || !currentUser || !storageKey) return;
    if (pathname !== '/overview') return;
    if (autoCheckedUserRef.current === currentUser.id) return;

    autoCheckedUserRef.current = currentUser.id;

    let alreadyDone = false;
    try {
      alreadyDone = window.localStorage.getItem(storageKey) === '1';
    } catch {
      alreadyDone = false;
    }

    if (alreadyDone) return;

    const timer = window.setTimeout(() => {
      startTourNow();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isHydrated, currentUser, storageKey, pathname, startTourNow]);

  // Close tour cleanly if user logs out or navigates away
  useEffect(() => {
    if (!currentUser || pathname !== '/overview') {
      setIsOpen(false);
      setTargetBox(null);
    }
  }, [currentUser, pathname]);

  const currentStep = activeSteps[stepIndex] ?? null;

  const measureCurrentTarget = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = findVisibleTarget(currentStep.id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTargetBox({
      top: rect.top - SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    });
  }, [isOpen, currentStep]);

  // Scroll target element into view and track rect during scroll/resize
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const el = findVisibleTarget(currentStep.id);
    if (!el) {
      if (stepIndex < activeSteps.length - 1) {
        setStepIndex((prev) => prev + 1);
      } else {
        finishTour();
      }
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    measureCurrentTarget();

    let rafId = 0;
    const scheduleMeasure = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        measureCurrentTarget();
      });
    };

    const settleFast = window.setTimeout(measureCurrentTarget, 150);
    const settleLate = window.setTimeout(measureCurrentTarget, 380);

    window.addEventListener('scroll', scheduleMeasure, true);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      window.clearTimeout(settleFast);
      window.clearTimeout(settleLate);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [
    isOpen,
    currentStep,
    stepIndex,
    activeSteps.length,
    finishTour,
    measureCurrentTarget,
  ]);

  // Measure tooltip card dimensions after each step change
  useLayoutEffect(() => {
    if (!isOpen || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCardSize({ width: rect.width, height: rect.height });
    }
  }, [isOpen, stepIndex, currentStep]);

  // Keyboard shortcuts while tour is active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishTour();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (stepIndex < activeSteps.length - 1) {
          setStepIndex((prev) => prev + 1);
        } else {
          finishTour();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStepIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex, activeSteps.length, finishTour]);

  const tooltipPosition = useMemo(() => {
    if (typeof window === 'undefined' || !targetBox) {
      return { top: 24, left: 24 };
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = Math.min(viewportW - VIEWPORT_EDGE * 2, cardSize.width || 368);
    const cardH = cardSize.height || 240;

    // Sidebar elements on desktop: place tooltip to the right of the spotlighted item
    if (
      targetBox.left < 280 &&
      viewportW >= 1024 &&
      targetBox.left + targetBox.width + TOOLTIP_GAP + cardW <=
        viewportW - VIEWPORT_EDGE
    ) {
      return {
        top: clamp(targetBox.top, VIEWPORT_EDGE, viewportH - cardH - VIEWPORT_EDGE),
        left: targetBox.left + targetBox.width + TOOLTIP_GAP,
      };
    }

    // Prefer placing below target if sufficient room remains
    if (
      targetBox.top + targetBox.height + TOOLTIP_GAP + cardH <=
      viewportH - VIEWPORT_EDGE
    ) {
      return {
        top: targetBox.top + targetBox.height + TOOLTIP_GAP,
        left: clamp(targetBox.left, VIEWPORT_EDGE, viewportW - cardW - VIEWPORT_EDGE),
      };
    }

    // Fallback above target
    if (targetBox.top - TOOLTIP_GAP - cardH >= VIEWPORT_EDGE) {
      return {
        top: targetBox.top - TOOLTIP_GAP - cardH,
        left: clamp(targetBox.left, VIEWPORT_EDGE, viewportW - cardW - VIEWPORT_EDGE),
      };
    }

    // Tall target occupying viewport: anchor neatly near bottom-right inside screen
    return {
      top: clamp(viewportH - cardH - 20, VIEWPORT_EDGE, viewportH - cardH - VIEWPORT_EDGE),
      left: clamp(
        targetBox.left + targetBox.width - cardW,
        VIEWPORT_EDGE,
        viewportW - cardW - VIEWPORT_EDGE
      ),
    };
  }, [targetBox, cardSize]);

  if (!isOpen || !currentStep || !targetBox) {
    return null;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === activeSteps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Hướng dẫn sử dụng bước ${stepIndex + 1} trên ${activeSteps.length}`}
    >
      {/* Click blocker over dimmed background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[100] cursor-default bg-transparent"
      />

      {/* Focused spotlight cutout: surrounding area darkened, target stays bright */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[101] rounded-2xl ring-4 ring-indigo-500/90 ring-offset-2 ring-offset-white/20 transition duration-200 ease-out"
        style={{
          top: targetBox.top,
          left: targetBox.left,
          width: targetBox.width,
          height: targetBox.height,
          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
        }}
      />

      {/* Floating instruction card */}
      <div
        ref={cardRef}
        className="fixed z-[102] w-[min(92vw,368px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition duration-200 ease-out"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
              Bước {stepIndex + 1} / {activeSteps.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {currentStep.category}
            </span>
          </div>

          <button
            type="button"
            onClick={finishTour}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            Bỏ qua
          </button>
        </div>

        <h3 className="mt-3 text-base font-extrabold tracking-tight text-slate-900">
          {currentStep.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          {currentStep.description}
        </p>

        {/* Progress dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {activeSteps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              aria-label={`Đi tới bước ${idx + 1}: ${step.title}`}
              onClick={() => setStepIndex(idx)}
              className={`h-1.5 rounded-full transition ${
                idx === stepIndex
                  ? 'w-5 bg-indigo-600'
                  : idx < stepIndex
                  ? 'w-2 bg-indigo-300'
                  : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                finishTour();
              } else {
                setStepIndex((prev) => prev + 1);
              }
            }}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            {isLast ? 'Hoàn tất' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
}
