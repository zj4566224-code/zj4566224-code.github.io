'use client'

import { useEffect, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import {
  useCommitBill,
  useParseBill,
  type BillSource,
  type PreviewResponse,
  type PreviewRow,
} from '@/hooks/useImport'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ImportBillModal({ open, onClose }: Props) {
  const [source, setSource] = useState<BillSource>('alipay')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  // 用行索引而不是 fingerprint:同一天同金额同对方会撞 fingerprint
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [overrideCat, setOverrideCat] = useState<Record<number, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const parse = useParseBill()
  const commit = useCommitBill()

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')

  const resetAll = () => {
    setPreview(null)
    setSelected(new Set())
    setOverrideCat({})
    parse.reset()
    commit.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await parse.mutateAsync({ file, source })
      setPreview(result)
      // 默认勾选所有可导入的(非重复、非内部转账、非 transfer 类型)
      const importableIdx = new Set<number>()
      result.rows.forEach((r, i) => {
        if (!r.isDuplicate && !r.isInternalTransfer && r.type !== 'transfer') {
          importableIdx.add(i)
        }
      })
      setSelected(importableIdx)
    } catch {
      /* error rendered via parse.error */
    }
  }

  const handleCommit = async () => {
    if (!preview || !accountId) return
    const items = preview.rows
      .map((r, i) => {
        if (!selected.has(i)) return null
        const catId = overrideCat[i] ?? r.suggestedCategoryId
        return catId
          ? {
              date: r.date,
              amount: r.amount,
              type: r.type as 'income' | 'expense',
              category_id: catId,
              note: `${r.counterparty}${r.note ? ' · ' + r.note : ''}`,
            }
          : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (items.length === 0) return
    try {
      await commit.mutateAsync({ accountId, items })
      // commit hook 里已 await 所有相关 query 的 refetch,关闭时列表就是最新
    } catch {
      /* error rendered via commit.error */
    }
  }

  // 成功后 1.8s 自动关闭(给用户时间看到提示)
  useEffect(() => {
    if (!commit.isSuccess) return
    const id = window.setTimeout(handleClose, 1800)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit.isSuccess])

  const parseError = parse.error instanceof AxiosError
    ? (parse.error.response?.data as { detail?: string } | undefined)?.detail ?? '解析失败'
    : parse.isError ? '解析失败' : null

  const commitError = commit.error instanceof AxiosError
    ? (commit.error.response?.data as { detail?: string } | undefined)?.detail ?? '导入失败'
    : commit.isError ? '导入失败' : null

  const selectedCount = selected.size
  const selectedNoCat = preview
    ? preview.rows.filter(
        (r, i) => selected.has(i) && !(overrideCat[i] ?? r.suggestedCategoryId),
      ).length
    : 0

  return (
    <Modal open={open} onClose={handleClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '80vh' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>导入账单</div>

        {/* Step 1: 选源 + 选目标账户 + 上传 */}
        {!preview && (
          <>
            <Field label="账单来源">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['alipay', 'wechat'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    style={pillButton(source === s)}
                  >
                    {s === 'alipay' ? '支付宝' : '微信支付'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="导入到哪个账户">
              <select
                value={accountId ?? ''}
                onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                style={inputStyle}
              >
                <option value="">请选择</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="上传账单文件(CSV 或 XLSX)">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={handleFileChange}
                disabled={!accountId || parse.isPending}
                style={{
                  ...inputStyle,
                  cursor: !accountId ? 'not-allowed' : 'pointer',
                  opacity: !accountId ? 0.5 : 1,
                }}
              />
              <span style={hint}>
                支付宝:我的客服 → 账单下载 / 微信:钱包 → 账单 → 常见问题 → 下载账单
              </span>
            </Field>
            {parse.isPending && <span style={hint}>解析中…</span>}
            {parseError && <ErrorMsg>{parseError}</ErrorMsg>}
          </>
        )}

        {/* Step 2: 预览 + 选择 + 提交 */}
        {preview && (
          <>
            <SummaryBar preview={preview} selectedCount={selectedCount} />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 12,
                maxHeight: 420,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-bg-secondary)',
                    zIndex: 1,
                  }}
                >
                  <tr style={{ color: 'var(--color-label-tertiary)' }}>
                    <Th>
                      <input
                        type="checkbox"
                        checked={preview.rows.every((r, i) => selected.has(i) || !isImportable(r))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const next = new Set<number>()
                            preview.rows.forEach((r, i) => {
                              if (isImportable(r)) next.add(i)
                            })
                            setSelected(next)
                          } else {
                            setSelected(new Set())
                          }
                        }}
                      />
                    </Th>
                    <Th>日期</Th>
                    <Th>对方</Th>
                    <Th>金额</Th>
                    <Th>类型</Th>
                    <Th>分类</Th>
                    <Th>状态</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => {
                    const importable = isImportable(r)
                    const isSelected = selected.has(i)
                    const currentCat = overrideCat[i] ?? r.suggestedCategoryId
                    const catList = r.type === 'income' ? incomeCats : expenseCats
                    return (
                      <tr
                        key={i}
                        style={{
                          borderTop: '1px solid var(--color-row-divider)',
                          opacity: importable ? 1 : 0.4,
                        }}
                      >
                        <Td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!importable}
                            onChange={(e) => {
                              const next = new Set(selected)
                              if (e.target.checked) next.add(i)
                              else next.delete(i)
                              setSelected(next)
                            }}
                          />
                        </Td>
                        <Td>{r.date}</Td>
                        <Td>
                          <div style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.counterparty}
                          </div>
                          {r.note && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: 'var(--color-label-tertiary)',
                                maxWidth: 180,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.note}
                            </div>
                          )}
                        </Td>
                        <Td style={{ color: r.type === 'income' ? '#32d74b' : 'var(--color-label-primary)', fontWeight: 600 }}>
                          {r.type === 'income' ? '+' : '-'}
                          {formatCurrency(r.amount)}
                        </Td>
                        <Td>
                          <span style={typeBadge(r.type)}>
                            {r.type === 'income' ? '收入' : r.type === 'expense' ? '支出' : '转账'}
                          </span>
                        </Td>
                        <Td>
                          {importable && r.type !== 'transfer' ? (
                            <select
                              value={currentCat ?? ''}
                              onChange={(e) =>
                                setOverrideCat({
                                  ...overrideCat,
                                  [i]: Number(e.target.value),
                                })
                              }
                              style={{
                                fontSize: 12,
                                padding: '3px 6px',
                                background: 'var(--color-input-bg)',
                                border: '1px solid var(--color-input-border)',
                                borderRadius: 6,
                                color: 'var(--color-label-primary)',
                                maxWidth: 120,
                              }}
                            >
                              <option value="">请选择</option>
                              {catList.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.icon} {c.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ color: 'var(--color-label-tertiary)' }}>—</span>
                          )}
                        </Td>
                        <Td style={{ fontSize: 11.5 }}>
                          {r.isDuplicate && <Badge color="#ff9f0a">已存在</Badge>}
                          {r.isInternalTransfer && <Badge color="#5ac8fa">内部转账</Badge>}
                          {importable && !r.isDuplicate && !r.isInternalTransfer && (
                            <Badge color="#32d74b">可导入</Badge>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {selectedNoCat > 0 && !commit.isSuccess && (
              <span style={{ fontSize: 12, color: '#ff9f0a' }}>
                有 {selectedNoCat} 笔未指定分类,将被跳过。请补充分类后再导入。
              </span>
            )}
            {commitError && <ErrorMsg>{commitError}</ErrorMsg>}

            {commit.isSuccess && commit.data ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'rgba(50,215,75,0.10)',
                  border: '1px solid rgba(50,215,75,0.35)',
                  borderRadius: 12,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#32d74b',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#32d74b' }}>
                    已成功导入 {commit.data.inserted} 笔账单
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
                    账户余额、预算和分析报告已自动刷新
                  </div>
                </div>
                <button type="button" onClick={handleClose} style={ghostButton}>
                  完成
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={resetAll} style={ghostButton}>
                  重选文件
                </button>
                <button type="button" onClick={handleClose} style={ghostButton}>
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={selectedCount - selectedNoCat <= 0 || commit.isPending}
                  style={primaryButton(selectedCount - selectedNoCat > 0 && !commit.isPending)}
                >
                  {commit.isPending
                    ? '导入中…(同步刷新)'
                    : `导入 ${selectedCount - selectedNoCat} 笔`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────
function SummaryBar({ preview, selectedCount }: { preview: PreviewResponse; selectedCount: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        padding: '12px 14px',
        background: 'var(--color-input-bg)',
        borderRadius: 11,
        flexWrap: 'wrap',
      }}
    >
      <Stat label="解析" value={preview.total} />
      <Stat label="可导入" value={preview.importable} color="#32d74b" />
      <Stat label="已存在" value={preview.duplicates} color="#ff9f0a" />
      <Stat label="内部转账" value={preview.internalTransfers} color="#5ac8fa" />
      <div style={{ flex: 1 }} />
      <Stat label="已勾选" value={selectedCount} color="#0a84ff" />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-label-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color ?? 'var(--color-label-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function isImportable(r: PreviewRow): boolean {
  return !r.isDuplicate && !r.isInternalTransfer && r.type !== 'transfer'
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {children}
    </span>
  )
}

function typeBadge(type: 'income' | 'expense' | 'transfer'): React.CSSProperties {
  const c = type === 'income' ? '#32d74b' : type === 'expense' ? '#ff453a' : '#5ac8fa'
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 999,
    background: `${c}22`,
    color: c,
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>{label}</span>
      {children}
    </label>
  )
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12.5,
        color: '#ff453a',
        background: 'rgba(255,67,58,0.10)',
        border: '1px solid rgba(255,67,58,0.30)',
        borderRadius: 10,
        padding: '8px 12px',
      }}
    >
      {children}
    </div>
  )
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 500, fontSize: 11.5 }}>{children}</th>
)
const Td = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <td style={{ padding: '8px', ...style }}>{children}</td>
)

const inputStyle: React.CSSProperties = {
  fontSize: 14,
  padding: '10px 12px',
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-input-border)',
  borderRadius: 11,
  outline: 'none',
  color: 'var(--color-label-primary)',
}
const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--color-label-tertiary)' }

function pillButton(active: boolean): React.CSSProperties {
  return {
    padding: '7px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    background: active ? 'var(--color-border-base)' : 'var(--color-input-bg)',
    border: '1px solid var(--color-border-subtle)',
    color: 'var(--color-label-primary)',
    cursor: 'pointer',
  }
}

function primaryButton(active: boolean): React.CSSProperties {
  return {
    padding: '10px 22px',
    borderRadius: 11,
    fontSize: 14,
    fontWeight: 600,
    background: active
      ? 'linear-gradient(135deg, #0a84ff, #6e6ce8)'
      : 'var(--color-label-quaternary)',
    border: 'none',
    color: '#fff',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
  }
}

const ghostButton: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 11,
  fontSize: 14,
  fontWeight: 500,
  background: 'transparent',
  border: '1px solid var(--color-border-base)',
  color: 'var(--color-label-secondary)',
  cursor: 'pointer',
}
