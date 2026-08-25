namespace I18n {
    export var APP_NAME: string = "LabelPlus PS-Script";

    export var BUTTON_RUN: string;
    export var BUTTON_CANCEL: string;
    export var BUTTON_LOAD: string;
    export var BUTTON_SAVE: string;
    export var BUTTON_RESET: string;

    export var PANEL_INPUT: string;
    export var PANEL_OUTPUT: string;
    export var PANEL_STYLE: string;
    export var PANEL_AUTOMATION: string;

    export var LABEL_TEXT_FILE: string;
    export var LABEL_MEO_FILE: string;
    export var LABEL_BT_FILE: string;
    export var LABEL_SOURCE: string;
    export var LABEL_OVERLAY_MANUAL_SOURCE: string;
    export var LABEL_TARGET: string;
    export var LABEL_SETTING: string;
    export var LABEL_SELECT_IMG: string;
    export var LABEL_SELECT_GROUP: string;
    export var LABEL_SELECT_TIP: string;
    export var LABEL_LANGUAGE: string;

    export var CHECKBOX_OUTPUT_LABEL_INDEX: string;
    export var CHECKBOX_TEXT_REPLACE: string;
    export var CHECKBOX_IGNORE_NO_LABEL_IMG: string;
    export var CHECKBOX_MATCH_IMG_BY_ORDER: string;
    export var BUTTON_SOURCE_CHECK_MATCH: string;
    export var LABEL_OUTPUT_FILE_TYPE: string;
    export var CHECKBOX_REPLACE_IMG_SUFFIX: string;
    export var CHECKBOX_RUN_ACTION: string;
    export var CHECKBOX_NOT_CLOSE: string;
    export var CHECKBOX_SET_FONT: string;
    export var CHECKBOX_SET_LEADING: string;
    export var CHECKBOX_VERTICAL_ROMAN_CHARS: string;
    export var CHECKBOX_TATE_CHU_YOKO: string;
    export var CHECKBOX_TSUME_CHARS: string;
    export var LABEL_TEXT_DIRECTION: string;
    export var LIST_TEXT_DIT_ITEMS: string[];
    export var LIST_LANGUAGE_ITEMS: string[];
    export var CHECKBOX_NO_LAYER_GROUP: string;
    export var CHECKBOX_CENTER_ALIGN: string;
    export var CHECKBOX_USE_MEO_FONT_SIZE: string;
    export var CHECKBOX_USE_PARAGRAPH_TEXT: string;

    export var CHECKBOX_DIALOG_OVERLAY: string;
    export var LABEL_DIALOG_OVERLAY_GROUP: string;
    export var LABEL_DIALOG_OVERLAY_TOLERANCE: string;

    export var COMPLETE: string;
    export var COMPLETE_WITH_ERROR: string;
    export var COMPLETE_FAILED: string;

    export var ERROR_UNEXPECTED: string;
    export var ERROR_FILE_OPEN_FAIL: string;
    export var ERROR_FILE_SAVE_FAIL: string;
    export var ERROR_NOT_FOUND_SOURCE: string;
    export var ERROR_NOT_FOUND_OVERLAY_MANUAL_SOURCE: string;
    export var ERROR_NOT_FOUND_TARGET: string;
    export var ERROR_NOT_FOUND_LPTEXT: string;
    export var ERROR_NOT_FOUND_MEOTEXT: string;
    export var ERROR_NOT_FOUND_BTTEXT: string;
    export var ERROR_CREATE_NEW_FOLDER: string;
    export var ERROR_PARSER_LPTEXT_FAIL: string;
    export var ERROR_PARSER_MEOTEXT_FAIL: string;
    export var ERROR_PARSER_BTTEXT_FAIL: string;
    export var ERROR_NO_IMG_CHOOSED: string;
    export var ERROR_NO_LABEL_GROUP_CHOOSED: string;
    export var ERROR_NO_MATCH_IMG: string;
    export var ERROR_HAVE_NO_MATCH_IMG: string;
    export var ERROR_TEXT_REPLACE_EXPRESSION: string;
    export var ERROR_OPT_FONT_NOT_FOUND: string;

    /** "auto" | "zh" | "en"；與 LIST_LANGUAGE_ITEMS 順序一致 */
    export var LANGUAGE_CODES: string[] = ["auto", "zh", "en"];

    declare var app: any;

    export function systemIsChinese(): boolean {
        return !!(app && app.locale && (app.locale in { "zh_CN": 1, "zh_TW": 1, "zh_HK": 1 }));
    }

    export function resolveLanguage(pref: string): "zh" | "en" {
        if (pref === "zh") return "zh";
        if (pref === "en") return "en";
        return systemIsChinese() ? "zh" : "en";
    }

    function applyZh(): void {
        BUTTON_RUN = "執行";
        BUTTON_CANCEL = "取消";
        BUTTON_LOAD = "載入";
        BUTTON_SAVE = "儲存";
        BUTTON_RESET = "重置";
        PANEL_INPUT = "輸入";
        PANEL_OUTPUT = "輸出";
        PANEL_STYLE = "樣式";
        PANEL_AUTOMATION = "自動化";
        LABEL_TEXT_FILE = "LabelPlus文本:";
        LABEL_MEO_FILE = "Meo格式文本:";
        LABEL_BT_FILE = "BT格式文本:";
        LABEL_SOURCE = "圖源:";
        LABEL_OVERLAY_MANUAL_SOURCE = "涂白文件夾:";
        LABEL_TARGET = "輸出路徑:";
        LABEL_SETTING = "設定";
        LABEL_SELECT_IMG = "選擇圖片";
        LABEL_SELECT_GROUP = "選擇分組";
        LABEL_SELECT_TIP = "提示: 按住[Ctrl]鍵來選擇/取消單項，按住[Shift]鍵來選擇多項。";
        LABEL_LANGUAGE = "語言";
        CHECKBOX_OUTPUT_LABEL_INDEX = "輸出標籤序號";
        CHECKBOX_TEXT_REPLACE = "文本替換(例如: \"A->B|C->D\")";
        CHECKBOX_IGNORE_NO_LABEL_IMG = "忽略沒有標籤的圖片";
        CHECKBOX_MATCH_IMG_BY_ORDER = "按順序匹配圖源";
        BUTTON_SOURCE_CHECK_MATCH = "檢查匹配結果";
        LABEL_OUTPUT_FILE_TYPE = "輸出文件類型:";
        CHECKBOX_REPLACE_IMG_SUFFIX = "替換圖片後綴名";
        CHECKBOX_RUN_ACTION = "執行動作:";
        CHECKBOX_NOT_CLOSE = "不關閉文件";
        CHECKBOX_SET_FONT = "字體";
        CHECKBOX_SET_LEADING = "行距";
        CHECKBOX_VERTICAL_ROMAN_CHARS = "直立字符(直排時)";
        CHECKBOX_TATE_CHU_YOKO = "自動匹配直排內橫排";
        CHECKBOX_TSUME_CHARS = "比例間距字符";
        LABEL_TEXT_DIRECTION = "文本方向:";
        LIST_TEXT_DIT_ITEMS = ["默認", "水平", "垂直"];
        LIST_LANGUAGE_ITEMS = ["跟隨系統", "中文", "English"];
        CHECKBOX_NO_LAYER_GROUP = "不使用圖層分組";
        CHECKBOX_CENTER_ALIGN = "居中對齊";
        CHECKBOX_USE_MEO_FONT_SIZE = "來源文字樣式（Meo/BT：字體、大小、方向、顏色、描邊）";
        CHECKBOX_USE_PARAGRAPH_TEXT = "BT：使用段落文字（依文字框自動換行）";
        CHECKBOX_DIALOG_OVERLAY = "執行\"對話框涂白\"";
        LABEL_DIALOG_OVERLAY_GROUP = "指定分組(如: group1,group2)：";
        LABEL_DIALOG_OVERLAY_TOLERANCE = "容差:";
        COMPLETE = "導出完成!";
        COMPLETE_WITH_ERROR = "導出完成，但出現一些錯誤...";
        COMPLETE_FAILED = "導出失敗...";
        ERROR_UNEXPECTED = "意外錯誤，請聯繫維護人員...";
        ERROR_FILE_OPEN_FAIL = "打開文件失敗，請確認Photoshop是否能打開該文件。";
        ERROR_FILE_SAVE_FAIL = "文件保存失敗，請檢查是否有磁盤操作權限並確認磁盤空間是否充足。";
        ERROR_NOT_FOUND_SOURCE = "未找到圖源路徑！";
        ERROR_NOT_FOUND_OVERLAY_MANUAL_SOURCE = "未找到涂白文件夾路徑！";
        ERROR_NOT_FOUND_TARGET = "未找到輸出PSD路徑！";
        ERROR_NOT_FOUND_LPTEXT = "未找到LabelPlus文本文件";
        ERROR_NOT_FOUND_MEOTEXT = "未找到Meo格式文本文件";
        ERROR_NOT_FOUND_BTTEXT = "未找到BT格式文本文件";
        ERROR_CREATE_NEW_FOLDER = "無法創建新資料夾";
        ERROR_PARSER_LPTEXT_FAIL = "解析LabelPlus文本失敗";
        ERROR_PARSER_MEOTEXT_FAIL = "解析Meo格式文本失敗";
        ERROR_PARSER_BTTEXT_FAIL = "解析BT格式文本失敗";
        ERROR_NO_IMG_CHOOSED = "請選擇至少一張圖片";
        ERROR_NO_LABEL_GROUP_CHOOSED = "請選擇至少一個分組";
        ERROR_NO_MATCH_IMG = "沒有匹配的圖片文件！！！！";
        ERROR_HAVE_NO_MATCH_IMG = "有些圖片文件沒有匹配，請重新檢查.";
        ERROR_TEXT_REPLACE_EXPRESSION = "文本替換表達式有誤，請重新檢查.";
        ERROR_OPT_FONT_NOT_FOUND = "找不到字體";
    }

    function applyEn(): void {
        BUTTON_RUN = "Run";
        BUTTON_CANCEL = "Cancel";
        BUTTON_LOAD = "Load";
        BUTTON_SAVE = "Save";
        BUTTON_RESET = "Reset";
        PANEL_INPUT = "Input";
        PANEL_OUTPUT = "Output";
        PANEL_STYLE = "Style";
        PANEL_AUTOMATION = "Automation";
        LABEL_TEXT_FILE = "Text file";
        LABEL_MEO_FILE = "Meo format file";
        LABEL_BT_FILE = "BT format file";
        LABEL_SOURCE = "Image Source:";
        LABEL_OVERLAY_MANUAL_SOURCE = "Overlay Manual Source:";
        LABEL_TARGET = "Output Folder:";
        LABEL_SETTING = "Setting";
        LABEL_SELECT_IMG = "Select Image";
        LABEL_SELECT_GROUP = "Select Group";
        LABEL_SELECT_TIP = "Tip: Push [Ctrl] key to select/cancel one item, push [Shift] key to select multiple items.";
        LABEL_LANGUAGE = "Language";
        CHECKBOX_OUTPUT_LABEL_INDEX = "Output label index";
        CHECKBOX_TEXT_REPLACE = "Text Replace(e.g. \"A->B|C->D\")";
        CHECKBOX_IGNORE_NO_LABEL_IMG = "Ignore Images With No Label";
        CHECKBOX_MATCH_IMG_BY_ORDER = "Match Image Source By Order";
        BUTTON_SOURCE_CHECK_MATCH = "Check Match Result";
        LABEL_OUTPUT_FILE_TYPE = "Output File Type:";
        CHECKBOX_REPLACE_IMG_SUFFIX = "Replace Image Suffix";
        CHECKBOX_RUN_ACTION = "Execute Action:";
        CHECKBOX_NOT_CLOSE = "Don't close image";
        CHECKBOX_SET_FONT = "Font";
        CHECKBOX_SET_LEADING = "Leading";
        CHECKBOX_VERTICAL_ROMAN_CHARS = "Upright chars (vertical)";
        CHECKBOX_TATE_CHU_YOKO = "Auto Tate-Chu-Yoko";
        CHECKBOX_TSUME_CHARS = "Tsume chars";
        LABEL_TEXT_DIRECTION = "Text Direction:";
        LIST_TEXT_DIT_ITEMS = ["Default", "Horizontal", "Vertical"];
        LIST_LANGUAGE_ITEMS = ["Follow system", "中文", "English"];
        CHECKBOX_NO_LAYER_GROUP = "Don't create layer group";
        CHECKBOX_CENTER_ALIGN = "Center align after action";
        CHECKBOX_USE_MEO_FONT_SIZE = "Source text style (Meo/BT: font, size, orientation, color, stroke)";
        CHECKBOX_USE_PARAGRAPH_TEXT = "BT: paragraph text (auto-wrap by text box)";
        CHECKBOX_DIALOG_OVERLAY = "Execute \"Dialog Overlay\"";
        LABEL_DIALOG_OVERLAY_GROUP = "Specified Groups(like: group1,group2)：";
        LABEL_DIALOG_OVERLAY_TOLERANCE = "Tolerance:";
        COMPLETE = "Export completed!";
        COMPLETE_WITH_ERROR = "Export Completed, but some error occured...";
        COMPLETE_FAILED = "Exported failed...";
        ERROR_UNEXPECTED = "Unexpected error, please contact with maintenance...";
        ERROR_FILE_OPEN_FAIL = "open file failed, please confirm whether Photoshop can open the file.";
        ERROR_FILE_SAVE_FAIL = "File saving failed, please check whether you have disk operation permission and whether the disk space is sufficient.";
        ERROR_NOT_FOUND_SOURCE = "Image Source Folder Not Found!";
        ERROR_NOT_FOUND_OVERLAY_MANUAL_SOURCE = "Overlay Manual Source Folder Not Found!";
        ERROR_NOT_FOUND_TARGET = "Output PSD Folder Not Found!";
        ERROR_NOT_FOUND_LPTEXT = "LabelPlus Text File Not Found!";
        ERROR_NOT_FOUND_MEOTEXT = "Meo Format Text File Not Found!";
        ERROR_NOT_FOUND_BTTEXT = "BT Format Text File Not Found!";
        ERROR_CREATE_NEW_FOLDER = "Could not build new folder";
        ERROR_PARSER_LPTEXT_FAIL = "Fail To Load LabelPlus Text File";
        ERROR_PARSER_MEOTEXT_FAIL = "Fail To Load Meo Format Text File";
        ERROR_PARSER_BTTEXT_FAIL = "Fail To Load BT Format Text File";
        ERROR_NO_IMG_CHOOSED = "Please select more than one image";
        ERROR_NO_LABEL_GROUP_CHOOSED = "Please select more than one group";
        ERROR_NO_MATCH_IMG = "No matched image file!!!!";
        ERROR_HAVE_NO_MATCH_IMG = "Some image files did not match, please check again.";
        ERROR_TEXT_REPLACE_EXPRESSION = "Expression of text replacing is wrong, please check again.";
        ERROR_OPT_FONT_NOT_FOUND = "Cannot found the font";
    }

    export function applyLanguage(pref: string): void {
        if (resolveLanguage(pref) === "en") {
            applyEn();
        } else {
            applyZh();
        }
    }

    applyLanguage("auto");
}
