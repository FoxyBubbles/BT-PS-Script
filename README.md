**語言 / Language：** 中文 | [English](README.en.md)

# BT-PS-Script

本專案源自 [LabelPlus/PS-Script](https://github.com/LabelPlus/PS-Script)。

原專案是 LabelPlus 工具包裡的 Photoshop 文本導入腳本：讀入翻譯文本，逐條寫入 PSD。本倉庫在此基礎上改為讀取 [BalloonsTranslator](https://github.com/dmMaze/BallonsTranslator) 工程 JSON，把氣泡裡的翻譯、位置與樣式匯入 Photoshop。

---

## 使用方法

1. 選擇 BT 的項目 JSON（例如 `imgtrans_*.json`，或下方匯出的 `imgtrans_ps.json`）。

![選擇 BT 的項目 JSON](doc/step1-select-bt-json.png)

2. 確認圖源／輸出等路徑後，依需要調整選項，點擊 **執行**。等待就會生成對應的PSD

![做特定修改後，點擊執行](doc/step2-run.png)

---

## 從 BalloonsTranslator 匯出精簡 JSON

**若匯入時不使用段落文字、改用點文字：BT 裡若沒有手動換行（`\n`），點文字不會自動折行。** BT 畫面裡依文字框看起來的換行只是排版結果，不會寫進原工程 JSON。這時必須先跑 `scripts/export_ps_json.py`，把視覺換行寫進 `translation` 的 `\n`，再拿產出的 `imgtrans_ps.json` 匯入。

此腳本同時會去掉本腳本用不到的欄位，且不改原工程檔。

**使用場景**

- 使用點文字匯入，且 BT 內沒有手動 `\n`（只靠畫面自動折行）——**這時一定要用此腳本**，否則 PSD 裡會變成一整段不換行。
- 只想帶走譯文、框、字體等本腳本會讀的欄位，不要完整工程 JSON。
- 批次處理多個工程，產出可直接匯入的 `imgtrans_ps.json`。

**用法**

此腳本要呼叫 BalloonsTranslator 的 Qt 文字引擎來還原折行，因此必須能 import `ballontranslator`（請用 BT 的 Python 環境執行）。指定 BT 根目錄（內含 `ballontranslator` 套件）：

```bash
python scripts/export_ps_json.py --bt-root /path/to/BallonsTranslator /path/to/project
```

也可改設環境變數 `BALLONSTRANSLATOR_ROOT`。若把此檔放回 BT 自己的 `scripts/` 下執行，可省略 `--bt-root`。

參數：

- 位置參數：工程資料夾，或 `imgtrans_*.json` 路徑；可一次傳多個工程。
- `-o` / `--output`：輸出路徑。預設寫到該工程目錄的 `imgtrans_ps.json`，不會覆寫原工程 JSON。多個工程時不可共用同一個 `-o`。
- `--ldpi`：排版用的邏輯 DPI，通常是 `96` 或 `72`。折行與 BT 畫面不一致時可試這個。

範例：

```bash
# 匯出到工程目錄的 imgtrans_ps.json
python scripts/export_ps_json.py --bt-root /path/to/BallonsTranslator /path/to/project

# 指定輸出檔
python scripts/export_ps_json.py --bt-root /path/to/BallonsTranslator /path/to/imgtrans_.json -o /tmp/imgtrans_ps.json
```

匯入 `imgtrans_ps.json` 時請取消勾選「段落文字」，讓點文字直接使用腳本寫入的 `\n`。若仍勾選段落文字，會依 `xyxy` 再折一次，可能變成雙重換行。

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
