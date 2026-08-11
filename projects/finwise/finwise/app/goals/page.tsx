'use client'

import { useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import GoalCard from '@/components/pages/goals/GoalCard'
import AddGoalModal from '@/components/pages/goals/AddGoalModal'
import ContributeGoalModal from '@/components/pages/goals/ContributeGoalModal'
import { useGoals } from '@/hooks/useGoals'
import type { Goal } from '@/lib/types'

export default function GoalsPage() {
  const { data: goals = [] } = useGoals()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contributeFor, setContributeFor] = useState<Goal | null>(null)

  return (
    <PageShell maxWidth={720}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>目标</h1>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--color-label-secondary)' }}>
            把愿望变成可量化的进度
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #32d74b, #5ac8fa)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(50,215,75,0.25)',
          }}
        >
          ＋ 新建目标
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {goals.length === 0 ? (
          <div
            style={{
              padding: 32,
              borderRadius: 14,
              border: '1px dashed var(--color-border-base)',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--color-label-tertiary)',
            }}
          >
            还没有目标。点右上角「新建目标」开始规划吧。
          </div>
        ) : (
          goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onContribute={() => setContributeFor(g)}
              onEdit={() => setEditing(g)}
            />
          ))
        )}
      </div>

      <AddGoalModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AddGoalModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        goal={editing ?? undefined}
      />
      <ContributeGoalModal
        open={contributeFor !== null}
        onClose={() => setContributeFor(null)}
        goal={contributeFor}
      />
    </PageShell>
  )
}
