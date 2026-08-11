/**
 * 路由比对工具。
 *
 * Tauri 静态导出需要 `trailingSlash: true`,导致 `usePathname()` 返回 `/login/`
 * 而硬编码的路由表里是 `/login`,直接 includes 会失败。
 * 比对前统一去掉末尾斜杠。
 */
export function normalizePath(pathname: string): string {
  if (pathname === '/' || !pathname) return pathname
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function matchesPath(pathname: string, candidates: string[]): boolean {
  return candidates.includes(normalizePath(pathname))
}
