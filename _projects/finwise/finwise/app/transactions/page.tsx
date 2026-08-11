'use client'

import { useMemo, useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import PillGroup from '@/components/ui/PillGroup'
import TransactionList from '@/components/pages/transactions/TransactionList'
import AddTransactionModal from '@/components/pages/transactions/AddTransactionModal'
import ImportBillModal from '@/components/pages/transactions/ImportBillModal'
import QuickAddBar from '@/components/pages/transactions/QuickAddBar'
import { useTransactions } from '@/hooks/useTransactions'
import { useAppStore } from '@/store/useAppStore'
import type { Transaction } from '@/lib/types'

type Filter = 'all' | 'income' | 'expense'

export default function TransactionsPage() {
  const { data: transactions = [] } = useTransactions()
  const [filter, setFilter] = useState<Filter>('all')
  const isAddOpen = useAppStore((s) => s.isAddTxModalOpen)
  const openAdd = useAppStore((s) => s.openAddTxModal)
  const closeAdd = useAppStore((s) => s.closeAddTxModal)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const sorted = useMemo(
    () =>
      [...transactions]
        .filter((t) => filter === 'all' || t.type === filter)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions, filter],
  )

  return (
    <PageShell maxWidth={880}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>收支记录</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-label-primary)',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            导入账单
          </button>
          <button
            type="button"
            onClick={openAdd}
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
            ＋ 新增记录
          </button>
        </div>
      </header>

      <QuickAddBar />

      <div style={{ marginBottom: 16 }}>
        <PillGroup
          options={[
            { value: 'all', label: '全部' },
            { value: 'income', label: '收入' },
            { value: 'expense', label: '支出' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <TransactionList items={sorted} onEdit={(t) => setEditing(t)} />

      <AddTransactionModal open={isAddOpen} onClose={closeAdd} />
      <AddTransactionModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        transaction={editing ?? undefined}
      />
      <ImportBillModal open={importOpen} onClose={() => setImportOpen(false)} />
    </PageShell>
  )
}
