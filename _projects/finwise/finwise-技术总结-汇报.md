# FinWise 技术总结(汇报版)

> 个人 / 家庭财务管理应用。基于对全部源码的实际通读整理,可直接用于汇报 PPT。
> 关键纠正:本项目实际为 **Next.js 16 + React 19 + Tailwind v4**,预测用 **R 线性回归(非 Prophet)**,与早期 build-summary 的描述不同,以本文为准。

---

## 一、技术栈总览

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | **Next.js**(App Router)+ **React** | 16.2.6 / 19.2 | TypeScript,`'use client'` 客户端组件为主(51 处) |
| 样式 | **Tailwind CSS v4**(CSS-first `@theme`)+ 内联样式 + CSS 变量 | v4 | 暗色 Liquid Glass 玻璃拟态,4 套时段主题 |
| 状态管理 | **Zustand** | 5.0 | 全局 auth/token + 弹窗开关,localStorage 持久化 token |
| 数据请求 | **TanStack React Query** + **Axios** | 5.x / 1.16 | 缓存/失效驱动,axios 拦截器自动注入 JWT |
| 图表 | **Recharts** | 3.8 | 饼图、折线、柱状 |
| 动画 | **Framer Motion** | 12.x | 页面切换、卡片动效 |
| 表单 | **React Hook Form** | 7.76 | 所有新增/编辑弹窗 |
| 桌面端 | **Tauri 2 + Rust** | 2.11 | 打包 macOS dmg/app,标识 `app.finwise.desktop` |
| 后端框架 | **FastAPI** + **Uvicorn** | 0.115 / 0.32 | ASGI,自动 OpenAPI 文档 |
| 数据校验 | **Pydantic v2** | 2.10 | Create/Update/Response 三段式 + EmailStr |
| ORM | **SQLAlchemy 2.0**(future 模式)| 2.0.36 | 经典声明式模型 |
| 数据库 | **PostgreSQL 15** | — | psycopg2 驱动,Decimal(15,2) 金额 |
| 迁移 | **Alembic** | 1.14 | 2 个迁移版本(核心表 + 家庭表) |
| 认证 | **JWT(python-jose)** + **passlib/bcrypt** | — | HS256,token 默认 7 天 |
| 统计分析 | **R + rpy2** | 3.5(rpy2)| 健康分、预测、趋势、建议、预算报表 |
| AI 引擎 | **DeepSeek**(`deepseek-chat`,OpenAI 兼容 SDK)| openai 1.59 | Function Calling + 10 个查账工具 |
| 账单解析 | pandas / openpyxl / csv | — | 支付宝、微信账单导入 |
| 部署 | **Docker Compose** | — | db + backend 容器化,前端本地/容器可选 |

---

## 二、系统架构

```
┌─────────────────────────────────────────────┐
│  前端 Next.js 16 (浏览器) / Tauri 2 桌面壳    │
│  React Query 缓存 · Zustand · Recharts · RHF   │
└───────────────┬─────────────────────────────┘
                │ REST (axios, JWT Bearer)
┌───────────────▼─────────────────────────────┐
│  后端 FastAPI (Uvicorn)                       │
│  Pydantic 校验 · JWT 鉴权 · SQLAlchemy ORM    │
│        │                  │              │     │
│        ▼                  ▼              ▼     │
│  PostgreSQL 15      R 引擎(rpy2)    DeepSeek  │
│  (13 张表)          5 个 .R 脚本    大模型 AI   │
└─────────────────────────────────────────────┘
```

---

## 三、功能模块 ↔ 技术 对照(汇报核心)

| # | 功能模块 | 前端技术 | 后端技术 | 特色技术点 |
|---|----------|----------|----------|-----------|
| 1 | **用户认证**(注册/登录/改密/资料)| RHF 表单、Zustand 存 token、axios 拦截器 | FastAPI、passlib+bcrypt 哈希、python-jose 签发 JWT | 注册自动播种默认分类/账户 |
| 2 | **收支记账**(增删改查/筛选)| React Query useMutation、RHF 弹窗 | SQLAlchemy、Pydantic、joinedload 防 N+1 | 记账自动同步账户余额(Decimal 加减) |
| 3 | **分类管理**(预设+自定义)| React Query | 自引用外键支持父子分类 | 删分类用 RESTRICT 保护历史账目 |
| 4 | **账户管理**(现金/银行/信用卡)| React Query | CRUD + 余额联动 | — |
| 5 | **预算管理**(总预算+分类子预算)| Recharts、ProgressBar | 单 SQL group_by 聚合本月已花 | 实时进度/超支预警 |
| 6 | **仪表盘**(净结余/趋势/饼图)| Recharts 饼图+折线、Framer Motion | `/analysis/monthly` date_trunc 聚合 | 玻璃卡片光晕追踪 |
| 7 | **资产负债 / 净资产**| Recharts、StatCard | `func.coalesce(sum)` 聚合资产-负债 | `/net-worth` 净资产计算 |
| 8 | **财务目标**(进度/存入)| GoalCard、RHF | Decimal 累加 + 达标自动置 completed | 状态机 |
| 9 | **财务健康评分**(四维)| HealthScore 组件 | **R 脚本** health_score.R(加权评分)| R 失败降级 Python |
| 10 | **储蓄预测**(未来 6 月)| SavingsForecast、Recharts | **R 脚本** forecast.R(`lm()` 线性回归)| 非 Prophet,线性外推 |
| 11 | **个性化建议**| Suggestions 组件 | **R 脚本** suggestions.R(阈值规则)| 规则引擎,非 AI |
| 12 | **行为洞察**(工作日/周末、星期分布)| BehaviorInsights | `/analysis/insights` 90 天 Python 聚合 | weekday 分桶 |
| 13 | **现金流预警**(账户可撑天数)| CashflowWarning | `/analysis/cashflow` runway 估算 | critical/warning/ok 分级 |
| 14 | **AI 智能记账**(自然语言→交易)| useParseTransaction | **DeepSeek** function calling 强制结构化输出 | 校验 category_id 防越权 |
| 15 | **AI 财务助手**(对话查账)| FloatingAssistant 悬浮球(可拖拽)| **DeepSeek** 多轮 tool-use + 10 个查账工具 | RAG 注入用户分类/账户上下文 |
| 16 | **账单导入**(支付宝/微信)| ImportBillModal | pandas/openpyxl 解析 + MD5 去重 + 关键词自动分类 | 内部转账识别 |
| 17 | **家庭协作**(家庭/成员/邀请/共享预算目标)| useFamily(15+ 端点)| 角色权限(owner/co_owner/member)、family_id 隔离 | 唯一约束"一人一家" |
| 18 | **主题系统**(4 套时段主题自动切换)| useTheme、CSS 变量、layout 防 FOUC | — | 按时间(dawn/day/dusk/night)自动换肤 |
| 19 | **桌面应用**| Next 静态导出(`output:'export'`)| Tauri 2 + Rust 包装 | macOS dmg/app,Overlay 标题栏 |

---

## 四、前端技术详解

### 路由页面(Next.js App Router,共 11 个路由)
`/login` `/register`(公开)· `/dashboard` 仪表盘 · `/transactions` 收支 · `/budgets` 预算 · `/assets` 资产负债 · `/goals` 目标 · `/analysis` 分析 · `/family` 家庭 · `/settings` 设置

- **布局**:根 `layout.tsx` 挂 `Providers`(React Query)+ `TopBar` + `AuthGuard` + 全局 `FloatingAssistant`。
- **路由保护**:`AuthGuard` 用 Zustand 的 token 判断,无 token 跳 `/login`,有 token 访问公开页跳 `/dashboard`;后台静默拉 `/auth/me`,401 由 axios 拦截器触发 logout。

### 数据层(React Query + Axios)
- `lib/api.ts`:axios 实例,**请求拦截器从 localStorage 取 token 注入 `Authorization: Bearer`**。
- `lib/queryClient.ts`:staleTime 2 分钟、关闭 focus/mount 重拉,**靠 invalidate/setQueryData 主动刷新**而非轮询。
- 12 个 hooks 一一对应后端资源(useAuth/useTransactions/useBudgets/useAssets/useGoals/useFamily/useAnalysis/useAI/useImport…)。

### 状态管理(Zustand)
- `store/useAppStore.ts`:`user` / `token` / 全局新增弹窗开关;token 持久化到 localStorage;logout 时 `queryClient.clear()` 防脏数据。

### UI / 样式
- **Tailwind v4 CSS-first**:`globals.css` 用 `@theme` + CSS 变量定义系统色;**4 套主题**(night/day/dawn/dusk)按 `data-theme` 切换。
- **玻璃拟态**:`GlassCard` + `GlowOverlay`(鼠标追踪光晕)+ `backdrop-blur`。
- **组件库**:`ui/`(GlassCard、Modal、StatCard、ProgressBar、PillGroup)+ `charts/`(PieChart、BarChart,封装 Recharts)+ 各页面专属组件。
- **动画**:Framer Motion 做页面进场(`PageTransition`)、弹窗、悬浮球。
- **图标**:用 **emoji + 内联 SVG**(`lucide-react` 虽在依赖里但实际未使用)。
- **表单**:React Hook Form(`register`/`handleSubmit`/`watch`/`setValue`),配合 mutation 的 pending/error 状态。

### 桌面端(Tauri 2)
- Rust 壳 `tauri::Builder`,`tauri-plugin-log` 日志,devtools。
- `next.config.ts` 用 `TAURI=true` 切换 `output:'export'` 静态导出 → Tauri 装载 `../out`。
- 窗口 1280×800、`#0d0d0d` 背景、Overlay 隐藏标题栏;CSP 限制 connect-src 到 `localhost:8000`。

---

## 五、后端技术详解

### 框架与认证
- **FastAPI** 多 `APIRouter` 模块化挂载;CORS 中间件按环境变量配置来源。
- **认证**:`passlib[bcrypt]` 哈希密码;`python-jose` 签 HS256 JWT(`sub`=用户 id,默认 7 天);依赖注入 `get_current_user`(`OAuth2PasswordBearer`)做全局鉴权与用户级数据隔离。

### 数据模型(SQLAlchemy 2.0,13 张表)
- **个人域(User 枢纽)**:users / accounts / categories(自引用)/ transactions / budgets / assets / liabilities / goals。
- **家庭域(Family 枢纽)**:families / family_members(唯一约束=一人一家)/ family_invitations / family_budgets / family_goals。
- 金额统一 `Numeric(15,2)`;FK 级联删除;`pool_pre_ping` 防失效连接;无软删除。

### Pydantic v2 校验
- 每个实体 Create/Update/Response 三段式;`EmailStr`、`Field(gt=0)`、`Literal` 枚举;
- 另有无表的纯应用层 schema:analysis(健康分/预测/洞察/现金流)、ai(解析/聊天)、import_bill(导入)。

### API 端点(按资源)
auth · accounts · categories · transactions(含 /summary)· budgets(含 /progress)· assets + /net-worth · liabilities · goals(含 /contribute)· imports · ai(/parse-transaction、/chat)· analysis(/monthly /health-score /suggestions /forecast /insights /cashflow /report)· families(15+,含邀请/成员/预算/目标/月度汇总)。

---

## 六、分析引擎与 AI(项目最大亮点)

### R 统计引擎(rpy2 进程内嵌)
- `services/r_engine.py` 用 **rpy2** 桥接:Python 值 → R 对象注入全局 `input_data`,执行 .R,取回全局 `result`(JSON)。
- 失败(无 rpy2 / 脚本缺失 / 异常)统一返回 `None`,由 router 降级到 Python 计算,**保证接口不报错**。

| R 脚本 | 功能 | 算法 |
|--------|------|------|
| health_score.R | 财务健康分 | 4 维(储蓄率/预算控制/负债/目标)等权加权 |
| forecast.R | 储蓄预测 | `lm()` 一元线性回归外推 6 期(**非 Prophet**)|
| trend_analysis.R | 收支趋势 | `lm()` 取斜率 |
| suggestions.R | 个性化建议 | if/else 阈值规则 |
| budget_report.R | 预算报表 | 使用率/超支算术 |

> 仅依赖 R 的 `jsonlite`,无机器学习库。

### AI 引擎(DeepSeek,OpenAI 兼容)
- `services/ai.py`:`OpenAI(base_url="https://api.deepseek.com")`,模型 `deepseek-chat`,key 取环境变量 `DEEPSEEK_API_KEY`(缺则抛 `MissingAPIKey` 由 router 友好降级)。
- **两大能力**:
  1. **自然语言记账**:`tool_choice` 强制调用 `submit_parsed_transaction`,模型把"昨天打车 30"解析成结构化交易草稿,并校验 category_id 归属。
  2. **财务问答助手**:多轮 Function Calling,模型可调 **10 个查账工具**(月度汇总、对比、趋势、预算超支预测、异常检测、目标进度…),工具均为纯 Python + SQLAlchemy 聚合,严格按 `user.id` 隔离。
- **RAG 式上下文**:把该用户的分类、账户清单拼进 system message,约束模型不得编造 id。

> 说明:账单"自动分类""规则建议"是**关键词/阈值**实现,**不是 AI**,汇报时建议区分。

---

## 七、部署与工程化

- **Docker Compose**:`db`(postgres:15,数据持久化到卷)+ `backend`(FastAPI)默认启动;`frontend` 在 `dockered` profile,默认本地 `npm run dev` 跑 3000。
- **数据库迁移**:Alembic 2 个版本(初始 8 表 + 家庭 5 表)。
- **环境隔离**:DeepSeek key 从 host 透传;CORS 同时放行 Web(3000)与 Tauri。

---

## 八、可在 PPT 中强调的设计亮点

1. **三引擎协同**:FastAPI 业务 + R 统计分析(rpy2)+ DeepSeek 大模型,各司其职。
2. **AI 不是噱头**:用 Function Calling 让模型调真实数据库工具,RAG 注入上下文、严格用户隔离,杜绝幻觉编造。
3. **优雅降级**:R 不可用→Python 兜底;AI 无 key→友好提示;接口永不因分析层失败而 500。
4. **数据一致性**:金额全程 Decimal,记账即时联动账户余额,删分类 RESTRICT 保护历史。
5. **跨端一套代码**:同一 Next 前端,Web 用 SSR/dev,桌面用静态导出 + Tauri 原生壳。
6. **细节体验**:4 套时段主题自动换肤、防 FOUC、可拖拽 AI 悬浮球、玻璃拟态光晕。
7. **家庭协作**:角色权限 + 邀请流程 + 共享预算/目标,从个人记账升级为家庭账本。

---

## 九、建议 PPT 大纲(约 12–14 页)

1. 封面:FinWise — 智能个人/家庭财务管理
2. 项目定位与功能范围(MVP / 分析 / 家庭)
3. 技术栈总览(一张大表,见第一节)
4. 系统架构图(见第二节)
5. 前端技术:Next 16 + React Query + Zustand + Tailwind v4
6. UI/交互亮点:玻璃拟态 + 4 套主题 + 动画
7. 后端技术:FastAPI + SQLAlchemy + Pydantic + JWT
8. 数据模型:13 张表 ER 图(个人域 + 家庭域)
9. R 统计引擎:5 个脚本 + rpy2 + 降级
10. AI 引擎:DeepSeek + Function Calling + 10 工具 + RAG
11. 功能↔技术对照总表(见第三节,可拆 2 页)
12. 桌面端 Tauri + Docker 部署
13. 设计亮点与工程化(降级/一致性/跨端)
14. 总结 / 后续规划
