import type { Metadata } from 'next'
import './globals.css'
import TopBar from '@/components/layout/TopBar'
import Providers from '@/components/layout/Providers'
import AuthGuard from '@/components/layout/AuthGuard'
import FloatingAssistant from '@/components/FloatingAssistant'

export const metadata: Metadata = {
  title: 'FinWise · 个人财务管理',
  description: '智能、克制、好看的个人财务管理',
}

// 同步设置 data-theme,避免 React 接管前的浅色/深色闪烁(FOUC)。
// 与 lib/theme.ts 的时段定义保持一致。
const themeBootstrap = `(function(){try{var p=localStorage.getItem('theme-pref')||'auto';var t=p;if(p==='auto'){var d=new Date();var h=d.getHours()+d.getMinutes()/60;t=h>=5.5&&h<7?'dawn':h>=7&&h<17?'day':h>=17&&h<19?'dusk':'night';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','night');}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <Providers>
          <TopBar />
          <AuthGuard>{children}</AuthGuard>
          <FloatingAssistant />
        </Providers>
      </body>
    </html>
  )
}
