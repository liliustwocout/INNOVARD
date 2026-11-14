'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatCountdownLabel, formatVietnameseDate, getTodayISO } from '@/lib/date-utils';
import type { MemberTask } from '@/types/innovard';

const STATUS_META: Record<
  MemberTask['status'],
  { label: string; style: string }
> = {
  todo: { label: 'Cần làm', style: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'Đang làm', style: 'bg-indigo-50 text-indigo-700' },
  done: { label: 'Hoàn thành', style: 'bg-emerald-50 text-emerald-700' },
};

const PRIORITY_META: Record<
  MemberTask['priority'],
  { label: string; style: string }
> = {
  high: { label: 'Cao', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  medium: {
    label: 'Trung bình',
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  low: { label: 'Thấp', style: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function ProgressView() {
  const {
    isAdmin,
    currentUser,
    currentTeam,
    teams,
    users,
    tasks,
    standups,
    addTask,
    addTaskForUser,
    updateTask,
    deleteTask,
  } = useApp();

  const [viewScope, setViewScope] = useState<'mine' | 'team' | 'all_teams'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberTask['status']>('all');
  const [showNewTask, setShowNewTask] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Development');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [priority, setPriority] = useState<MemberTask['priority']>('medium');
  const [targetTeamId, setTargetTeamId] = useState(currentTeam.id);
  const [targetUserId, setTargetUserId] = useState(currentUser?.id ?? '');

  const userById = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );

  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );

  const isUnassignedMember = !isAdmin && !currentTeam.id;

  const scopedTasks = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin && viewScope === 'all_teams') {
      return tasks;
    }
    if (!currentTeam.id) return [];
    if (isAdmin && viewScope === 'team') {
      return tasks.filter((t) => t.teamId === currentTeam.id);
    }
    return tasks.filter(
      (t) => t.userId === currentUser.id && t.teamId === currentTeam.id
    );
  }, [tasks, currentUser, currentTeam.id, isAdmin, viewScope]);

  const scopedStandupCount = useMemo(() => {
    if (!currentUser) return 0;
    if (isAdmin && viewScope === 'all_teams') {
      return standups.length;
    }
    if (!currentTeam.id) return 0;
    if (isAdmin && viewScope === 'team') {
      return standups.filter((s) => s.teamId === currentTeam.id).length;
    }
    return standups.filter(
      (s) => s.userId === currentUser.id && s.teamId === currentTeam.id
    ).length;
  }, [standups, currentUser, currentTeam.id, isAdmin, viewScope]);

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter(
      (t) => statusFilter === 'all' || t.status === statusFilter
    );
  }, [scopedTasks, statusFilter]);

  const doneCount = scopedTasks.filter((t) => t.status === 'done').length;
  const inProgressCount = scopedTasks.filter((t) => t.status === 'in_progress').length;
  const avgCompletion =
    scopedTasks.length > 0
      ? Math.round(
          scopedTasks.reduce((sum, t) => sum + t.progressPercent, 0) /
            scopedTasks.length
        )
      : 0;

  const assignableUsers = useMemo(() => {
    const teamMembers = users.filter((u) => u.teamId === targetTeamId);
    if (currentUser && !teamMembers.some((m) => m.id === currentUser.id)) {
      return [...teamMembers, currentUser];
    }
    return teamMembers.length > 0 ? teamMembers : users;
  }, [users, targetTeamId, currentUser]);

  const handleOpenNewTask = () => {
    setTargetTeamId(currentTeam.id);
    const defaultMember =
      users.find((u) => u.teamId === currentTeam.id && u.id === currentUser?.id) ??
      users.find((u) => u.teamId === currentTeam.id) ??
      currentUser;
    setTargetUserId(defaultMember?.id ?? '');
    setShowNewTask(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isAdmin) {
      addTaskForUser({
        userId: targetUserId || currentUser?.id || '',
        teamId: targetTeamId || currentTeam.id,
        title: title.trim(),
        category: category.trim() || 'Development',
        status: 'todo',
        dueDate: dueDate || getTodayISO(),
        priority,
        progressPercent: 0,
      });
    } else {
      addTask({
        teamId: currentTeam.id,
        title: title.trim(),
        category: category.trim() || 'Development',
        status: 'todo',
        dueDate: dueDate || getTodayISO(),
        priority,
        progressPercent: 0,
      });
    }
    setTitle('');
    setCategory('Development');
    setPriority('medium');
    setShowNewTask(false);
  };

  return (
    <div className="space-y-6">
      {isUnassignedMember && (
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Bạn chưa tham gia đội nào
            </p>
            <p className="mt-0.5 text-xs text-slate-700">
              Hãy chọn đội ở trang Đội của tôi để bắt đầu tạo và cập nhật đầu việc cá nhân theo dự án.
            </p>
          </div>
          <Link
            href="/team"
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Chọn đội để xin gia nhập
          </Link>
        </section>
      )}
      {/* Personal KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            {isAdmin && viewScope !== 'mine' ? 'Tiến độ trung bình' : 'Tiến độ cá nhân'}
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {avgCompletion}%
          </p>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${avgCompletion}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Đã hoàn thành
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            {doneCount}/{scopedTasks.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin && viewScope === 'all_teams'
              ? 'Toàn bộ hệ thống'
              : isAdmin && viewScope === 'team'
              ? `Trong đội ${currentTeam.name}`
              : 'Đầu việc của bạn'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Đang thực hiện
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {inProgressCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Task đang xử lý</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Lượt nộp Standup
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {scopedStandupCount} lượt
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin && viewScope === 'all_teams'
              ? 'Toàn bộ các đội'
              : currentTeam.id
              ? `Tại đội ${currentTeam.name}`
              : 'Chưa tham gia đội'}
          </p>
        </div>
      </div>

      {/* Tasks List & Management */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAdmin && viewScope === 'all_teams'
                ? 'Công việc & Tiến độ tất cả các đội'
                : isAdmin && viewScope === 'team'
                ? `Công việc & Tiến độ đội ${currentTeam.name}`
                : 'Công việc & Tiến độ của tôi'}
            </h2>
            <p className="text-xs text-slate-500">
              Cập nhật trạng thái và phần trăm hoàn thành công việc được giao
            </p>
          </div>

          <button
            type="button"
            disabled={isUnassignedMember}
            onClick={handleOpenNewTask}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:text-sm"
          >
            Thêm công việc
          </button>
        </div>

        {isAdmin && (
          <div className="mt-4 inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewScope('mine')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewScope === 'mine'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ công việc của tôi
            </button>
            <button
              type="button"
              onClick={() => setViewScope('team')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewScope === 'team'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả thành viên đội
            </button>
            <button
              type="button"
              onClick={() => setViewScope('all_teams')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewScope === 'all_teams'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả các đội
            </button>
          </div>
        )}

        {/* Status Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'todo', label: 'Cần làm' },
              { id: 'in_progress', label: 'Đang làm' },
              { id: 'done', label: 'Hoàn thành' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task Items */}
        <div className="mt-5 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Không có công việc nào trong trạng thái này. Nhấn &ldquo;Thêm công việc&rdquo; để tạo mới.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const prio = PRIORITY_META[task.priority];
              const countdown = formatCountdownLabel(task.dueDate);
              const owner = userById.get(task.userId);
              const taskTeam = teamById.get(task.teamId);
              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-indigo-200"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {task.category}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${prio.style}`}
                        >
                          Ưu tiên: {prio.label}
                        </span>
                        {isAdmin && taskTeam && (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {taskTeam.name} ({taskTeam.code})
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          Hạn: {formatVietnameseDate(task.dueDate)} ({countdown.text})
                        </span>
                      </div>
                      <h3
                        className={`text-sm font-bold sm:text-base ${
                          task.status === 'done'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h3>
                      {isAdmin && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <UserAvatar
                            src={owner?.avatarUrl ?? ''}
                            name={owner?.name ?? 'Thành viên'}
                            size="sm"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {owner?.name ?? 'Chưa rõ người phụ trách'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Progress slider */}
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={task.progressPercent}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateTask(task.id, {
                              progressPercent: val,
                              status:
                                val === 100
                                  ? 'done'
                                  : val === 0
                                  ? 'todo'
                                  : 'in_progress',
                            });
                          }}
                          className="w-24 accent-indigo-600"
                        />
                        <span className="w-9 text-right text-xs font-bold text-indigo-700">
                          {task.progressPercent}%
                        </span>
                      </div>

                      {/* Status dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.id, {
                            status: e.target.value as MemberTask['status'],
                          })
                        }
                        className={`rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold outline-none ${
                          STATUS_META[task.status].style
                        }`}
                      >
                        <option value="todo">Cần làm</option>
                        <option value="in_progress">Đang làm</option>
                        <option value="done">Hoàn thành</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Modal Add Task */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm công việc mới
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTask(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tên công việc *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Viết unit test cho API đăng nhập"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Danh mục
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mức ưu tiên
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as MemberTask['priority'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Đội thực hiện
                    </label>
                    <select
                      value={targetTeamId}
                      onChange={(e) => {
                        const nextTeamId = e.target.value;
                        setTargetTeamId(nextTeamId);
                        const firstInTeam = users.find((u) => u.teamId === nextTeamId);
                        setTargetUserId(firstInTeam?.id ?? currentUser?.id ?? '');
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Giao cho thành viên
                    </label>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      {assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'Admin' : 'Thành viên'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Hạn hoàn thành
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTask(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Tạo công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
