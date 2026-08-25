# 發佈版本（給維護者與 AI）

使用者只要到 GitHub Releases 下載 `LabelPlus_Ps_Script_BT.jsx`。  
發版時必須讓這四件事同一個號：**程式 VERSION、CHANGELOG、git tag、GitHub Release**。

本倉庫遠端：

- 發佈目標：`bt` → `https://github.com/FoxyBubbles/BT-PS-Script.git`
- 預設分支：`master`（本地可能叫 `feature/support_balloontranslator_json`，推送時用 `HEAD:master`）
- 不要推到 `origin`（那是 `ZsIsMe/PS-Script`，Meo／LabelPlus 衍生倉）

`build/` 已 gitignore，**不要把 `.jsx` 提交進 git**，只當 Release 附件。

不要使用 `do_release.sh`（互動式、預設 `origin`、依賴 GNU sed／7z）。照下面步驟做。

---

## 版本號規則

SemVer：`主版.次版.修訂`（例如 `0.1.0`）。

| 情況 | 怎麼加 |
|------|--------|
| 修 bug、行為不變 | 修訂 `0.1.0` → `0.1.1` |
| 新功能、舊用法仍可用 | 次版 `0.1.1` → `0.2.0` |
| 不相容大改 | 主版 `0.2.0` → `1.0.0` |

- 第一個公開版是 **`0.1.0`**（未滿 1.0，表示仍可能調整）。
- **禁止**再使用 LabelPlus 的 `1.7.x`。
- Tag **不加** `v` 前綴：`0.1.0`，不是 `v0.1.0`。
- 使用者沒指定版本時：讀 `src/version.ts` 與最新 tag，依上表提議下一號，**先問使用者確認再發**。

---

## 發佈步驟

把 `VERSION` 換成實際號（例如 `0.2.0`）。

### 1. 改版本

`src/version.ts`：

```ts
export const VERSION: string = "VERSION";
```

### 2. 寫 Changelog

在 `CHANGELOG.md` 的 `[Unreleased]` 下面新增一節，日期用當天：

```md
## [VERSION] - YYYY-MM-DD
### Added
- …
### Changed
- …
### Fixed
- …
```

只寫**這個版本相對上一版**的 BT 相關改動。上游 LabelPlus `1.7.4` 及更早是歷史，不要改。

發完後把 `[Unreleased]` 清空，保留空的 Added／Changed／Fixed／Removed 標題。

### 3. 建置

```bash
yarn install
./build.sh
```

確認輸出 `build/LabelPlus_Ps_Script_BT.jsx`，且檔內有 `LabelPlus.VERSION = "VERSION"`。

### 4. 提交（不要包含 `build/`）

```bash
git add src/version.ts CHANGELOG.md
# 若有 README、截圖、發版文件一併加入
git commit -m "release VERSION"
```

### 5. 打 tag

```bash
git tag VERSION
```

Tag 必須打在這次 `release VERSION` commit 上。若打錯：

```bash
git tag -d VERSION          # 僅尚未 push 時
```

已 push 的 tag 不要 force，改發下一個版本。

### 6. 推送

```bash
git -c http.version=HTTP/1.1 push bt HEAD:master
git -c http.version=HTTP/1.1 push bt VERSION
```

本機連 GitHub HTTPS 若逾時，把指令交給使用者在 Sourcetree／終端機執行，不要改 `origin`。

### 7. 開 GitHub Release

對 `FoxyBubbles/BT-PS-Script`：

- tag：`VERSION`
- 標題：`VERSION`
- 說明：從 CHANGELOG 該節翻譯／摘成短列表（繁體）
- 附件：`build/LabelPlus_Ps_Script_BT.jsx`（檔名保持這個，README 寫的是這個名字）

可用 `gh`：

```bash
gh release create VERSION \
  build/LabelPlus_Ps_Script_BT.jsx \
  --repo FoxyBubbles/BT-PS-Script \
  --title "VERSION" \
  --notes-file - <<'EOF'
摘自 CHANGELOG 的說明
EOF
```

沒有 `gh` 時，用 GitHub API：`POST /repos/FoxyBubbles/BT-PS-Script/releases`，再把 jsx 傳到 `uploads.github.com`。Token 從 `git credential fill`（host=github.com）取得，**禁止**把 token 寫進檔案或聊天。

### 8. 檢查

- https://github.com/FoxyBubbles/BT-PS-Script/releases 看得到該版本與 jsx
- Photoshop 打開腳本，標題為 `For BallonsTranslator VERSION`
- 本地 `git status` 乾淨；`build/` 仍是未追蹤／被忽略

---

## 禁止

- 把 `build/` 或 `.jsx` 提交進 git
- force-push `master` 或已公開的 tag
- 發到 `origin`（ZsIsMe/PS-Script）
- 跳過 Changelog 或讓 VERSION 與 tag 不一致
- 未得使用者同意就發版（使用者已明確說「發佈 x.y.z」時可視為同意該號）
