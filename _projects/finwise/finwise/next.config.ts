import type { NextConfig } from 'next'

// 通过环境变量切换 Web (Docker) 与桌面 (Tauri) 构建。
// TAURI=true 时输出静态 HTML/JS,由 Tauri 包装成原生窗口。
const isTauri = process.env.TAURI === 'true'

const nextConfig: NextConfig = {
  ...(isTauri && {
    output: 'export',
    images: { unoptimized: true },
    trailingSlash: true,
  }),
}

export default nextConfig
