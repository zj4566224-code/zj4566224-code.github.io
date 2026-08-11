'use client'

import { useState } from 'react'
import { AxiosError } from 'axios'
import PageShell from '@/components/layout/PageShell'
import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import PieChart from '@/components/charts/PieChart'
import {
  useAcceptInvitation,
  useContributeFamilyGoal,
  useCreateFamily,
  useCreateFamilyGoal,
  useDeclineInvitation,
  useDeleteFamilyGoal,
  useDisbandFamily,
  useFamilyBudget,
  useFamilyGoals,
  useFamilyInvitations,
  useFamilySummary,
  useInviteMember,
  useLeaveFamily,
  useMyFamily,
  useMyPendingInvitations,
  useRemoveMember,
  useRenameFamily,
  useRevokeInvitation,
  useUpdateMemberRole,
  useUpsertFamilyBudget,
} from '@/hooks/useFamily'
import { currentYearMonth, formatCurrency, formatPercent, withAlpha } from '@/lib/utils'
import type { Family, FamilyGoal, FamilyRole } from '@/lib/types'

const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: '主人',
  co_owner: '共同管理',
  member: '成员',
}

export default function FamilyPage() {
  const family = useMyFamily()
  const invitations = useMyPendingInvitations()

  return (
    <PageShell maxWidth={920}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>家庭预算</h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--color-label-secondary)' }}>
          和家人一起管理预算、储蓄目标和月度收支
        </div>
      </header>

      {family.isLoading ? (
        <Centered>加载中…</Centered>
      ) : family.data ? (
        <FamilyDashboard family={family.data} />
      ) : (
        <NoFamilyState
          pendingInvitations={invitations.data ?? []}
          loadingInvitations={invitations.isLoading}
        />
      )}
    </PageShell>
  )
}

// ─────────────────────────────────────────
// 无家庭:创建 / 接受邀请
// ─────────────────────────────────────────
function NoFamilyState({
  pendingInvitations,
  loadingInvitations,
}: {
  pendingInvitations: ReturnType<typeof useMyPendingInvitations>['data'] extends infer T
    ? Extract<T, Array<unknown>>
    : never
  loadingInvitations: boolean
}) {
  const [name, setName] = useState('')
  const create = useCreateFamily()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await create.mutateAsync(name.trim())
    } catch {
      /* error rendered via create.error */
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!loadingInvitations && pendingInvitations.length > 0 && (
        <GlassCard enableGlow={false} style={{ padding: 22 }}>
          <SectionTitle title="待处理的邀请" />
          <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingInvitations.map((inv) => (
              <li
                key={inv.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.familyName}</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
                    {inv.inviterName} 邀请你加入
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => accept.mutate(inv.id)}
                  disabled={accept.isPending}
                  style={primaryButton(true)}
                >
                  接受
                </button>
                <button
                  type="button"
                  onClick={() => decline.mutate(inv.id)}
                  disabled={decline.isPending}
                  style={ghostButton()}
                >
                  拒绝
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <GlassCard enableGlow={false} style={{ padding: 26 }}>
        <SectionTitle title="创建家庭" subtitle="你将成为家庭主人,可以邀请家人加入,共同管理家庭预算" />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="家庭名称,例如 陈家"
            style={{
              flex: 1,
              fontSize: 14,
              padding: '11px 13px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              borderRadius: 11,
              outline: 'none',
              color: 'var(--color-label-primary)',
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || create.isPending}
            style={primaryButton(!!name.trim() && !create.isPending)}
          >
            {create.isPending ? '创建中…' : '创建'}
          </button>
        </div>
        {create.error && <ErrorHint error={create.error} fallback="创建失败" />}
      </GlassCard>
    </div>
  )
}

// ─────────────────────────────────────────
// 有家庭:总览面板
// ─────────────────────────────────────────
function FamilyDashboard({ family }: { family: Family }) {
  const month = currentYearMonth(new Date())
  const summary = useFamilySummary(month)
  const budget = useFamilyBudget()
  const goals = useFamilyGoals()
  const canEdit = family.myRole === 'owner' || family.myRole === 'co_owner'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <FamilyHeader family={family} />
      <MonthlySummaryCard summary={summary.data} loading={summary.isLoading} />
      <FamilyBudgetCard
        budget={budget.data ?? null}
        loading={budget.isLoading}
        canEdit={canEdit}
      />
      <ContributionCard
        contributions={summary.data?.contributions ?? []}
        loading={summary.isLoading}
      />
      <FamilyGoalsCard goals={goals.data ?? []} loading={goals.isLoading} canEdit={canEdit} />
      <MembersCard family={family} />
      {canEdit && <InvitationsCard />}
      <DangerZone family={family} />
    </div>
  )
}

function FamilyHeader({ family }: { family: Family }) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(family.name)
  const rename = useRenameFamily()
  const handleSave = async () => {
    if (!newName.trim() || newName.trim() === family.name) {
      setRenaming(false)
      return
    }
    try {
      await rename.mutateAsync(newName.trim())
      setRenaming(false)
    } catch {
      /* */
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      {renaming ? (
        <input
          type="text"
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setNewName(family.name)
              setRenaming(false)
            }
          }}
          style={{
            fontSize: 22,
            fontWeight: 700,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-input-border)',
            borderRadius: 9,
            padding: '4px 10px',
            outline: 'none',
            color: 'var(--color-label-primary)',
          }}
        />
      ) : (
        <span
          style={{ fontSize: 22, fontWeight: 700, cursor: family.myRole === 'owner' ? 'text' : 'default' }}
          onClick={() => family.myRole === 'owner' && setRenaming(true)}
          title={family.myRole === 'owner' ? '点击重命名' : ''}
        >
          {family.name}
        </span>
      )}
      <RoleBadge role={family.myRole} />
      <span style={{ fontSize: 13, color: 'var(--color-label-tertiary)' }}>
        {family.members.length} 名成员
      </span>
    </div>
  )
}

function MonthlySummaryCard({
  summary,
  loading,
}: {
  summary: ReturnType<typeof useFamilySummary>['data']
  loading: boolean
}) {
  if (loading || !summary) return null
  return (
    <GlassCard style={{ padding: 26 }}>
      <SectionTitle title="本月家庭收支" subtitle={summary.month} />
      <div style={{ display: 'flex', gap: 28, marginTop: 16, flexWrap: 'wrap' }}>
        <Stat label="家庭收入" value={formatCurrency(summary.totalIncome)} color="#32d74b" />
        <Stat label="家庭支出" value={formatCurrency(summary.totalExpense)} color="#ff453a" />
        <Stat
          label="结余"
          value={formatCurrency(summary.net)}
          color={summary.net >= 0 ? '#5ac8fa' : '#ff9f0a'}
        />
      </div>
    </GlassCard>
  )
}

function FamilyBudgetCard({
  budget,
  loading,
  canEdit,
}: {
  budget: ReturnType<typeof useFamilyBudget>['data']
  loading: boolean
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const upsert = useUpsertFamilyBudget()

  if (loading) return null

  const startEdit = () => {
    setAmount(budget?.amount.toString() ?? '')
    setEditing(true)
  }
  const handleSave = async () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    try {
      await upsert.mutateAsync({ amount: n, period: 'monthly' })
      setEditing(false)
    } catch {
      /* */
    }
  }

  return (
    <GlassCard style={{ padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SectionTitle title="家庭月度预算" />
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} style={linkButton}>
            {budget ? '修改' : '设置'}
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="本月预算金额"
            autoFocus
            style={{
              flex: 1,
              fontSize: 14,
              padding: '11px 13px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              borderRadius: 11,
              outline: 'none',
              color: 'var(--color-label-primary)',
            }}
          />
          <button type="button" onClick={handleSave} style={primaryButton(true)}>
            保存
          </button>
          <button type="button" onClick={() => setEditing(false)} style={ghostButton()}>
            取消
          </button>
        </div>
      ) : budget ? (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700 }}>
              {formatCurrency(budget.spent)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--color-label-secondary)' }}>
              / {formatCurrency(budget.amount)}
            </span>
          </div>
          <ProgressBar
            value={budget.spent}
            max={budget.amount}
            color={budget.overBudget ? '#ff453a' : '#0a84ff'}
            height={8}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 10,
              fontSize: 12.5,
              color: 'var(--color-label-tertiary)',
            }}
          >
            <span>{formatPercent(budget.usageRate * 100, 1)} 已使用</span>
            <span style={{ color: budget.overBudget ? '#ff453a' : 'var(--color-label-secondary)' }}>
              {budget.overBudget ? `超支 ${formatCurrency(-budget.remaining)}` : `剩余 ${formatCurrency(budget.remaining)}`}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-label-tertiary)' }}>
          {canEdit ? '尚未设置家庭预算,点击"设置"添加' : '主人或共同管理者尚未设置家庭预算'}
        </div>
      )}
    </GlassCard>
  )
}

function ContributionCard({
  contributions,
  loading,
}: {
  contributions: { userId: number; name: string; income: number; expense: number }[]
  loading: boolean
}) {
  if (loading) return null
  const COLORS = ['#0a84ff', '#bf5af2', '#ff9f0a', '#32d74b', '#5ac8fa', '#ff453a', '#6e6ce8']
  const data = contributions
    .filter((c) => c.expense > 0)
    .map((c, i) => ({ name: c.name, value: c.expense, color: COLORS[i % COLORS.length] }))
  const totalExpense = contributions.reduce((s, c) => s + c.expense, 0)

  return (
    <GlassCard style={{ padding: 26 }}>
      <SectionTitle title="本月成员贡献" subtitle="按支出占比" />
      {data.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <PieChart
            data={data}
            height={220}
            formatTooltip={(v, name) => [formatCurrency(Number(v)), name]}
          />
          <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--color-label-tertiary)' }}>
            家庭本月合计支出 {formatCurrency(totalExpense)}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-label-tertiary)' }}>
          本月还没有支出记录
        </div>
      )}
    </GlassCard>
  )
}

function FamilyGoalsCard({
  goals,
  loading,
  canEdit,
}: {
  goals: FamilyGoal[]
  loading: boolean
  canEdit: boolean
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const create = useCreateFamilyGoal()
  const del = useDeleteFamilyGoal()
  const contribute = useContributeFamilyGoal()
  const [contributingId, setContributingId] = useState<number | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')

  if (loading) return null

  const handleCreate = async () => {
    if (!name.trim() || !Number(target)) return
    try {
      await create.mutateAsync({ name: name.trim(), target_amount: Number(target), icon: '🎯', color: '#bf5af2' })
      setName('')
      setTarget('')
      setCreating(false)
    } catch {
      /* */
    }
  }

  const handleContribute = async (goalId: number) => {
    const n = Number(contributeAmount)
    if (!Number.isFinite(n) || n <= 0) return
    try {
      await contribute.mutateAsync({ goalId, amount: n })
      setContributingId(null)
      setContributeAmount('')
    } catch {
      /* */
    }
  }

  return (
    <GlassCard style={{ padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SectionTitle title="家庭储蓄目标" />
        {canEdit && !creating && (
          <button type="button" onClick={() => setCreating(true)} style={linkButton}>
            ＋ 新增目标
          </button>
        )}
      </div>

      {creating && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 10,
            padding: 12,
            background: 'var(--color-input-bg)',
            borderRadius: 12,
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如 买车基金"
            style={{
              flex: 2,
              fontSize: 14,
              padding: '10px 12px',
              background: 'var(--color-input-bg-readonly)',
              border: '1px solid var(--color-input-border)',
              borderRadius: 10,
              outline: 'none',
              color: 'var(--color-label-primary)',
            }}
          />
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="目标金额"
            style={{
              flex: 1,
              fontSize: 14,
              padding: '10px 12px',
              background: 'var(--color-input-bg-readonly)',
              border: '1px solid var(--color-input-border)',
              borderRadius: 10,
              outline: 'none',
              color: 'var(--color-label-primary)',
            }}
          />
          <button type="button" onClick={handleCreate} style={primaryButton(true)}>
            保存
          </button>
          <button type="button" onClick={() => setCreating(false)} style={ghostButton()}>
            取消
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        !creating && (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-label-tertiary)' }}>
            还没有家庭储蓄目标
          </div>
        )
      ) : (
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map((g) => {
            const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0
            const isContributing = contributingId === g.id
            return (
              <li
                key={g.id}
                style={{
                  padding: 14,
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{g.icon ?? '🎯'}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{g.name}</span>
                  {g.status === 'completed' && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'rgba(50,215,75,0.18)',
                        color: '#32d74b',
                      }}
                    >
                      已完成
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setContributingId(isContributing ? null : g.id)}
                    style={linkButton}
                  >
                    {isContributing ? '取消' : '贡献'}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`确认删除目标「${g.name}」?`)) del.mutate(g.id)
                      }}
                      style={{ ...linkButton, color: '#ff453a' }}
                    >
                      删除
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  <ProgressBar
                    value={g.currentAmount}
                    max={g.targetAmount}
                    color={g.color || '#bf5af2'}
                    height={6}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      fontSize: 12.5,
                      color: 'var(--color-label-tertiary)',
                    }}
                  >
                    <span>
                      {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                    </span>
                    <span>{formatPercent(ratio * 100, 1)}</span>
                  </div>
                </div>
                {isContributing && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      placeholder="贡献金额"
                      autoFocus
                      style={{
                        flex: 1,
                        fontSize: 14,
                        padding: '8px 12px',
                        background: 'var(--color-input-bg-readonly)',
                        border: '1px solid var(--color-input-border)',
                        borderRadius: 9,
                        outline: 'none',
                        color: 'var(--color-label-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleContribute(g.id)}
                      style={primaryButton(true)}
                    >
                      存入
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}

function MembersCard({ family }: { family: Family }) {
  const updateRole = useUpdateMemberRole()
  const remove = useRemoveMember()
  const isOwner = family.myRole === 'owner'

  return (
    <GlassCard enableGlow={false} style={{ padding: 26 }}>
      <SectionTitle title="家庭成员" />
      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {family.members.map((m) => (
          <li
            key={m.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 11,
              transition: 'background 0.18s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-row-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              aria-hidden
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(50,215,75,0.55), rgba(90,200,250,0.55))',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {(m.name || m.email).slice(0, 1)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name || m.email}</div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-label-tertiary)' }}>{m.email}</div>
            </div>
            <RoleBadge role={m.role} />
            {isOwner && m.role !== 'owner' && (
              <>
                {m.role === 'member' ? (
                  <button
                    type="button"
                    onClick={() => updateRole.mutate({ userId: m.userId, role: 'co_owner' })}
                    style={linkButton}
                  >
                    设为管理
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateRole.mutate({ userId: m.userId, role: 'member' })}
                    style={linkButton}
                  >
                    取消管理
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`确认移除成员「${m.name || m.email}」?`)) remove.mutate(m.userId)
                  }}
                  style={{ ...linkButton, color: '#ff453a' }}
                >
                  移除
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

function InvitationsCard() {
  const invitations = useFamilyInvitations()
  const invite = useInviteMember()
  const revoke = useRevokeInvitation()
  const [email, setEmail] = useState('')

  const handleInvite = async () => {
    if (!email.trim()) return
    try {
      await invite.mutateAsync(email.trim())
      setEmail('')
    } catch {
      /* */
    }
  }

  const pending = invitations.data?.filter((i) => i.status === 'pending') ?? []

  return (
    <GlassCard enableGlow={false} style={{ padding: 26 }}>
      <SectionTitle title="邀请成员" subtitle="对方需先在 FinWise 注册,然后在'家庭'页面接受邀请" />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="对方注册时用的邮箱"
          style={{
            flex: 1,
            fontSize: 14,
            padding: '11px 13px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-input-border)',
            borderRadius: 11,
            outline: 'none',
            color: 'var(--color-label-primary)',
          }}
        />
        <button
          type="button"
          onClick={handleInvite}
          disabled={!email.trim() || invite.isPending}
          style={primaryButton(!!email.trim() && !invite.isPending)}
        >
          {invite.isPending ? '发送中…' : '发送邀请'}
        </button>
      </div>
      {invite.error && <ErrorHint error={invite.error} fallback="邀请失败" />}

      {pending.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map((inv) => (
            <li
              key={inv.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--color-input-bg)',
                borderRadius: 11,
              }}
            >
              <span style={{ flex: 1, fontSize: 13.5 }}>{inv.invitedEmail}</span>
              <span style={{ fontSize: 11.5, color: 'var(--color-label-tertiary)' }}>等待对方处理</span>
              <button type="button" onClick={() => revoke.mutate(inv.id)} style={{ ...linkButton, color: '#ff453a' }}>
                撤回
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}

function DangerZone({ family }: { family: Family }) {
  const disband = useDisbandFamily()
  const leave = useLeaveFamily()
  const isOwner = family.myRole === 'owner'

  return (
    <GlassCard enableGlow={false} style={{ padding: 22 }}>
      <SectionTitle title="高级操作" />
      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
        {isOwner ? (
          <button
            type="button"
            onClick={() => {
              if (confirm('确认解散家庭?所有成员、邀请、预算、目标都会被删除。')) {
                disband.mutate()
              }
            }}
            style={dangerButton}
          >
            解散家庭
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (confirm('确认退出家庭?')) leave.mutate()
            }}
            style={dangerButton}
          >
            退出家庭
          </button>
        )}
      </div>
    </GlassCard>
  )
}

// ─────────────────────────────────────────
// 小组件
// ─────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

function RoleBadge({ role }: { role: FamilyRole }) {
  const colorMap = { owner: '#ff9f0a', co_owner: '#0a84ff', member: '#5ac8fa' } as const
  const c = colorMap[role]
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        padding: '2px 9px',
        borderRadius: 999,
        background: withAlpha(c, 0.18),
        color: c,
        border: `1px solid ${withAlpha(c, 0.35)}`,
      }}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

function ErrorHint({ error, fallback }: { error: unknown; fallback: string }) {
  const msg =
    error instanceof AxiosError
      ? (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback
      : fallback
  return (
    <div style={{ marginTop: 10, fontSize: 12.5, color: '#ff453a' }}>{msg}</div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--color-label-tertiary)',
      }}
    >
      {children}
    </div>
  )
}

// ─── 共用按钮样式 ─────────────────────────────────────
const linkButton: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-label-secondary)',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 7,
}

function primaryButton(active: boolean): React.CSSProperties {
  return {
    padding: '10px 18px',
    borderRadius: 11,
    fontSize: 13.5,
    fontWeight: 600,
    background: active
      ? 'linear-gradient(135deg, #0a84ff, #6e6ce8)'
      : 'var(--color-label-quaternary)',
    border: 'none',
    color: '#fff',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
    transition: 'opacity 0.18s',
  }
}

function ghostButton(): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 11,
    fontSize: 13.5,
    fontWeight: 500,
    background: 'transparent',
    border: '1px solid var(--color-border-base)',
    color: 'var(--color-label-secondary)',
    cursor: 'pointer',
  }
}

const dangerButton: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 11,
  fontSize: 13.5,
  fontWeight: 500,
  background: 'rgba(255,67,58,0.10)',
  border: '1px solid rgba(255,67,58,0.30)',
  color: '#ff453a',
  cursor: 'pointer',
}
