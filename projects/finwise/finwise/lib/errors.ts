import { AxiosError } from 'axios'

// 把后端 / axios 的错误统一抽成可读字符串
export function getErrorMessage(error: unknown, fallback = '操作失败,请稍后再试'): string | null {
  if (!error) return null
  if (error instanceof AxiosError) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail
    if (detail) return detail
  }
  return fallback
}
