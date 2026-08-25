---
name: publish-release
description: Publish a BT-PS-Script version (bump VERSION, changelog, build jsx, git tag, GitHub Release). Use when the user asks to 發佈, release, 打 tag, 出包, 發版, or create a GitHub Release for this Photoshop script.
---

# 發佈 BT-PS-Script

嚴格依照倉庫內 `docs/RELEASE.md` 執行。不要用 `do_release.sh`。

## 必做

1. 確認版本號（使用者指定則用該號；否則依 SemVer 提議並先問）。禁止 `1.7.x`。
2. 改 `src/version.ts`，更新 `CHANGELOG.md`。
3. `yarn install && ./build.sh`，確認 jsx 內 VERSION 正確。
4. commit 訊息 `release x.y.z`（不要 add `build/`）。
5. `git tag x.y.z`（無 `v` 前綴）。
6. `git -c http.version=HTTP/1.1 push bt HEAD:master` 與 `git push bt x.y.z`。遠端是 `bt`（FoxyBubbles/BT-PS-Script），不是 `origin`。
7. 開 GitHub Release，附件必須是 `build/LabelPlus_Ps_Script_BT.jsx`。
8. 回報 Release URL。

## 禁止

- 提交 `.jsx` 進 git
- force-push 已公開的 `master`／tag
- 把 GitHub token 寫進檔案或回覆
- 推到 `ZsIsMe/PS-Script`
