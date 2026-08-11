# FinWise 项目构建总结

---

## 一、项目定位

**面向职场新人与中产家庭的个人财务管理 Web 应用**

---

## 二、功能范围

### MVP
- 收支录入（新增/编辑/删除，支持分类/账户/日期/备注）
- 分类管理（预设 + 自定义）
- 支出统计（月度汇总、饼图、趋势折线图）
- 预算设置（总预算 + 分类子预算）
- 预算执行（实时进度条、超支预警）
- 用户认证（注册/登录/JWT）

### V2
- 资产负债管理（净资产计算）
- 财务目标规划（进度追踪）
- 提醒通知（账单/预算/复盘）

### 分析与建议
- 月度报表（R 生成）
- 储蓄预测（Prophet 模型）
- 财务健康评分（四维）
- 个性化建议

---

## 三、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + TypeScript + Tailwind CSS |
| 图表 | Recharts |
| 状态管理 | Zustand |
| 后端 | FastAPI（Python） |
| ORM | SQLAlchemy + Alembic |
| 数据库 | PostgreSQL 15 |
| 分析引擎 | R（rpy2 桥接） |
| 认证 | JWT |
| 部署 | Docker Compose |

---

## 四、系统架构

```
Next.js 前端
    ↓ REST API
FastAPI 后端
    ↓              ↓
PostgreSQL     R 分析引擎
```

---

## 五、页面结构

| 路由 | 页面 | 核心内容 |
|------|------|---------|
| `/dashboard` | 仪表盘 | 净结余、收支趋势、支出饼图、预算概览 |
| `/transactions` | 收支记录 | 流水列表、新增弹窗、筛选 |
| `/budgets` | 预算管理 | 总预算卡、分类进度、超支高亮 |
| `/assets` | 资产负债 | 净资产统计、资产/负债明细 |
| `/goals` | 财务目标 | 目标进度卡、存入操作 |
| `/analysis` | 分析报告 | 健康评分、个性化建议、储蓄预测 |

---

## 六、UI 设计规范

**风格：Apple 暗色系 + Liquid Glass 磨砂玻璃**

### 色彩
```
背景：#0d0d0d
卡片：rgba(255,255,255,0.05) + blur(40px)
文字：#ffffff（主）/ rgba(255,255,255,0.5)（次）
绿色：#32d74b  红色：#ff453a  蓝色：#0a84ff
橙色：#ff9f0a  紫色：#bf5af2
```

### 关键交互
- 顶部导航栏（固定，磨砂玻璃）
- 悬浮导航项时显示数据预览下拉框
- 页面切换弹性动画（translateY + fade）
- 卡片鼠标追踪光晕效果

---

## 七、数据库表结构

```
users          → 用户
accounts       → 账户（现金/银行/信用卡）
categories     → 分类（支持子分类）
transactions   → 交易记录（核心表）
budgets        → 预算（总预算 + 分类预算）
assets         → 资产
liabilities    → 负债
goals          → 财务目标
reminders      → 提醒
```

---

## 八、API 端点

```
POST /auth/register          注册
POST /auth/login             登录

GET/POST   /accounts         账户
GET/POST   /categories       分类
GET/POST   /transactions     收支记录
GET/POST   /budgets          预算
GET/POST   /assets           资产
GET/POST   /liabilities      负债
GET/POST   /goals            目标
POST       /goals/{id}/contribute  存入金额

GET /analysis/report         完整分析报告
GET /analysis/health-score   健康评分
GET /analysis/suggestions    个性化建议
GET /analysis/forecast       储蓄预测
```

---

## 九、R 分析模块

| 脚本 | 功能 |
|------|------|
| `health_score.R` | 四维财务健康评分（储蓄率/预算控制/负债水平/目标进度） |
| `suggestions.R` | 根据数据生成个性化文字建议 |
| `forecast.R` | 线性外推预测未来 6 个月储蓄 |
| `budget_report.R` | 预算执行情况分析 |
| `trend_analysis.R` | 收支趋势分析 |

Python 通过 `rpy2` 调用 R 脚本，失败时降级为 Python 基础计算。

---

## 十、本地部署

### 目录结构
```
~/
├── finwise/               ← Next.js 前端
├── finwise-backend/       ← FastAPI 后端
└── docker-compose.yml     ← 统一启动入口
```

### 启动命令
```bash
# 首次构建（约 5-15 分钟）
docker-compose up --build

# 日常启动
docker-compose up -d

# 停止
docker-compose stop
```

### 访问地址
| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| 接口文档 | http://localhost:8000/docs |

### Docker 说明
- 不是虚拟机，是进程级隔离，启动只需几秒
- 运行时内存约 280MB（PostgreSQL 50 + FastAPI 80 + Next.js 150）
- 数据存储在本地 Docker Volume，停止容器数据不丢失
- 个人使用完全免费

---

## 十一、Claude Code 指令文件

| 文件 | 用途 |
|------|------|
| `finwise-frontend-prompt.md` | 生成前端代码 |
| `finwise-backend-prompt.md` | 生成后端代码 |
| `finwise-docker-prompt.md` | 配置 Docker 并启动 |

---

## 十二、开发阶段建议

```
① 前端（Mock 数据）→ ② 后端 API → ③ 前后端联调 → ④ 接入 R 分析
```

后续可扩展方向：
- 移动端适配
- 数据导出（Excel/CSV）
- 多人/家庭账本
- 银行账单自动导入
