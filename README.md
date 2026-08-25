# BT-PS-Script

本專案源自 [LabelPlus/PS-Script](https://github.com/LabelPlus/PS-Script)。

原專案是 LabelPlus 工具包裡的 Photoshop 文本導入腳本：讀入翻譯文本，逐條寫入 PSD。本倉庫在此基礎上改為讀取 [BalloonsTranslator](https://github.com/dmMaze/BallonsTranslator) 工程 JSON，把氣泡裡的翻譯、位置與樣式匯入 Photoshop。

---

## 使用方法

1. 選擇 BT 的項目 JSON（例如 `imgtrans_*.json`）。

![選擇 BT 的項目 JSON](doc/step1-select-bt-json.png)

2. 確認圖源／輸出等路徑後，依需要調整選項，點擊 **執行**。等待就會生成對應的PSD

![做特定修改後，點擊執行](doc/step2-run.png)

---

## 目前支援的屬性

腳本讀的是 BalloonsTranslator 工程 JSON（需有 `pages` 與 `image_info`）。文字優先用氣泡的 `translation`；若為空則改用原文 `text`。

勾選 **來源文字樣式** 時，會把下列欄位寫進 Photoshop 文字圖層：

| 來源 | 說明 |
|------|------|
| `xyxy` | 氣泡框。用於定位；勾選段落文字時依此框自動換行 |
| `translation` / `text` | 寫入圖層的內容 |
| `label` | 圖層分組名稱；沒有則歸入 `default` |
| `angle` | 旋轉角度 |
| `src_is_vertical` | 直／橫排（`fontformat.vertical` 不存在時的後備） |
| `fontformat.font_family` | 字體（Qt family 會盡量轉成 Photoshop PostScript 名稱） |
| `fontformat.font_size` | 字級；沒有則用 `_detected_font_size` |
| `fontformat.vertical` | 直排 / 橫排 |
| `fontformat.bold` / `italic` | 粗體、斜體 |
| `fontformat.frgb` | 文字顏色 |
| `fontformat.stroke_width` / `srgb` | 描邊寬度與顏色 |
| `image_info.width` / `height` | 將框座標換成相對位置時使用 |

目前**尚未**套用：`alignment`、`font_weight`、`line_spacing`、`letter_spacing`。

---

## 下載腳本

請到本倉庫 [Releases](https://github.com/FoxyBubbles/BT-PS-Script/releases) 下載 `LabelPlus_Ps_Script_BT.jsx`，不必自行編譯。

在 Photoshop 中：**檔案 → 指令碼 → 瀏覽…**，選取該檔即可。若要出現在指令碼選單裡，把檔案放到 Photoshop 的 `Presets/Scripts` 資料夾後重開軟體。

維護者發版請見 [docs/RELEASE.md](docs/RELEASE.md)。
