# SSpongEE Personal Website

这是 SSpongEE 的个人网站项目，主题是“我什么都能学”，方向为金融与技术。

## 模板来源

本项目基于 al-folio 模板修改：

- 原仓库：https://github.com/alshedivat/al-folio
- 模板类型：Jekyll 学术/作品集型个人网站模板

## 主要修改

- 将站点名称、公开身份、邮箱和 GitHub 链接改为 SSpongEE 的个人信息。
- 将首页改为 Hero、About、Skills、Projects、Contact 五个基础内容区块。
- 关闭 blog、publications、repositories、CV、teaching 等暂不需要的示例导航。
- 将 Projects 页面收敛为课程作业项目，避免展示模板占位内容。
- 补充 `docs/prd.md`、`docs/design.md`、`docs/checklist.md` 和 `report/final-report.md`。

## GitHub Pages 链接

正式发布地址：

https://zj4566224-code.github.io

该链接应可在无痕窗口或其他设备中公开访问。

## 本地预览

al-folio 是 Jekyll 项目。推荐使用模板文档中的 Docker 方式：

```bash
docker compose pull
docker compose up
```

然后访问：

```text
http://localhost:8080
```

也可以按照 `docs/INSTALL.md` 使用 Ruby/Bundler 本地运行。

## 隐私说明

本仓库不得包含密码、课程邀请码、API Key、Token、`.env`、身份证件、私人住址或其他不应公开的信息。邮箱和 GitHub 主页是本人主动选择公开的联系信息。
