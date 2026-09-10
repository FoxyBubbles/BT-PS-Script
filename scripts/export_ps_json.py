#!/usr/bin/env python3
"""從 BalloonsTranslator 工程匯出精簡 Photoshop JSON，並寫入視覺換行。

不修改、也不經過 ballontranslator/launch.py。
須能 import BalloonsTranslator（指定 --bt-root 或環境變數 BALLONSTRANSLATOR_ROOT）。

用法：
    python scripts/export_ps_json.py --bt-root /path/to/BallonsTranslator /path/to/project
    python scripts/export_ps_json.py /path/to/imgtrans_.json -o /tmp/imgtrans_ps.json
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import os.path as osp
import sys
from typing import List, Mapping, Optional, Sequence, Tuple


def _argv_option_value(flag: str) -> Optional[str]:
    prefix = flag + '='
    argv = sys.argv[1:]
    for index, arg in enumerate(argv):
        if arg == flag and index + 1 < len(argv):
            return argv[index + 1]
        if arg.startswith(prefix):
            return arg[len(prefix):]
    return None


DEFAULT_PS_JSON_NAME = 'imgtrans_ps.json'


def resolve_bt_root() -> str:
    """Locate the BalloonsTranslator app root used for Qt layout imports."""
    explicit = (
        _argv_option_value('--bt-root')
        or os.environ.get('BALLONSTRANSLATOR_ROOT')
        or os.environ.get('BT_ROOT')
    )
    candidates: List[str] = []
    if explicit:
        candidates.append(explicit)
    here = osp.dirname(osp.abspath(__file__))
    # 本檔若放在 BT 的 scripts/ 下，上一層即為 APP_ROOT
    candidates.append(osp.dirname(here))
    for raw in candidates:
        root = osp.abspath(osp.expanduser(raw))
        if osp.isdir(osp.join(root, 'ballontranslator')):
            return root
    raise SystemExit(
        '找不到 BalloonsTranslator。請用 --bt-root 指定根目錄，'
        '或設定環境變數 BALLONSTRANSLATOR_ROOT。'
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            'Headless export of slim Photoshop JSON with visual line breaks. '
            'Does not change the BallonsTranslator project file.'
        )
    )
    parser.add_argument(
        'projects',
        nargs='+',
        help='Project directory or imgtrans JSON path',
    )
    parser.add_argument(
        '--bt-root',
        default='',
        help=(
            'BalloonsTranslator 根目錄（內含 ballontranslator 套件）。'
            '也可設環境變數 BALLONSTRANSLATOR_ROOT。'
        ),
    )
    parser.add_argument(
        '-o',
        '--output',
        default='',
        help=f'Output path. Default: <project>/{DEFAULT_PS_JSON_NAME}',
    )
    parser.add_argument(
        '--ldpi',
        default=None,
        type=float,
        help='Logical DPI used for layout. Usually 96 or 72.',
    )
    return parser


if any(arg in ('-h', '--help') for arg in sys.argv[1:]):
    build_parser().parse_args()


# cv2（載入工程時會引入）可能在 QApplication 建立前初始化 Qt。
# 先建立 offscreen app，避免 QFontDatabase 直接中止。
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')

APP_ROOT = resolve_bt_root()
if APP_ROOT not in sys.path:
    sys.path.insert(0, APP_ROOT)


def _bootstrap_qt():
    from qtpy.QtWidgets import QApplication

    app = QApplication.instance()
    if app is None:
        app = QApplication([sys.argv[0], '-platform', 'offscreen'])
    return app


_QT_APP = _bootstrap_qt()

from PIL import Image

from ballontranslator.utils.fontformat import FontFormat, FontWeight
from ballontranslator.utils.logger import logger as LOGGER
from ballontranslator.utils.proj_imgtrans import ProjImgTrans
from ballontranslator.utils.textblock import TextBlock


_PS_FONTFORMAT_KEYS = (
    'font_family',
    'font_size',
    'vertical',
    'bold',
    'italic',
    'frgb',
    'stroke_width',
    'srgb',
)


def _as_int_box(values: Sequence[object]) -> Optional[List[int]]:
    """Return a 4-int box, or None if the payload is unusable.

    >>> _as_int_box([1.2, 2, 3.8, 4])
    [1, 2, 4, 4]
    """
    if values is None or len(values) < 4:
        return None
    try:
        return [int(round(float(values[index]))) for index in range(4)]
    except (TypeError, ValueError):
        return None


def block_xyxy(blk: TextBlock) -> Optional[List[int]]:
    """Return the Photoshop ``xyxy`` box for one block."""
    box = _as_int_box(getattr(blk, 'xyxy', None))
    if box is not None:
        return box
    rect = _as_int_box(getattr(blk, '_bounding_rect', None))
    if rect is None:
        return None
    x, y, width, height = rect
    return [x, y, x + width, y + height]


def _json_number(value: object) -> float | int:
    number = float(value)
    if number.is_integer():
        return int(number)
    return number


def _fontformat_payload(fmt: FontFormat) -> dict:
    weight = int(fmt.font_weight) if fmt.font_weight is not None else int(
        FontWeight.Normal
    )
    return {
        'font_family': fmt.font_family or '',
        'font_size': _json_number(fmt.font_size),
        'vertical': bool(fmt.vertical),
        'bold': weight >= int(FontWeight.Bold),
        'italic': bool(fmt.italic),
        'frgb': [int(channel) for channel in fmt.foreground_color()],
        'stroke_width': _json_number(fmt.stroke_width),
        'srgb': [int(channel) for channel in fmt.stroke_color()],
    }


def _document_visual_lines(item) -> List[str]:
    """Return visual rows, or vertical columns joined later by the caller.

    Vertical cells are one grapheme each. A new column starts when ``x``
    moves; y-reset cannot see a wrap if each column has only one character.
    """
    from ballontranslator.ui.text_engine.rendering.indexing import _utf16_slice

    document = item.document()
    vertical = bool(getattr(item.fontformat, 'vertical', False))
    lines: List[str] = []
    current_column: List[str] = []
    last_x: Optional[float] = None
    block = document.firstBlock()
    while block.isValid():
        layout = block.layout()
        block_text = block.text()
        line_count = 0 if layout is None else layout.lineCount()
        for index in range(line_count):
            line = layout.lineAt(index)
            if not line.isValid() or line.textLength() <= 0:
                continue
            piece = _utf16_slice(
                block_text, line.textStart(), line.textLength()
            ).replace('\u2028', '').replace('\u2029', '')
            if not vertical:
                stripped = piece.rstrip()
                if stripped:
                    lines.append(stripped)
                continue
            x = float(line.x())
            if last_x is not None and abs(x - last_x) > 1.0 and current_column:
                column = ''.join(current_column).rstrip()
                if column:
                    lines.append(column)
                current_column = []
            current_column.append(piece)
            last_x = x
        block = block.next()
    if current_column:
        column = ''.join(current_column).rstrip()
        if column:
            lines.append(column)
    return lines


def visual_translation(blk: TextBlock) -> str:
    """Return laid-out visual rows or vertical columns joined by ``\\n``."""
    from ballontranslator.ui.text_engine.item import TextBlkItem

    fallback = (blk.translation or '').replace('\r\n', '\n').replace('\r', '\n')
    if not fallback and not blk.rich_text:
        fallback = blk.get_text()
    item = None
    try:
        item = TextBlkItem(blk, 0)
        layout = getattr(item, 'layout', None)
        if layout is not None:
            layout.reLayout()
        lines = _document_visual_lines(item)
        if lines:
            return '\n'.join(lines)
        plain = item.toPlainText().replace('\r\n', '\n').replace('\r', '\n')
        return plain.rstrip('\n')
    except Exception:
        LOGGER.warning(
            'Failed to reconstruct visual line breaks; using stored text.',
            exc_info=True,
        )
        return fallback
    finally:
        if item is not None:
            scene = item.scene()
            if scene is not None:
                scene.removeItem(item)


def balloon_to_ps_dict(blk: TextBlock) -> Optional[dict]:
    """Return the slim Photoshop balloon, or None if the box is unusable."""
    xyxy = block_xyxy(blk)
    if xyxy is None:
        return None
    payload: dict = {
        'xyxy': xyxy,
        'translation': visual_translation(blk),
    }
    label = getattr(blk, 'label', None)
    if label:
        payload['label'] = str(label)
    angle = getattr(blk, 'angle', 0) or 0
    try:
        angle_value = float(angle)
    except (TypeError, ValueError):
        angle_value = 0.0
    if abs(angle_value) > 1e-6:
        payload['angle'] = _json_number(angle_value)
    src_is_vertical = getattr(blk, 'src_is_vertical', None)
    if src_is_vertical is not None:
        payload['src_is_vertical'] = bool(src_is_vertical)
    detected_size = getattr(blk, '_detected_font_size', None)
    try:
        detected_size_value = float(detected_size)
    except (TypeError, ValueError):
        detected_size_value = -1.0
    if detected_size_value > 0:
        payload['_detected_font_size'] = _json_number(detected_size_value)
    payload['fontformat'] = _fontformat_payload(blk.fontformat)
    return payload


def _page_size(
    project: ProjImgTrans,
    pagename: str,
) -> Optional[Tuple[int, int]]:
    info = project._image_info.get(pagename) or {}
    width = info.get('width')
    height = info.get('height')
    try:
        width_value = int(width)
        height_value = int(height)
    except (TypeError, ValueError):
        width_value = height_value = 0
    if width_value > 0 and height_value > 0:
        return width_value, height_value
    image_path = osp.join(project.directory, pagename)
    if not osp.isfile(image_path):
        return None
    try:
        with Image.open(image_path) as image:
            return int(image.size[0]), int(image.size[1])
    except OSError:
        LOGGER.warning('Unable to read image size for page %s.', pagename)
        return None


def project_to_ps_dict(project: ProjImgTrans) -> dict:
    """Return slim ``pages`` + ``image_info`` for Photoshop import."""
    pages: dict = {}
    image_info: dict = {}
    ordered_pages = dict(project.pages)
    ordered_pages.update(project.not_found_pages)
    for pagename, blocks in ordered_pages.items():
        size = _page_size(project, pagename)
        if size is None:
            LOGGER.warning(
                'Skipping page %s; image width/height is unavailable.',
                pagename,
            )
            continue
        balloons = []
        for blk in blocks:
            payload = balloon_to_ps_dict(blk)
            if payload is not None:
                balloons.append(payload)
        pages[pagename] = balloons
        image_info[pagename] = {'width': size[0], 'height': size[1]}
    return {'pages': pages, 'image_info': image_info}


def resolve_project_json(source: str) -> str:
    """Resolve a project directory or JSON path to an imgtrans JSON file."""
    source_path = osp.abspath(osp.expanduser(source))
    if osp.isfile(source_path):
        return source_path
    if not osp.isdir(source_path):
        raise FileNotFoundError(f'project path does not exist: {source}')
    basename = osp.basename(source_path.rstrip(os.sep))
    preferred = (
        osp.join(source_path, f'imgtrans_{basename}.json'),
        osp.join(source_path, 'imgtrans_.json'),
    )
    for path in preferred:
        if osp.isfile(path):
            return path
    matches = []
    for path in glob.glob(osp.join(source_path, 'imgtrans*.json')):
        if osp.basename(path) == DEFAULT_PS_JSON_NAME:
            continue
        if osp.isfile(path):
            matches.append(path)
    matches.sort()
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise FileNotFoundError(
            f'no imgtrans JSON found in {source_path}'
        )
    raise ValueError(
        f'multiple imgtrans JSON files in {source_path}: '
        + ', '.join(osp.basename(path) for path in matches)
    )


def load_project_for_export(source: str) -> ProjImgTrans:
    """Load a project JSON without creating mask/inpaint directories."""
    json_path = resolve_project_json(source)
    with open(json_path, 'r', encoding='utf-8') as handle:
        proj_dict = json.loads(handle.read())
    if not isinstance(proj_dict, Mapping) or 'pages' not in proj_dict:
        raise ValueError(f'not a BallonsTranslator project JSON: {json_path}')
    project = ProjImgTrans()
    project.directory = osp.dirname(json_path)
    project.proj_path = json_path
    project.load_from_dict(proj_dict)
    return project


def default_ps_json_path(json_path: str) -> str:
    return osp.join(osp.dirname(json_path), DEFAULT_PS_JSON_NAME)


def export_project_ps_json(
    source: str,
    output_path: Optional[str] = None,
) -> str:
    """Write slim Photoshop JSON for one project and return the output path."""
    project = load_project_for_export(source)
    destination = output_path or default_ps_json_path(project.proj_path)
    if osp.isdir(destination):
        destination = osp.join(destination, DEFAULT_PS_JSON_NAME)
    destination = osp.abspath(destination)
    if osp.abspath(project.proj_path) == destination:
        raise ValueError(
            'refusing to overwrite the project JSON; choose another output path'
        )
    payload = project_to_ps_dict(project)
    parent = osp.dirname(destination)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(destination, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    return destination


def unique_sources(paths: Sequence[str]) -> List[str]:
    """Collect unique project paths, preserving order.

    >>> unique_sources(['/tmp/a', '/tmp/a', '/tmp/b'])
    ['/tmp/a', '/tmp/b']
    """
    unique: List[str] = []
    seen = set()
    for source in paths:
        if not source:
            continue
        key = osp.abspath(osp.expanduser(source))
        if key in seen:
            continue
        seen.add(key)
        unique.append(source)
    return unique


def export_projects(
    sources: Sequence[str],
    output_path: Optional[str] = None,
) -> int:
    """Export one or more projects. Return a process exit code."""
    sources = unique_sources(sources)
    if not sources:
        LOGGER.error('No project specified.')
        return 2
    if output_path and len(sources) > 1:
        LOGGER.error('-o/--output can only be used with a single project.')
        return 2
    failed = False
    for source in sources:
        try:
            written = export_project_ps_json(
                source,
                output_path=output_path or None,
            )
        except Exception as error:
            LOGGER.error('Failed to export PS JSON from %s: %s', source, error)
            failed = True
            continue
        LOGGER.info('Exported PS JSON to %s', written)
    return 1 if failed else 0


def ensure_offscreen_app(ldpi: Optional[float] = None):
    """Keep the process-wide Qt app and apply optional layout DPI."""
    from qtpy.QtGui import QGuiApplication

    from ballontranslator.utils import shared

    app = _bootstrap_qt()
    screen = QGuiApplication.primaryScreen()
    if screen is not None:
        shared.LDPI = screen.logicalDotsPerInch()
    if ldpi:
        shared.LDPI = ldpi
    return app


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    ensure_offscreen_app(args.ldpi)
    return export_projects(args.projects, output_path=args.output or None)


if __name__ == '__main__':
    sys.exit(main())
