# Final Report：SSpongEE 个人网站

## 项目定位

本项目是一个个人网站，公开名称为 SSpongEE，定位是“我什么都能学”，专业方向为金融与技术。网站用于展示个人简介、学习能力、项目记录和联系方式。

## 模板选择

我选择 al-folio 模板，因为它适合个人主页、学术主页和项目展示，默认支持响应式布局，并且可以通过 GitHub Actions 部署到 GitHub Pages。该模板功能较多，因此本作业重点放在基础内容、文档、验证和发布上，不追求复杂功能。

模板原仓库：https://github.com/alshedivat/al-folio

## 主要修改

- 修改 `_config.yml` 中的网站名称、描述、语言、URL 和公开身份。
- 修改 `_pages/about.md`，完成 Hero、About、Skills、Projects、Contact 五个基础区块。
- 修改 `_pages/projects.md` 和 `_projects/1_project.md`，只展示与本课程相关的项目。
- 修改 `_data/socials.yml`，添加 GitHub 用户名和公开邮箱。
- 关闭 blog、publications、repositories、CV、teaching 等暂不需要的示例导航。
- 取消模板自带人物头像，避免公开页面保留模板人物占位。
- 将移动端容易遮挡内容的固定 footer 改为普通页脚。
- 补充 README、PRD、Design、Checklist 和本最终报告。

## AI 参与

AI Agent 帮助阅读作业说明、分析 al-folio 模板结构、制定修改范围、替换文件内容、生成规格文档和检查清单。个人负责确认公开信息、决定网站定位、选择是否公开邮箱，以及后续发布和提交确认。

## 个人判断

al-folio 比简单静态模板复杂，但更适合展示长期学习和项目积累。本次作业优先保证五个基础区块完整、内容真实、链接可访问、文档齐全和提交可追溯。博客、论文、简历等功能暂时关闭，避免模板示例内容影响验收。

## 验证结果

已完成：

- 使用 Docker 启动本地预览，首页返回 HTTP 200。
- Projects 页面返回 HTTP 200。
- 已生成桌面端首页截图：`screenshots/homepage-desktop.png`。
- 已生成手机端首页截图：`screenshots/homepage-mobile.png`。
- 已生成 GitHub Pages 公开页面截图：`screenshots/github-pages.png`。
- 已生成完成后的 Checklist 截图：`screenshots/checklist.png`。
- 已检查移动端 footer 不再遮挡正文，首页不再显示模板人物头像。
- 已完成至少 3 次有意义 commit 的准备：规格文档、个人内容、验收材料。

待完成：TA-Claw 预览和二次确认提交。

## GitHub Pages 链接

正式链接：https://zj4566224-code.github.io

该链接已作为 README 和本报告中的正式 GitHub Pages 链接。

## 问题与后续计划

- 后续可以继续补充金融科技、数据分析或 AI 协作方向的小项目。
- 如果未来更换仓库名或自定义域名，需要同步检查 `_config.yml` 中的 `url` 和 `baseurl`。
- 最后提交前仍需在 TA-Claw 中预览项目包，并完成二次确认提交。
