# deutsch-past · 德语过去助手（手机版）

把这个文件夹整个拖进 GitHub 仓库根目录，就能得到一个可用的网址：

```
https://g1289411912-max.github.io/-/deutsch-past/
```

> 中文步骤说明见同目录的 `说明（先看我）.txt`。

## 文件清单

| 文件 | 作用 | 能否删 |
|---|---|---|
| `index.html` | 应用本体（= `..\德语过去助手.html`） | ❌ 不能删 |
| `data.js` | 内置词表：128 个动词 + 类型 + 意义 + 例句 | ❌ 不能删（删了首屏没词） |
| `manifest.json` | 让手机能「添加到主屏」当 App | 可删（删了只能当普通网页） |
| `sw.js` | Service Worker：断网也能打开 | 可删（删了必须联网） |
| `icon.svg` | 主屏图标 | 可删 |

**入口文件名必须叫 `index.html`**，否则网址 `…/deutsch-past/` 会 404。

## 上传

1. 仓库 <https://github.com/g1289411912-max/->
2. **Add file → Upload files**
3. 把 `deutsch-past` **文件夹本身**拖进去（拖到仓库**根目录**，不要拖进已有的 `jiebin` 里）
4. **Commit changes** → 等 30～60 秒

上传成功后仓库首页应该出现：

```
deutsch-past/
  index.html
  data.js
  manifest.json
  sw.js
  icon.svg
```

## 更新

- **只改词表内容**：手机上点「导入条目 (.md)」选新的 `表格.md`（+「导入解析」选 `表格解析.md`），
  进度、错题本、笔记都保留
- **改应用本身 / 内置词表**：重新上传覆盖 `index.html` / `data.js` → Commit →
  手机上首页点「检查更新」（清离线缓存后重新加载）
- 改动没生效时：等 1 分钟，或在手机浏览器里清一下该站点缓存

## 说明

- 数据都在手机浏览器本地（localStorage），不上传；换手机或清缓存会丢
- 训练记录、错题本、笔记都按「动词原型」独立保存，换词表不会丢
