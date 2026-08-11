'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useGoals } from '@/hooks/useGoals'
import { useAnalysis, useTrend } from '@/hooks/useAnalysis'
import { useFamilyBudget, useMyFamily } from '@/hooks/useFamily'
import { formatCurrency, formatPercent } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'
import type { NavKey } from '@/lib/types'

interface NavDropdownProps {
  navKey: NavKey
  onPointerEnter: () => void
  onPointerLeave: () => void
}

export default function NavDropdown({ navKey, onPointerEnter, onPointerLeave }: NavDropdownProps) {
  return (
    <motion.div
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.34, 1.3, 0.64, 1] }}
      className="modal-glass"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        minWidth: 260,
        borderRadius: 18,
        padding: 18,
        zIndex: 200,
      }}
    >
      {renderPreview(navKey)}
    </motion.div>
  )
}

function renderPreview(key: NavKey): ReactNode {
  switch (key) {
    case 'dashboard':
      return <DashboardPreview />
    case 'transactions':
      return <TransactionsPreview />
    case 'budgets':
      return <BudgetsPreview />
    case 'assets':
      return <AssetsPreview />
    case 'goals':
      return <GoalsPreview />
    case 'analysis':
      return <AnalysisPreview />
    case 'family':
      return <FamilyPreview />
  }
}

function FamilyPreview() {
  const { data: family } = useMyFamily()
  const { data: budget } = useFamilyBudget()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PreviewTitle>家庭预算</PreviewTitle>
      {!family ? (
        <Empty text="尚未加入家庭" />
      ) : (
        <>
          <Row label="家庭" value={family.name} />
          <Row label="成员" value={`${family.members.length} 人`} />
          {budget ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  color: 'var(--color-label-secondary)',
                }}
              >
                <span>本月预算</span>
                <span>{budget.amount > 0 ? formatPercent(budget.usageRate * 100, 0) : '—'}</span>
              </div>
              <ProgressBar
                value={budget.spent}
                max={budget.amount}
                color={budget.overBudget ? '#ff453a' : '#0a84ff'}
                height={4}
              />
            </div>
          ) : (
            <Row label="本月预算" value="未设置" />
          )}
        </>
      )}
    </div>
  )
}

const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ fontSize: 12.5, color: 'var(--color-label-secondary)' }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--color-label-primary)' }}>
      {value}
    </span>
  </div>
)

function PreviewTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: 'var(--color-label-tertiary)',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  )
}

function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <div style={{ fontSize: 12.5, color: 'var(--color-label-tertiary)' }}>{text}</div>
  )
}

function DashboardPreview() {
  const { data: trend } = useTrend()
  const s = trend?.summary
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PreviewTitle>本月概况</PreviewTitle>
      {s ? (
        <>
          <Row label="收入" value={formatCurrency(s.monthIncome)} color="#32d74b" />
          <Row label="支出" value={formatCurrency(s.monthExpense)} color="#ff453a" />
          <Row label="净结余" value={formatCurrency(s.monthNet)} />
          <Row label="储蓄率" value={formatPercent(s.savingsRate)} color="#5ac8fa" />
        </>
      ) : (
        <Empty text="登录后查看" />
      )}
    </div>
  )
}

function TransactionsPreview() {
  const { data: transactions = [] } = useTransactions()
  const recent = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <PreviewTitle>最近记录</PreviewTitle>
      {recent.length === 0 ? (
        <Empty />
      ) : (
        recent.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{t.categoryIcon}</span>
              <span style={{ color: 'var(--color-label-secondary)' }}>{t.categoryName}</span>
            </span>
            <span
              style={{
                fontWeight: 600,
                color: t.type === 'income' ? '#32d74b' : 'var(--color-label-primary)',
              }}
            >
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

function BudgetsPreview() {
  const { data: budgets = [] } = useBudgets()
  const items = budgets.filter((b) => b.categoryId !== null).slice(0, 4)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PreviewTitle>预算执行</PreviewTitle>
      {items.length === 0 ? (
        <Empty />
      ) : (
        items.map((b) => (
          <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12.5,
                color: 'var(--color-label-secondary)',
              }}
            >
              <span>
                {b.categoryIcon} {b.categoryName}
              </span>
              <span>{b.amount > 0 ? formatPercent((b.spent / b.amount) * 100, 0) : '—'}</span>
            </div>
            <ProgressBar value={b.spent} max={b.amount} color={b.categoryColor} height={4} />
          </div>
        ))
      )}
    </div>
  )
}

function AssetsPreview() {
  const { data: trend } = useTrend()
  const s = trend?.summary
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PreviewTitle>资产负债</PreviewTitle>
      {s ? (
        <>
          <Row label="总资产" value={formatCurrency(s.totalAssets)} color="#32d74b" />
          <Row label="总负债" value={formatCurrency(s.totalLiabilities)} color="#ff453a" />
          <Row label="净资产" value={formatCurrency(s.netWorth)} />
        </>
      ) : (
        <Empty text="登录后查看" />
      )}
    </div>
  )
}

function GoalsPreview() {
  const { data: goals = [] } = useGoals()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PreviewTitle>目标进度</PreviewTitle>
      {goals.length === 0 ? (
        <Empty />
      ) : (
        goals.slice(0, 4).map((g) => (
          <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12.5,
                color: 'var(--color-label-secondary)',
              }}
            >
              <span>
                {g.icon} {g.name}
              </span>
              <span>{g.targetAmount > 0 ? formatPercent((g.currentAmount / g.targetAmount) * 100, 0) : '—'}</span>
            </div>
            <ProgressBar
              value={g.currentAmount}
              max={g.targetAmount}
              color={g.color}
              height={4}
            />
          </div>
        ))
      )}
    </div>
  )
}

function AnalysisPreview() {
  const { data: analysis } = useAnalysis()
  const h = analysis?.health
  const items = h
    ? [
        { label: '储蓄率', value: h.breakdown.savingsRate, color: '#32d74b' },
        { label: '预算控制', value: h.breakdown.budgetControl, color: '#ff9f0a' },
        { label: '负债水平', value: h.breakdown.debtRatio, color: '#0a84ff' },
        { label: '目标进度', value: h.breakdown.goalProgress, color: '#bf5af2' },
      ]
    : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PreviewTitle>健康评分</PreviewTitle>
      {h ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{h.total}</span>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>/100</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it) => (
              <div key={it.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--color-label-secondary)',
                  }}
                >
                  <span>{it.label}</span>
                  <span>{it.value}</span>
                </div>
                <ProgressBar value={it.value} max={100} color={it.color} height={4} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty text="登录后查看" />
      )}
    </div>
  )
}
