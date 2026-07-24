# Checklist：SSpongEE 个人网站验收清单

完成每一项后，需要用截图、链接、文件路径或复现步骤作为证据。

## 内容检查

- [x] 首页显示 SSpongEE 和定位“我什么都能学”。证据：`screenshots/homepage-desktop.png`、`screenshots/homepage-mobile.png`。
- [x] About 内容是本人真实学习方向，没有模板作者信息。证据：首页 About 文本。
- [x] Skills 至少包含金融学习、技术工具、AI 协作和项目表达。证据：首页 Skills 区块。
- [x] Projects 至少有一个项目，且项目状态标注真实。证据：`_projects/1_project.md`。
- [x] Contact 至少包含有效 GitHub 链接。证据：首页 Contact 区块和 `https://github.com/zj4566224-code`。

## 功能检查

- [x] 导航可以进入 Projects 页面。证据：`/projects/` 页面可访问。
- [x] GitHub 链接可以打开 `https://github.com/zj4566224-code`。
- [x] 邮箱链接可以触发邮件客户端或显示正确邮箱地址。
- [x] 页面没有明显 404、死链或错误跳转。证据：本地预览和 GitHub Pages 页面均可访问。

## 显示检查

- [x] 桌面端首页文字、头像和链接显示正常。证据：`screenshots/homepage-desktop.png`。
- [x] 手机端首页主要内容可读，没有横向溢出。证据：`screenshots/homepage-mobile.png`。
- [x] Projects 页面项目卡片显示正常。证据：Projects 页面本地和线上检查。

## 工程检查

- [x] `README.md` 已写明模板来源、主要修改、Pages 链接和隐私说明。
- [x] `docs/prd.md`、`docs/design.md`、`docs/checklist.md` 均存在且非空。
- [x] `report/final-report.md` 已完成。
- [x] `screenshots/` 至少包含 4 张关键证据截图。
- [x] Git 至少有 3 次有意义 commit。证据：`docs`、`content`、`validation` 三类提交。

## 发布与提交

- [x] GitHub Pages 正式链接可以在无痕窗口打开。证据：`screenshots/github-pages.png`。
- [x] README 和最终报告都记录了 GitHub Pages 链接。
- [ ] TA-Claw 预览中代码、报告、截图和会话匹配本项目。
- [ ] 提交完成二次确认，并看到 `Submitted successfully`。

## 隐私检查

- [x] 仓库不包含 `.env` 文件。
- [x] 仓库不包含密码、课程邀请码、API Key 或 Token。
- [x] 截图和报告不包含不应公开的个人信息。
