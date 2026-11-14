'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên (Admin)',
  member: 'Thành viên',
};

export default function ProfilePage() {
  const { isAdmin, currentUser, currentTeam, teams, updateCurrentUserProfile } = useApp();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [teamId, setTeamId] = useState('');

  const [github, setGithub] = useState('');
  const [discord, setDiscord] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setAvatarUrl(currentUser.avatarUrl);
    setTitle(currentUser.title);
    setBio(currentUser.bio);
    setSkillsText(currentUser.skills.join(', '));
    setTeamId(currentUser.teamId);
    setGithub(currentUser.connectedProfiles.github);
    setDiscord(currentUser.connectedProfiles.discord);
    setLinkedin(currentUser.connectedProfiles.linkedin);
    setPortfolio(currentUser.connectedProfiles.portfolio);
  }, [currentUser]);

  if (!currentUser) return null;

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name: name.trim() || currentUser.name,
      avatarUrl: avatarUrl.trim() || currentUser.avatarUrl,
      title: title.trim() || 'Thành viên dự án',
      bio: bio.trim(),
      teamId: isAdmin ? teamId : currentUser.teamId,
      skills: skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      connectedProfiles: {
        ...currentUser.connectedProfiles,
        github: github.trim(),
        discord: discord.trim(),
        linkedin: linkedin.trim(),
        portfolio: portfolio.trim(),
      },
    });
    setSavedNotice('Đã lưu thông tin định danh & hồ sơ kết nối!');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const connections = [
    {
      label: 'GitHub',
      value: github,
      connected: Boolean(github.trim()),
      isUrl: true,
    },
    {
      label: 'Discord',
      value: discord,
      connected: Boolean(discord.trim()),
      isUrl: false,
    },
    {
      label: 'LinkedIn',
      value: linkedin,
      connected: Boolean(linkedin.trim()),
      isUrl: true,
    },
    {
      label: 'Portfolio / Website',
      value: portfolio,
      connected: Boolean(portfolio.trim()),
      isUrl: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hồ sơ cá nhân
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý định danh tài khoản Google và các hồ sơ kết nối của bạn trong nhóm INNOVARD.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {savedNotice}
        </div>
      )}

      <form onSubmit={handleSaveAll} className="grid gap-6 lg:grid-cols-12">
        {/* Left: Định danh (Identity) */}
        <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-7">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Định danh</h2>
            <p className="text-xs text-slate-500">
              Đồng bộ từ tài khoản Google (Tên, Avatar, Email) và thông tin chuyên môn
            </p>
          </div>

          {/* Google Identity Card */}
          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center">
            <UserAvatar src={avatarUrl} name={name || currentUser.name} size="xl" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {name || currentUser.name}
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Đã xác thực Google
                </span>
              </div>
              <p className="text-xs text-slate-600">{currentUser.email}</p>
              <p className="text-xs font-medium text-indigo-600">
                Vai trò: {ROLE_LABELS[currentUser.role] ?? 'Thành viên'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Tên hiển thị (Google Name)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Đội trực thuộc
              </label>
              {isAdmin ? (
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  <span className="text-sm font-medium text-slate-800">
                    {currentTeam.name} ({currentTeam.code})
                  </span>
                  <Link
                    href="/team"
                    className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Xin gia nhập đội khác
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              URL Avatar Google
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://lh3.googleusercontent.com/..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Chức danh / Chuyên môn
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Full-stack Developer"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Giới thiệu ngắn (Bio)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Kỹ năng (ngăn cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Next.js, TypeScript, Figma, Supabase"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </section>

        {/* Right: Hồ sơ kết nối (Connected Profiles) */}
        <section className="flex flex-col justify-between space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-5">
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Hồ sơ kết nối</h2>
              <p className="text-xs text-slate-500">
                Liên kết các tài khoản cộng tác để thành viên nhóm dễ dàng kết nối
              </p>
            </div>

            {/* Connection Status Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {connections.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-3 ${
                    item.connected
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {item.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.connected
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.connected ? 'Đã kết nối' : 'Chưa gắn'}
                    </span>
                  </div>
                  {item.connected && item.isUrl ? (
                    <a
                      href={item.value}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 block truncate text-[11px] font-medium text-indigo-600 hover:underline"
                    >
                      Mở liên kết
                    </a>
                  ) : (
                    <p className="mt-1.5 truncate text-[11px] text-slate-500">
                      {item.value || 'Chưa cập nhật'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Discord Username / Handle
                </label>
                <input
                  type="text"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="username#2026"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Website / Portfolio URL
                </label>
                <input
                  type="url"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="https://portfolio.dev"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Lưu hồ sơ cá nhân
          </button>
        </section>
      </form>
    </div>
  );
}
