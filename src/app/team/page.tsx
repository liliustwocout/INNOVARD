'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { isAdminEmail } from '@/lib/supabase-mappers';
import type { Team, TeamRole } from '@/types/innovard';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ROLE_CONFIG: Record<TeamRole, { label: string; badge: string }> = {
  admin: {
    label: 'Admin',
    badge: 'bg-indigo-600 text-white border-indigo-600',
  },
  member: {
    label: 'Thành viên',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export default function TeamPage() {
  const {
    isAdmin,
    currentUser,
    teams,
    currentTeam,
    users,
    systemConfig,
    joinRequests,
    createTeam,
    updateTeamInfo,
    addTeamMember,
    updateUserByAdmin,
    deleteUserByAdmin,
    submitJoinRequest,
    cancelJoinRequest,
    resolveJoinRequest,
  } = useApp();

  const teamMembers = useMemo(
    () => (currentTeam.id ? users.filter((u) => u.teamId === currentTeam.id) : []),
    [users, currentTeam.id]
  );

  const unassignedUsers = useMemo(
    () => users.filter((u) => !u.teamId),
    [users]
  );

  const otherUsersNotInTeam = useMemo(
    () => (currentTeam.id ? users.filter((u) => u.teamId !== currentTeam.id) : []),
    [users, currentTeam.id]
  );

  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );

  const myPendingRequest = currentUser?.connectedProfiles.pendingJoinRequest ?? null;

  // Edit Team Modal state (Admin)
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [teamName, setTeamName] = useState(currentTeam.name);
  const [projectName, setProjectName] = useState(currentTeam.projectName);
  const [slogan, setSlogan] = useState(currentTeam.slogan);
  const [description, setDescription] = useState(currentTeam.description);
  const [mentorName, setMentorName] = useState(currentTeam.mentorName);
  const [githubRepoUrl, setGithubRepoUrl] = useState(currentTeam.githubRepoUrl);
  const [discordInviteUrl, setDiscordInviteUrl] = useState(
    currentTeam.discordInviteUrl
  );
  const [progress, setProgress] = useState(currentTeam.progress);

  // Create Team Modal state (Admin)
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamProject, setNewTeamProject] = useState('');
  const [newTeamMentor, setNewTeamMentor] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Add Member Modal state (Admin)
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberTitle, setMemberTitle] = useState('Thành viên phát triển');
  const [memberRole, setMemberRole] = useState<TeamRole>('member');
  const [memberSkills, setMemberSkills] = useState('TypeScript, React');
  const [memberGithub, setMemberGithub] = useState('');
  const [memberDiscord, setMemberDiscord] = useState('');

  // Join Team Modal state (Member)
  const [joinTargetTeam, setJoinTargetTeam] = useState<Team | null>(null);
  const [joinMessage, setJoinMessage] = useState('');

  const openEditModal = () => {
    setTeamName(currentTeam.name);
    setProjectName(currentTeam.projectName);
    setSlogan(currentTeam.slogan);
    setDescription(currentTeam.description);
    setMentorName(currentTeam.mentorName);
    setGithubRepoUrl(currentTeam.githubRepoUrl);
    setDiscordInviteUrl(currentTeam.discordInviteUrl);
    setProgress(currentTeam.progress);
    setShowEditTeam(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    updateTeamInfo(currentTeam.id, {
      name: teamName.trim() || currentTeam.name,
      projectName: projectName.trim() || currentTeam.projectName,
      slogan: slogan.trim(),
      description: description.trim(),
      mentorName: mentorName.trim(),
      githubRepoUrl: githubRepoUrl.trim(),
      discordInviteUrl: discordInviteUrl.trim(),
      progress: Number(progress),
    });
    setShowEditTeam(false);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newTeamCode.trim() || !newTeamName.trim()) return;
    createTeam({
      code: newTeamCode.trim().toUpperCase(),
      name: newTeamName.trim(),
      projectName: newTeamProject.trim() || 'Dự án mới',
      slogan: '',
      description: newTeamDesc.trim(),
      mentorName: newTeamMentor.trim() || 'Chưa cập nhật',
      githubRepoUrl: 'https://github.com',
      discordInviteUrl: 'https://discord.com',
      progress: 0,
    });
    setNewTeamCode('');
    setNewTeamName('');
    setNewTeamProject('');
    setNewTeamMentor('');
    setNewTeamDesc('');
    setShowCreateTeam(false);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !memberName.trim() || !memberEmail.trim()) return;
    addTeamMember({
      name: memberName.trim(),
      email: memberEmail.trim(),
      avatarUrl: '',
      role: memberRole,
      title: memberTitle.trim() || 'Thành viên dự án',
      bio: `Thành viên tham gia nhóm ${currentTeam.name}.`,
      skills: memberSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      teamId: currentTeam.id,
      connectedProfiles: {
        github: memberGithub.trim(),
        discord: memberDiscord.trim(),
        linkedin: '',
        portfolio: '',
        systemRole: memberRole,
      },
    });
    setMemberName('');
    setMemberEmail('');
    setMemberTitle('Thành viên phát triển');
    setMemberRole('member');
    setMemberSkills('TypeScript, React');
    setMemberGithub('');
    setMemberDiscord('');
    setShowAddMember(false);
  };

  const handleSubmitJoinRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinTargetTeam) return;
    submitJoinRequest(joinTargetTeam.id, joinMessage);
    setJoinMessage('');
    setJoinTargetTeam(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Đội của tôi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Quản lý thông tin đề tài, liên kết kho mã nguồn & điều phối thành viên các đội.'
              : 'Xem thông tin đội hiện tại của bạn và gửi yêu cầu xin gia nhập các đội khác.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setShowCreateTeam(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 sm:text-sm"
            >
              Tạo đội mới
            </button>
            {Boolean(currentTeam.id) && (
              <>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 sm:text-sm"
                >
                  Chỉnh sửa thông tin đội
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 sm:text-sm"
                >
                  Thêm thành viên
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pending Join Requests Alert for Admin */}
      {isAdmin && joinRequests.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Yêu cầu xin gia nhập đội đang chờ duyệt ({joinRequests.length})
              </h2>
              <p className="text-xs text-amber-800">
                Phê duyệt trực tiếp hoặc từ chối yêu cầu chuyển đội của thành viên.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {joinRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200/80 bg-white p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar src={req.userAvatar} name={req.userName} size="sm" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {req.userName}{' '}
                      <span className="font-normal text-slate-500">
                        ({req.userEmail})
                      </span>
                    </p>
                    <p className="text-xs text-indigo-700">
                      Xin gia nhập đội: <strong>{req.toTeamName}</strong>
                      {req.message ? ` — "${req.message}"` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => resolveJoinRequest(req.userId, 'approved')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Chấp thuận
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveJoinRequest(req.userId, 'rejected')}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin Quick-Assign Panel for Unassigned Accounts */}
      {isAdmin && Boolean(currentTeam.id) && unassignedUsers.length > 0 && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-indigo-950">
                Tài khoản mới chưa có đội ({unassignedUsers.length}) — Thêm trực tiếp không cần chờ yêu cầu
              </h2>
              <p className="text-xs text-indigo-800">
                Những tài khoản đã đăng nhập nhưng chưa thuộc đội nào. Bấm để xếp thẳng vào đội{' '}
                <strong>{currentTeam.name}</strong> ngay lập tức.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {unassignedUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-indigo-200/80 bg-white p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar src={u.avatarUrl} name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {u.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {u.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateUserByAdmin(u.id, { teamId: currentTeam.id })}
                  className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
                >
                  Thêm ngay vào {currentTeam.name}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team Info Card & Members Directory */}
      {!currentTeam.id ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Chưa có đội
            </span>
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-slate-900">
            Bạn chưa tham gia đội nào
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
            Tài khoản mới đăng nhập sẽ ở trạng thái chưa có đội để tránh gán nhầm vào nhóm có sẵn. Vui lòng chọn một đội ở danh sách bên dưới và bấm &ldquo;Xin gia nhập đội&rdquo;, hoặc chờ Admin xếp đội cho bạn.
          </p>
        </section>
      ) : (
        <>
          {/* Team Info Card */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                Mã đội: {currentTeam.code}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Mentor: {currentTeam.mentorName}
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              {currentTeam.name}
            </h2>
            <p className="text-base font-semibold text-indigo-600">
              {currentTeam.projectName}
            </p>
            {currentTeam.slogan && (
              <p className="text-xs italic text-slate-500">
                &ldquo;{currentTeam.slogan}&rdquo;
              </p>
            )}
            <p className="text-sm leading-relaxed text-slate-600">
              {currentTeam.description}
            </p>
          </div>

          <div className="w-full shrink-0 space-y-3 lg:w-80">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Tiến độ chung của đội</span>
                <span className="text-base font-bold text-indigo-700">
                  {currentTeam.progress}%
                </span>
              </div>
              <ProgressBar value={currentTeam.progress} className="mt-2" />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <a
                href={currentTeam.githubRepoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="truncate">GitHub Repo đội</span>
                <span className="shrink-0 text-[11px] text-slate-300">Mở</span>
              </a>

              <a
                href={currentTeam.discordInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl bg-[#5865F2] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4752c4]"
              >
                <span className="truncate">Discord Nhóm</span>
                <span className="shrink-0 text-[11px] text-indigo-100">
                  Tham gia
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Members Directory */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Thành viên trong đội ({teamMembers.length}/{systemConfig.maxTeamMembers})
          </h2>
          <p className="text-xs text-slate-500">
            Danh sách thành viên, kỹ năng chuyên môn và kênh liên hệ cá nhân
          </p>
        </div>

        {teamMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Đội này hiện chưa có thành viên nào.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teamMembers.map((member) => {
              const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
              const protectedAdmin = isAdminEmail(member.email);
              const isSelf = member.id === currentUser?.id;
              return (
                <article
                  key={member.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-indigo-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <UserAvatar
                          src={member.avatarUrl}
                          name={member.name}
                          size="lg"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {member.name}
                            </h3>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${roleCfg.badge}`}
                            >
                              {roleCfg.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs font-medium text-indigo-600">
                            {member.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-600">
                      {member.bio}
                    </p>

                    {member.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {member.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connected Profiles & Admin Member Controls */}
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {member.connectedProfiles.github && (
                        <a
                          href={member.connectedProfiles.github}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          GitHub
                        </a>
                      )}
                      {member.connectedProfiles.discord && (
                        <span className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          Discord: {member.connectedProfiles.discord}
                        </span>
                      )}
                      {member.connectedProfiles.linkedin && (
                        <a
                          href={member.connectedProfiles.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                        >
                          LinkedIn
                        </a>
                      )}
                      {member.connectedProfiles.portfolio && (
                        <a
                          href={member.connectedProfiles.portfolio}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Portfolio
                        </a>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <select
                          value={member.role}
                          disabled={protectedAdmin}
                          onChange={(e) =>
                            updateUserByAdmin(member.id, {
                              role: e.target.value as TeamRole,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 outline-none disabled:opacity-60"
                        >
                          <option value="member">Thành viên</option>
                          <option value="admin">Admin</option>
                        </select>

                        <select
                          value={member.teamId}
                          onChange={(e) =>
                            updateUserByAdmin(member.id, { teamId: e.target.value })
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 outline-none"
                        >
                          <option value="">Chưa có đội</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              Chuyển sang: {t.name}
                            </option>
                          ))}
                        </select>

                        {!protectedAdmin && !isSelf && (
                          <button
                            type="button"
                            onClick={() => deleteUserByAdmin(member.id)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
          </section>
        </>
      )}

      {/* Member View: Browse all teams & Request to Join */}
      {!isAdmin && (
        <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách các Đội &amp; Xin gia nhập
              </h2>
              <p className="text-xs text-slate-500">
                Thành viên chỉ xem nội bộ đội đang tham gia và có thể gửi yêu cầu xin chuyển/gia nhập đội khác để Admin phê duyệt.
              </p>
            </div>
          </div>

          {myPendingRequest && (
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold text-indigo-700">
                  Yêu cầu đang chờ Admin duyệt
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  Xin gia nhập đội: {myPendingRequest.toTeamName}
                </p>
                {myPendingRequest.message && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    Lời nhắn: {myPendingRequest.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => cancelJoinRequest()}
                className="shrink-0 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Hủy yêu cầu
              </button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const isCurrent = team.id === currentUser?.teamId;
              const isRequested = myPendingRequest?.toTeamId === team.id;
              const memberCount = users.filter((u) => u.teamId === team.id).length;
              const isTeamFull = memberCount >= systemConfig.maxTeamMembers;

              return (
                <article
                  key={team.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 ${
                    isCurrent
                      ? 'border-indigo-300 bg-indigo-50/30'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-slate-200">
                        {team.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {memberCount}/{systemConfig.maxTeamMembers} thành viên
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900">
                      {team.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-indigo-600">
                      {team.projectName}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {team.description || 'Chưa có mô tả chi tiết.'}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Mentor: {team.mentorName}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-200/70 pt-3">
                    {isCurrent ? (
                      <span className="inline-block w-full rounded-xl bg-indigo-100 py-2 text-center text-xs font-bold text-indigo-700">
                        Đội hiện tại của bạn
                      </span>
                    ) : isRequested ? (
                      <button
                        type="button"
                        onClick={() => cancelJoinRequest()}
                        className="w-full rounded-xl border border-amber-300 bg-amber-50 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Đang chờ duyệt · Hủy yêu cầu
                      </button>
                    ) : !systemConfig.allowTeamJoinRequests ? (
                      <span className="inline-block w-full rounded-xl border border-slate-200 bg-slate-100 py-2 text-center text-xs font-semibold text-slate-500">
                        Đang khóa xin chuyển đội
                      </span>
                    ) : isTeamFull ? (
                      <span className="inline-block w-full rounded-xl border border-slate-200 bg-slate-100 py-2 text-center text-xs font-semibold text-slate-500">
                        Đội đã đủ thành viên
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setJoinTargetTeam(team);
                          setJoinMessage('');
                        }}
                        className="w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600"
                      >
                        Xin gia nhập đội
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Join Team Request Modal (Member) */}
      {joinTargetTeam && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Xin gia nhập {joinTargetTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setJoinTargetTeam(null)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleSubmitJoinRequest} className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                Yêu cầu sẽ được gửi tới Quản trị viên (Admin). Sau khi được duyệt,
                bạn sẽ chuyển sang làm việc tại đội{' '}
                <strong className="text-slate-900">{joinTargetTeam.name}</strong>.
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Lời nhắn / Lý do xin gia nhập
                </label>
                <textarea
                  rows={3}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Giới thiệu kỹ năng hoặc vai trò bạn muốn đóng góp cho đội..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJoinTargetTeam(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal (Admin) */}
      {isAdmin && showCreateTeam && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Tạo đội mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateTeam(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mã đội *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamCode}
                    onChange={(e) => setNewTeamCode(e.target.value)}
                    placeholder="INV-02"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên đội *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="INNOVARD Beta"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tên đề tài dự án
                </label>
                <input
                  type="text"
                  value={newTeamProject}
                  onChange={(e) => setNewTeamProject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mentor hướng dẫn
                </label>
                <input
                  type="text"
                  value={newTeamMentor}
                  onChange={(e) => setNewTeamMentor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={2}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Tạo đội
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal (Admin) */}
      {isAdmin && showEditTeam && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Chỉnh sửa thông tin đội {currentTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditTeam(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên đội
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mentor hướng dẫn
                  </label>
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tên đề tài dự án
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Slogan đội
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả dự án
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Link GitHub Repo đội
                  </label>
                  <input
                    type="url"
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Link Discord nhóm
                  </label>
                  <input
                    type="url"
                    value={discordInviteUrl}
                    onChange={(e) => setDiscordInviteUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiến độ chung ({progress}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTeam(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal (Admin) */}
      {isAdmin && showAddMember && (
        <div
          className="ui-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setShowAddMember(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm thành viên vào {currentTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            {otherUsersNotInTeam.length > 0 && (
              <div className="mt-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5">
                <p className="text-xs font-bold text-indigo-950">
                  Chọn nhanh tài khoản đã đăng nhập:
                </p>
                <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {otherUsersNotInTeam.map((u) => {
                    const currentTeamLabel = u.teamId
                      ? teamById.get(u.teamId)?.name ?? u.teamId
                      : 'Chưa có đội';
                    return (
                      <div
                        key={u.id}
                        className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar src={u.avatarUrl} name={u.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {u.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {u.email} · {currentTeamLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setMemberName(u.name);
                              setMemberEmail(u.email);
                              setMemberTitle(u.title);
                              setMemberRole(u.role);
                              setMemberGithub(u.connectedProfiles.github);
                              setMemberDiscord(u.connectedProfiles.discord);
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Điền form
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateUserByAdmin(u.id, { teamId: currentTeam.id });
                              setShowAddMember(false);
                            }}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                          >
                            Thêm vào đội ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Nguyễn Văn B"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email Google *
                  </label>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="vanb@gmail.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Chức danh / Vị trí
                  </label>
                  <input
                    type="text"
                    value={memberTitle}
                    onChange={(e) => setMemberTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Vai trò hệ thống
                  </label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as TeamRole)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="member">Thành viên</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Kỹ năng (ngăn cách bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={memberSkills}
                  onChange={(e) => setMemberSkills(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Link GitHub
                  </label>
                  <input
                    type="url"
                    value={memberGithub}
                    onChange={(e) => setMemberGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Discord ID
                  </label>
                  <input
                    type="text"
                    value={memberDiscord}
                    onChange={(e) => setMemberDiscord(e.target.value)}
                    placeholder="username#1234"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Thêm thành viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
