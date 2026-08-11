---
layout: page
title: FinWise 理财助手
description: 独立开发的本地全栈个人理财应用，连接金融业务场景与软件工程实践。
img: assets/img/finwise-dashboard.png
importance: 1
category: work
related_publications: false
---

## 项目概览

FinWise 是一个面向个人与家庭财务管理的本地全栈应用。我独立完成了需求拆解、前端开发、后端接口、数据库建模、分析脚本和本地运行验证。

项目重点不是简单记账，而是把账户、交易、预算、资产、负债、目标和家庭协作等信息放在同一套数据结构中，再提供趋势分析、储蓄预测、账单导入和可选的 AI 助手功能。

## 核心功能

- 账户、交易、资产和负债管理
- 分类预算、财务目标与家庭成员协作
- 净资产、现金流、支出结构和健康度分析
- 账单导入与结构化解析
- 可选的 DeepSeek/OpenAI-compatible AI 助手
- Python 与 R 分析脚本，支持预测、预算报告和建议生成

## 技术实现

- 前端：Next.js、React、TypeScript、Zustand、TanStack Query、Recharts
- 后端：FastAPI、SQLAlchemy、Pydantic、Alembic
- 数据库：PostgreSQL
- 分析：Python、pandas、R
- 工程化：Docker Compose、Tauri、环境变量配置

## 我负责的工作

1. 设计前后端目录结构和金融数据模型。
2. 实现 FastAPI 路由、认证、数据库访问和 Alembic 迁移。
3. 使用 React/TypeScript 完成仪表盘、交易、预算、资产、目标和家庭页面。
4. 将金融分析逻辑拆分为可复用的后端服务和 R 脚本。
5. 通过 Docker Compose 组织 PostgreSQL、后端和前端的本地运行流程。

## 项目状态

项目已在本地完成运行验证，目前以源码和演示材料形式公开。AI 功能需要用户自行配置 API key；真实环境变量不会提交到仓库。

## 源码与演示

- [GitHub 源码目录](https://github.com/zj4566224-code/zj4566224-code.github.io/tree/main/_projects/finwise)
- [项目 README](https://github.com/zj4566224-code/zj4566224-code.github.io/blob/main/_projects/finwise/README.md)

