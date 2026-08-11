'use client'

import { useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import NetWorthStats from '@/components/pages/assets/NetWorthStats'
import AssetList from '@/components/pages/assets/AssetList'
import LiabilityList from '@/components/pages/assets/LiabilityList'
import AddAssetModal from '@/components/pages/assets/AddAssetModal'
import AddLiabilityModal from '@/components/pages/assets/AddLiabilityModal'
import { useAssets } from '@/hooks/useAssets'
import type { Asset, Liability } from '@/lib/types'

export default function AssetsPage() {
  const { data } = useAssets()
  const assets = data?.assets ?? []
  const liabilities = data?.liabilities ?? []
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.remaining, 0)

  const [assetCreateOpen, setAssetCreateOpen] = useState(false)
  const [liabilityCreateOpen, setLiabilityCreateOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)

  return (
    <PageShell>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>资产负债</h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--color-label-secondary)' }}>
          一眼掌握净资产构成
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <NetWorthStats totalAssets={totalAssets} totalLiabilities={totalLiabilities} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14 }}>
          <AssetList
            items={assets}
            onAdd={() => setAssetCreateOpen(true)}
            onEdit={(a) => setEditingAsset(a)}
          />
          <LiabilityList
            items={liabilities}
            onAdd={() => setLiabilityCreateOpen(true)}
            onEdit={(l) => setEditingLiability(l)}
          />
        </div>
      </div>

      <AddAssetModal open={assetCreateOpen} onClose={() => setAssetCreateOpen(false)} />
      <AddAssetModal
        open={editingAsset !== null}
        onClose={() => setEditingAsset(null)}
        asset={editingAsset ?? undefined}
      />
      <AddLiabilityModal open={liabilityCreateOpen} onClose={() => setLiabilityCreateOpen(false)} />
      <AddLiabilityModal
        open={editingLiability !== null}
        onClose={() => setEditingLiability(null)}
        liability={editingLiability ?? undefined}
      />
    </PageShell>
  )
}
