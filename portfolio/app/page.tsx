'use client'

import { motion } from 'motion/react'
import { ArrowUpRight, GithubIcon, MailIcon, XIcon } from 'lucide-react'
import { Magnetic } from '@/components/ui/magnetic'
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTrigger,
} from '@/components/ui/morphing-dialog'
import { EMAIL, PROJECTS, SKILL_GROUPS, SOCIAL_LINKS } from './data'

const VARIANTS_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const VARIANTS_SECTION = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

const TRANSITION_SECTION = { duration: 0.3 }

function ProjectImage({ src, alt }: { src: string; alt: string }) {
  return (
    <MorphingDialog
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
    >
      <MorphingDialogTrigger>
        <img
          src={src}
          alt={alt}
          className="aspect-[16/10] w-full cursor-zoom-in rounded-xl object-cover"
        />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="relative max-w-[94vw] rounded-2xl bg-zinc-50 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950 dark:ring-zinc-800/50">
          <img
            src={src}
            alt={alt}
            className="max-h-[82vh] w-full rounded-xl object-contain"
          />
        </MorphingDialogContent>
        <MorphingDialogClose
          className="fixed top-6 right-6 h-fit w-fit rounded-full bg-white p-1"
          variants={{
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { delay: 0.3, duration: 0.1 } },
            exit: { opacity: 0, transition: { duration: 0 } },
          }}
        >
          <XIcon className="h-5 w-5 text-zinc-500" />
        </MorphingDialogClose>
      </MorphingDialogContainer>
    </MorphingDialog>
  )
}

function AgentPreview() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#f4f3ef] p-5 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
        RESEARCHER PORTRAIT AGENT
      </p>
      <div className="mt-7 space-y-4">
        {['PDF / Markdown', 'Validated JSON Cards', 'Research Portrait'].map(
          (step, index) => (
            <div className="flex items-center gap-3" key={step}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-950">
                0{index + 1}
              </span>
              <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
              <span className="w-36 text-sm sm:w-44">{step}</span>
            </div>
          ),
        )}
      </div>
      <p className="absolute right-5 bottom-5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
        Python · Marker · Skills
      </p>
    </div>
  )
}

function MagneticSocialLink({
  children,
  link,
}: {
  children: React.ReactNode
  link: string
}) {
  const isExternal = link.startsWith('http')

  return (
    <Magnetic springOptions={{ bounce: 0 }} intensity={0.3}>
      <a
        href={link}
        className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-sm text-black transition-colors duration-200 hover:bg-zinc-950 hover:text-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </Magnetic>
  )
}

export default function Personal() {
  return (
    <motion.main
      className="space-y-20 pb-4 sm:space-y-24"
      variants={VARIANTS_CONTAINER}
      initial="hidden"
      animate="visible"
    >
      <motion.section
        variants={VARIANTS_SECTION}
        transition={TRANSITION_SECTION}
      >
        <div className="max-w-xl">
          <p className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
            我是钟慧豪，深圳大学金融科技学院本科生。我关注金融场景中的软件开发、
            数据处理与研究自动化，并把想法做成可运行、可复用、可展示的项目。
          </p>
          <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            目标方向：金融科技开发、Python 后端、数据分析、AI 应用与量化研究助理。
          </p>
        </div>
      </motion.section>

      <motion.section
        variants={VARIANTS_SECTION}
        transition={TRANSITION_SECTION}
      >
        <h3 className="mb-5 text-lg font-medium">精选项目</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <div key={project.name} className="space-y-2">
              <div className="relative overflow-hidden rounded-xl bg-zinc-50/40 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950/40 dark:ring-zinc-800/50">
                {project.image ? (
                  <ProjectImage
                    src={project.image}
                    alt={`${project.name} 项目界面`}
                  />
                ) : (
                  <AgentPreview />
                )}
              </div>
              <div className="px-1 pt-1">
                <a
                  className="group inline-flex items-center gap-1 font-[450] text-zinc-900 dark:text-zinc-50"
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.name}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.stack.map((item) => (
                    <span
                      className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={VARIANTS_SECTION}
        transition={TRANSITION_SECTION}
      >
        <h3 className="mb-5 text-lg font-medium">技术能力</h3>
        <div className="space-y-5">
          {SKILL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {group.skills.map((skill) => (
                  <span
                    className="border-b border-zinc-200 pb-1 text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={VARIANTS_SECTION}
        transition={TRANSITION_SECTION}
      >
        <h3 className="mb-3 text-lg font-medium">教育与探索</h3>
        <div className="border-l border-zinc-200 pl-4 dark:border-zinc-800">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            深圳大学金融科技学院
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            金融科技本科在读
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            具备量化研究基础，了解回归与因子分析；正在继续补足机器学习的模型训练与应用能力。
          </p>
        </div>
      </motion.section>

      <motion.section
        variants={VARIANTS_SECTION}
        transition={TRANSITION_SECTION}
      >
        <h3 className="mb-5 text-lg font-medium">联系我</h3>
        <p className="mb-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          欢迎通过邮箱或 GitHub 联系我：
          <a className="ml-1 underline dark:text-zinc-300" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
        </p>
        <div className="flex items-center justify-start gap-3">
          {SOCIAL_LINKS.map((link) => (
            <MagneticSocialLink key={link.label} link={link.link}>
              {link.kind === 'github' ? (
                <GithubIcon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MailIcon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {link.label}
            </MagneticSocialLink>
          ))}
        </div>
      </motion.section>
    </motion.main>
  )
}
