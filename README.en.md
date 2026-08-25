**Language / 語言：** [中文](README.md) | English

# BT-PS-Script

This project is based on [LabelPlus/PS-Script](https://github.com/LabelPlus/PS-Script).

The original project is the Photoshop text-import script in the LabelPlus toolkit: it reads translation text and writes it into PSD layers. This repository adapts that workflow to [BalloonsTranslator](https://github.com/dmMaze/BallonsTranslator) project JSON, so balloon translations, positions, and styles can be imported into Photoshop.

---

## How to use

1. Select the BalloonsTranslator project JSON (for example `imgtrans_*.json`).

![Select the BT project JSON](doc/step1-select-bt-json.png)

2. Confirm the image source / output paths, adjust options if needed, then click **Run**. The script will generate the corresponding PSD files.

![After making changes, click Run](doc/step2-run.png)

---

## Supported fields

The script reads BalloonsTranslator project JSON (it must include `pages` and `image_info`). Text prefers each balloon’s `translation`; if that is empty, it falls back to source `text`.

When **Source text style** is checked, the following fields are written into Photoshop text layers:

| Field | Description |
|------|------|
| `xyxy` | Balloon box. Used for placement; with paragraph text, text wraps inside this box |
| `translation` / `text` | Layer contents |
| `label` | Layer group name; falls back to `default` if missing |
| `angle` | Rotation |
| `src_is_vertical` | Vertical / horizontal (fallback when `fontformat.vertical` is absent) |
| `fontformat.font_family` | Font (Qt family names are mapped to Photoshop PostScript names when possible) |
| `fontformat.font_size` | Size; falls back to `_detected_font_size` |
| `fontformat.vertical` | Vertical / horizontal |
| `fontformat.bold` / `italic` | Bold, italic |
| `fontformat.frgb` | Text color |
| `fontformat.stroke_width` / `srgb` | Stroke width and color |
| `image_info.width` / `height` | Used to convert box coordinates to relative positions |

Not applied yet: `alignment`, `font_weight`, `line_spacing`, `letter_spacing`.

---

## Download the script

Download `LabelPlus_Ps_Script_BT.jsx` from this repo’s [Releases](https://github.com/FoxyBubbles/BT-PS-Script/releases). You do not need to compile it yourself.

In Photoshop: **File → Scripts → Browse…**, then select the file. To show it in the Scripts menu, copy it into Photoshop’s `Presets/Scripts` folder and restart Photoshop.

Maintainers: see [docs/RELEASE.md](docs/RELEASE.md) for the release process.
