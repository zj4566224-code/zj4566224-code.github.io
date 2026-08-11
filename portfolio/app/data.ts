type Project = {
  name: string
  description: string
  link: string
  image?: string
  stack: string[]
  id: string
}

type SocialLink = {
  label: string
  link: string
  kind: 'github' | 'email'
}

export const PROJECTS: Project[] = [
  {
    name: 'FinWise',
    description:
      '独立开发的本地全栈个人理财助手，覆盖账户、交易、预算、资产、目标与家庭协作。',
    link: 'https://github.com/zj4566224-code/zj4566224-code.github.io/tree/main/_projects/finwise',
    image: '/projects/finwise-dashboard.png',
    stack: ['Next.js', 'FastAPI', 'PostgreSQL', 'Docker'],
    id: 'project1',
  },
  {
    name: 'Researcher Portrait Agent',
    description:
      '面向论文处理与研究归纳的自动化 Agent，包含格式转换脚本、可复用 skill 与可验证工作流。',
    link: 'https://github.com/zj4566224-code/zj4566224-code.github.io/tree/main/.agents/skills/researcher-portrait-agent',
    stack: ['Python', 'Marker', 'JSON', 'AI Agent'],
    id: 'project2',
  },
]

export const SKILL_GROUPS = [
  {
    label: '后端与数据',
    skills: ['Python', 'SQL', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'pandas'],
  },
  {
    label: '前端与应用',
    skills: ['Next.js', 'React', 'TypeScript', 'TanStack Query', 'Zustand'],
  },
  {
    label: '工程与自动化',
    skills: ['Docker Compose', 'Git', 'Alembic', 'R', '任务型 AI Agent'],
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    link: 'https://github.com/zj4566224-code',
    kind: 'github',
  },
  {
    label: 'Email',
    link: 'mailto:2024290239@szu.edu.cn',
    kind: 'email',
  },
]

export const EMAIL = '2024290239@szu.edu.cn'
