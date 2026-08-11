'use client'

import { useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import TotalBudgetCard from '@/components/pages/budgets/TotalBudgetCard'
import CategoryBudgetGrid from '@/components/pages/budgets/CategoryBudgetGrid'
import AddBudgetModal from '@/components/pages/budgets/AddBudgetModal'
import { useBudgets } from '@/hooks/useBudgets'
import type { Budget } from '@/lib/types'

export default function BudgetsPage() {
  const { data: budgets = [] } = useBudgets()
  const total = budgets.find((b) => b.categoryId === null)
  const categories = budgets.filter((b) => b.categoryId !== null)
  const usedCategoryIds = categories
    .map((b) => b.categoryId)
    .filter((id): id is number => id !== null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  return (
    <PageShell maxWidth={1080}>
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
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>预算</h1>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--color-label-secondary)' }}>
            统一管理每月支出上限
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
            background: 'linear-gradient(135deg, #0a84ff, #6e6ce8)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(10,132,255,0.28)',
          }}
        >
          ＋ 新建预算
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {total ? (
          <TotalBudgetCard total={total} onEdit={() => setEditing(total)} />
        ) : (
          <div
            style={{
              padding: 28,
              borderRadius: 14,
              border: '1px dashed var(--color-border-base)',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--color-label-tertiary)',
            }}
          >
            还没有设置本月总预算。点右上角「新建预算」开始吧。
          </div>
        )}
        {categories.length > 0 && (
          <CategoryBudgetGrid items={categories} onEdit={(b) => setEditing(b)} />
        )}
      </div>

      <AddBudgetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        hasTotalBudget={!!total}
        usedCategoryIds={usedCategoryIds}
      />
      <AddBudgetModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        budget={editing ?? undefined}
        hasTotalBudget={!!total}
        usedCategoryIds={usedCategoryIds}
      />
    </PageShell>
  )
}
