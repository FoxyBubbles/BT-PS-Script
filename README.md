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

完整工程 JSON 很大，含大量本腳本不會讀的欄位；氣泡在 BT 裡的自動折行通常也沒有寫成 `\n`。可用倉庫裡的 `scripts/export_ps_json.py`，在不改原工程檔的前提下，另外匯出一份只含本腳本用得上的 JSON，並把畫面上的視覺換行寫進 `translation`。

**使用場景**

- 只想把譯文、框、字體等匯入 Photoshop 的欄位帶走，不想帶 OCR 原文、遮罩、未使用的樣式等。
- 需要把 BT 畫面裡看起來的換行變成 `translation` 裡的 `\n`，方便 Photoshop 用點文字還原，而不靠段落文字再折一次。
- 批次處理多個工程，產出可直接丟給本腳本的 `imgtrans_ps.json`。

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

匯入這份 JSON 時，建議取消勾選「段落文字」，改用點文字，避免已寫入的 `\n` 再依文字框折一次。

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
