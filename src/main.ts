//todo: 以下标记可能被typescript过滤掉，需要找个更妥当的办法导入js
//@include "./xtools/xlib/GenericUI.jsx";
//@include "./xtools/xlib/LogWindow.js";
//@include  "my_action.js"
//@include "./jam/jamJSON.jsxinc"

/// <reference path="legacy.d.ts" />
/// <reference path="i18n.ts" />
/// <reference path="version.ts" />
/// <reference path="custom_options.ts" />
/// <reference path="importer.ts" />
/// <reference path="text_parser.ts" />
/// <reference path="common.ts" />

namespace LabelPlus {

interface CustomOptionsPicker { (opts: CustomOptions, toFile?: boolean): CustomOptions | null };
interface PanelDesc {
    x?: number,
    y?: number,
    getOption?: CustomOptionsPicker,
}

class LabelPlusInput extends GenericUI {
    private opts: CustomOptions;
    private lpFile: LpFile | null = null;

    private settingsPnl: any;
    private inputPnl: any;
    private outputPnl: any;
    private stylePnl: any;
    private automationPnl: any;
    private HelpPnl: any;
    private btTextFileTextBox: any;

    constructor() {
        super();
        this.saveIni = false;
        this.hasBorder = false;
        this.settingsPanel = false;
        this.winRect = { x: 200, y: 200, w: 875, h: 800 };
        this.center = true;
        this.notesSize = 0;

        try {
            this.opts = readIni(DEFAULT_INI_PATH); // try to load auto saved ini
            log("read option from " + DEFAULT_INI_PATH + "OK");
        } catch {
            this.opts = new CustomOptions();
            log("read option from " + DEFAULT_INI_PATH + "failed");
        }
        if (!this.opts.language) {
            this.opts.language = "auto";
        }
        this.applyUiLanguage(this.opts.language);
    }

    private getMatchedFileList = () => {
        let pnl = this.inputPnl;
        let selectedList = getSelectedItemsText(pnl.chooseImageListBox);
        let fileList = getImageFilesListOfPath(pnl.sourceTextBox.text);
        let replaceImgSuffix = (pnl.replaceImgSuffixCheckBox.value) ? pnl.replaceImgSuffixTextbox.text : "";
        let matchImgByOrder = pnl.matchImgByOrderCheckBox.value;
        let arr: ImageInfo[] = [];
        for (let i = 0; i < selectedList.length; i++) {
            let filename  = selectedList[i].text;
            let fileindex = selectedList[i].index;
            if (matchImgByOrder) {
                arr.push({
                    file: filename,
                    matched_file: (fileList.length > i) ? fileList[fileindex] : "",
                    index: fileindex
                });
            }
            else if (replaceImgSuffix !== "") {
                arr.push({
                    file: filename,
                    matched_file: filename.substring(0, filename.lastIndexOf(".")) + replaceImgSuffix,
                    index: fileindex
                });
            }
            else {
                arr.push({
                    file: filename,
                    matched_file: filename,
                    index: fileindex
                });
            }
        }
        return arr;
    }

    private applyUiLanguage = (pref: string) => {
        I18n.applyLanguage(pref);
        this.title = I18n.APP_NAME + " For BallonsTranslator " + VERSION;
        this.processTxt = I18n.BUTTON_RUN;
        this.cancelTxt = I18n.BUTTON_CANCEL;
    }

    private switchLanguage = (index: number) => {
        let code = I18n.LANGUAGE_CODES[index];
        if (!code) {
            return;
        }
        if ((this.opts.language || "auto") === code) {
            return;
        }

        let snap = this.geCustomOptions(true);
        if (snap) {
            snap.language = code;
            this.opts = snap;
        } else {
            this.opts.language = code;
        }

        this.applyUiLanguage(code);
        try {
            writeIni(DEFAULT_INI_PATH, this.opts);
        } catch (e) {
            log("write option after language switch failed");
        }

        if (this.win) {
            this.win.close(4);
        }
    }

    private restoreLoadedTextFile = () => {
        if (!this.opts.lpTextFilePath) {
            return;
        }
        let f = new File(this.opts.lpTextFilePath);
        if (!f || !f.exists) {
            return;
        }
        if (this.btTextFileTextBox) {
            this.btTextFileTextBox.text = f.fsName;
        }
        this.loadTextFile(f, this.inputPnl, this.outputPnl, this.automationPnl);
        if (this.opts.source) {
            this.inputPnl.sourceTextBox.text = this.opts.source;
        }
        if (this.opts.overlayManualSource !== undefined) {
            this.inputPnl.overlayManualSourceTextBox.text = this.opts.overlayManualSource;
        }
        if (this.opts.target) {
            this.outputPnl.targetTextBox.text = this.opts.target;
        }
    }

    private optPickers: CustomOptionsPicker[] = [];
    private addToPickerList = (picker?: CustomOptionsPicker) => {
        if (picker)
            this.optPickers[this.optPickers.length] = picker;
    }

    private uiLpTextSelect = (pnl: any): PanelDesc => {
        let xx: number = 10, yy: number = 10;

        // 僅保留 BallonsTranslator (BT) 格式
        pnl.btTextFileLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_BT_FILE);
        xx += 120;
        pnl.btTextFileTextBox = pnl.add('edittext', [xx, yy, xx + 300, yy + 20], '');
        pnl.btTextFileTextBox.enabled = false;
        this.btTextFileTextBox = pnl.btTextFileTextBox;
        xx += 305;
        pnl.btTextFileBrowseButton = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        xx += 30;
        yy += 20;

        pnl.btTextFileBrowseButton.onClick = () => {
            let inputPnl = this.inputPnl;
            let outputPnl = this.outputPnl;
            let automationPnl = this.automationPnl;

            let fmask = "*.json";
            let f = File.openDialog(I18n.LABEL_BT_FILE, fmask);
            if (f && f.exists) {
                pnl.btTextFileTextBox.text = f.fsName;
                this.loadTextFile(f, inputPnl, outputPnl, automationPnl);
            }
        };

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            let btPath = pnl.btTextFileTextBox.text;
            if (!toFile) {
                if (btPath === "") {
                    alert(I18n.ERROR_NOT_FOUND_BTTEXT);
                    return null;
                }
                let f = new File(btPath);
                if (!f || !f.exists) {
                    alert(I18n.ERROR_NOT_FOUND_BTTEXT);
                    return null;
                }
                let lpFile = btTextParser(btPath);
                if (lpFile == null) {
                    alert(I18n.ERROR_PARSER_BTTEXT_FAIL);
                    return null;
                }
            }
            if (btPath !== "") {
                opts.lpTextFilePath = btPath;
            }

            return opts;
        }

        return {x: xx, y:yy, getOption: getOption};
    }

    // 提取文本文件加載的通用邏輯（僅 BT）
    private loadTextFile = (f: File, inputPnl: any, outputPnl: any, automationPnl: any) => {
        let fl = new Folder(f.path);
        inputPnl.sourceTextBox.text = fl.fsName;
        outputPnl.targetTextBox.text = fl.fsName + dirSeparator + 'output';

        // 設置涂白文件夾路徑
        let inpaintedPath = fl.fsName + dirSeparator + 'inpainted';
        if (FolderIsExists(inpaintedPath)) {
            inputPnl.overlayManualSourceTextBox.text = inpaintedPath;
        }

        // detect images source sub dir
        let src_subdirs = ["images", "image", "img", "source", "圖源"];
        for (let subdir of src_subdirs) {
            let dir_path = fl.fsName + dirSeparator + subdir;
            if (FolderIsExists(dir_path)) {
                log("detect images source: " + dir_path);
                inputPnl.sourceTextBox.text = dir_path;
                break;
            }
        }

        let lpFile = btTextParser(f.fsName);
        if (lpFile === null) {
            alert(I18n.ERROR_PARSER_BTTEXT_FAIL);
            return;
        }

        this.lpFile = lpFile;
        this.allPanelEnable(true);

        // fill ui elements
        inputPnl.chooseImageListBox.removeAll();
        inputPnl.chooseGroupListBox.removeAll();
        for (let key in lpFile.images) {
            let item = inputPnl.chooseImageListBox.add('item', key);
            item.selected = true;
        }
        for (let i = 0; i < lpFile.groups.length; i++) {
            let g = lpFile.groups[i];
            inputPnl.chooseGroupListBox[i] = inputPnl.chooseGroupListBox.add('item', g, i);
            inputPnl.chooseGroupListBox[i].selected = true;

            // dialog overlay
            {
                let doPnl = automationPnl.overlayPnl;
                if (doPnl.groupTextBox.text == "") { // first group
                    doPnl.groupTextBox.text = g;
                }
                doPnl.addGroupList[i] = doPnl.addGroupList.add('item', g, i);
            }
        }
    }

    private uiSettingsPanel = (pnl: any): PanelDesc => {
        let win = GenericUI.getWindow(pnl.parent);

        pnl.text = I18n.LABEL_SETTING;

        pnl.fileMask = "INI Files: *.ini, All Files: *.*";
        pnl.loadPrompt = "Read Setting";
        pnl.savePrompt = "Save Setting";
        pnl.defaultFile = DEFAULT_INI_PATH;

        let y = 12;
        pnl.languageLabel = pnl.add('statictext', [10, y, 70, y + 20], I18n.LABEL_LANGUAGE);
        pnl.languageList = pnl.add('dropdownlist', [75, y - 2, 335, y + 22], I18n.LIST_LANGUAGE_ITEMS);
        let langIdx = I18n.LANGUAGE_CODES.indexOf(this.opts.language || "auto");
        pnl.languageList.selection = (langIdx >= 0) ? langIdx : 0;
        pnl.languageList.onChange = () => {
            if (!pnl.languageList.selection) {
                return;
            }
            this.switchLanguage(pnl.languageList.selection.index);
        };

        let w = pnl.bounds[2] - pnl.bounds[0];
        let offsets = [w * 0.2, w * 0.5, w * 0.8];
        y = 42;
        let bw = 90;

        let x = offsets[0] - (bw / 2);
        pnl.load = pnl.add('button', [x, y, x + bw, y + 20], I18n.BUTTON_LOAD);
        x = offsets[1] - (bw / 2);
        pnl.save = pnl.add('button', [x, y, x + bw, y + 20], I18n.BUTTON_SAVE);
        x = offsets[2] - (bw / 2);
        pnl.reset = pnl.add('button', [x, y, x + bw, y + 20], I18n.BUTTON_RESET);

        pnl.load.onClick = () => {
            let def = pnl.defaultFile;
            let prmpt = pnl.loadPrompt;
            let sel = Stdlib.createFileSelect(pnl.fileMask);
            if (isMac()) {
                sel = undefined;
            }
            let f = Stdlib.selectFileOpen(prmpt, sel, def);
            if (f) {
                this.opts = readIni(f);
                if (!this.opts.language) {
                    this.opts.language = "auto";
                }
                this.applyUiLanguage(this.opts.language);
                win.close(4);
            }
        };
        pnl.save.onClick = () => {
            let def = pnl.defaultFile;
            let prmpt = pnl.savePrompt;
            let sel = Stdlib.createFileSelect(pnl.fileMask);

            if (isMac()) {
                sel = undefined;
            }

            let f = Stdlib.selectFileSave(prmpt, sel, def);
            if (f) {
                let mgr = win.mgr;
                let res = mgr.validatePanel(win.appPnl, win.ini, true);

                if (typeof (res) != 'boolean') {
                    writeIni(f, res);
                }
            }
        };
        pnl.reset.onClick = () => {
            this.opts = new CustomOptions();
            this.lpFile = null;
            this.applyUiLanguage(this.opts.language);
            win.close(4);
        };

        let getOption = (opts: CustomOptions, toFile?: boolean): CustomOptions | null => {
            opts.language = this.opts.language || "auto";
            return opts;
        };

        return { getOption: getOption };
    };

    private uiInputPanel = (pnl: any): PanelDesc => {
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_INPUT;

        // image source folder select
        pnl.sourceLabel = pnl.add('statictext', [xx, yy, xx + 80, yy + 20], I18n.LABEL_SOURCE);
        xx += 90;
        pnl.sourceTextBox = pnl.add('edittext', [xx, yy, xx + 205, yy + 20], '');
        xx += 210;
        pnl.sourceBrowse = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        pnl.sourceBrowse.onClick = () => {
            try {
                let def :string = (pnl.sourceTextBox.text ?
                    pnl.sourceTextBox.text : Folder.desktop);
                let f = Stdlib.selectFolder(I18n.LABEL_SOURCE, def);
                if (f) {
                    pnl.sourceTextBox.text = f.fsName;
                }
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 25;

        // overlay manual image source folder select
        pnl.overlayManualSourceLabel = pnl.add('statictext', [xx, yy, xx + 90, yy + 20], I18n.LABEL_OVERLAY_MANUAL_SOURCE);
        xx += 95;
        pnl.overlayManualSourceTextBox = pnl.add('edittext', [xx, yy, xx + 200, yy + 20], '');
        xx += 205;
        pnl.overlayManualSourceBrowse = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        pnl.overlayManualSourceBrowse.onClick = () => {
            try {
                let def :string = (pnl.overlayManualSourceTextBox.text ?
                    pnl.overlayManualSourceTextBox.text : 
                    (pnl.sourceTextBox.text ? pnl.sourceTextBox.text : Folder.desktop));
                let f = Stdlib.selectFolder(I18n.LABEL_OVERLAY_MANUAL_SOURCE, def);
                if (f) {
                    pnl.overlayManualSourceTextBox.text = f.fsName;
                }
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 25;

        // match image file by order
        pnl.matchImgByOrderCheckBox = pnl.add('checkbox', [xx, yy, xx + 190, yy + 20], I18n.CHECKBOX_MATCH_IMG_BY_ORDER);
        pnl.matchImgByOrderCheckBox.onClick = () => {
            if (pnl.matchImgByOrderCheckBox.value) {
                pnl.replaceImgSuffixCheckBox.value = false; // incompatible to "replace image suffix"
                Emit(pnl.replaceImgSuffixCheckBox.onClick);
            }
        }
        xx += 195;
        pnl.checkSourceMatchButton = pnl.add('button', [xx, yy - 2, xx + 80, yy + 20], I18n.BUTTON_SOURCE_CHECK_MATCH);
        pnl.checkSourceMatchButton.onClick = () => { // preview button
            let matchList = this.getMatchedFileList();
            var logwin = new LogWindow(I18n.BUTTON_SOURCE_CHECK_MATCH);
            for (let i = 0; i < matchList.length; i++) {
                if (matchList[i].matched_file == "") {
                    logwin.append(matchList[i].file + " -> " + I18n.ERROR_NO_MATCH_IMG);
                }
                else {
                    let found = FileIsExists(pnl.sourceTextBox.text + dirSeparator + matchList[i].matched_file);
                    logwin.append(matchList[i].file + "(" + matchList[i].matched_file + ")" + " -> " + (found ? "OK" : I18n.ERROR_NO_MATCH_IMG));
                }
            }
            logwin.show();
        }
        xx = xOfs;
        yy += 25;

        // replace image suffix
        pnl.replaceImgSuffixCheckBox = pnl.add('checkbox', [xx, yy, xx + 190, yy + 20], I18n.CHECKBOX_REPLACE_IMG_SUFFIX);
        pnl.replaceImgSuffixCheckBox.onClick = () => {
            if (pnl.replaceImgSuffixCheckBox.value) {
                pnl.matchImgByOrderCheckBox.value = false; // incompatible to "match image file by order"
                Emit(pnl.matchImgByOrderCheckBox.onClick);
            }
            let enable = pnl.replaceImgSuffixCheckBox.value;
            pnl.replaceImgSuffixTextbox.enabled = enable;
            pnl.setSourceFileTypeList.enabled = enable;
        }
        xx += 195;
        pnl.replaceImgSuffixTextbox = pnl.add('edittext', [xx, yy, xx + 80, yy + 20]);
        xx += 85;
        let type_list = [""];
        type_list = type_list.concat(image_suffix_list);
        pnl.setSourceFileTypeList = pnl.add('dropdownlist', [xx, yy - 1, xx + 50, yy + 21], type_list);
        let func = () => {
            pnl.replaceImgSuffixTextbox.text = pnl.setSourceFileTypeList.selection.text;
            pnl.setSourceFileTypeList.onChange = undefined;
            pnl.setSourceFileTypeList.selection = pnl.setSourceFileTypeList.find("");
            pnl.setSourceFileTypeList.onChange = func;
        }
        pnl.setSourceFileTypeList.onChange = func;
        xx = xOfs;
        yy += 23;

        // selct img（listbox 高度需為「塗白文件夾」等多出的列預留空間，避免底部提示被擠壓）
        let listBoxH = 225;
        yOfs = yy;
        pnl.chooseImageLabel = pnl.add('statictext', [xx, yy, xx + 150, yy + 20], I18n.LABEL_SELECT_IMG);
        yy += 23;
        pnl.chooseImageListBox = pnl.add('listbox', [xx, yy, xx + 150, yy + listBoxH], [], { multiselect: true });

        // select label group
        yy = yOfs;
        xx = xOfs + 175;
        pnl.chooseGroupLabel = pnl.add('statictext', [xx, yy, xx + 150, yy + 20], I18n.LABEL_SELECT_GROUP);
        yy += 23;
        pnl.chooseGroupListBox = pnl.add('listbox', [xx, yy, xx + 150, yy + listBoxH], [], { multiselect: true });
        xx = xOfs;
        yy += listBoxH + 5;

        // tip for multiple selection
        pnl.add('statictext', [xx, yy, xx + 330, yy + 40], I18n.LABEL_SELECT_TIP, { multiline: true });

        // 初始化涂白文件夾路徑
        let opts = this.opts;
        if (opts.overlayManualSource !== undefined) {
            pnl.overlayManualSourceTextBox.text = opts.overlayManualSource;
        }

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            if (!toFile) {
                // image source folder
                let f = new Folder(pnl.sourceTextBox.text);
                if (!f || !f.exists) {
                    alert(I18n.ERROR_NOT_FOUND_SOURCE);
                    return null;
                }
                opts.source = f.fsName;

                // overlay manual source folder (可選)
                if (pnl.overlayManualSourceTextBox.text !== "") {
                    let omf = new Folder(pnl.overlayManualSourceTextBox.text);
                    if (!omf || !omf.exists) {
                        alert(I18n.ERROR_NOT_FOUND_OVERLAY_MANUAL_SOURCE);
                        return null;
                    }
                    opts.overlayManualSource = omf.fsName;
                } else {
                    opts.overlayManualSource = ""; // 空字符串表示不使用涂白文件夾
                }

                // images select
                if (!pnl.chooseImageListBox.selection || pnl.chooseImageListBox.selection.length == 0) {
                    alert(I18n.ERROR_NO_IMG_CHOOSED);
                    return null;
                }
                opts.imageSelected = this.getMatchedFileList();

                // label groups
                if (!pnl.chooseGroupListBox.selection || pnl.chooseGroupListBox.selection.length == 0) {
                    alert(I18n.ERROR_NO_LABEL_GROUP_CHOOSED);
                    return null;
                }
                opts.groupSelected = [];
                for (let i = 0; i < pnl.chooseGroupListBox.selection.length; i++) {
                    opts.groupSelected[i] = pnl.chooseGroupListBox.selection[i].text;
                }
            } else {
                opts.source = pnl.sourceTextBox.text;
                opts.overlayManualSource = pnl.overlayManualSourceTextBox.text;
            }
            return opts;
        }

        return {x: xx, y:yy, getOption: getOption };
    }

    private uiOutputPanel = (pnl: any): PanelDesc => {
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_OUTPUT;

        // output folder
        pnl.targetLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_TARGET);
        xx += 120;
        pnl.targetTextBox = pnl.add('edittext', [xx, yy, xx + 300, yy + 20], '');
        xx += 305;
        pnl.targetBrowse = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        pnl.targetBrowse.onClick = () => {
            try {
                let f;
                let def = pnl.targetTextBox.text;
                if (!def) {
                    if (pnl.sourceTextBox.text) {
                        def = pnl.sourceTextBox.text;
                    } else {
                        def = Folder.desktop;
                    }
                }
                f = Stdlib.selectFolder(I18n.LABEL_TARGET, def);

                if (f) {
                    pnl.targetTextBox.text = f.fsName;
                }
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 23;

        // output file type
        pnl.outputTypeLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_OUTPUT_FILE_TYPE);
        let type_arr: string[] = [];
        for (let i = 0; i < OptionOutputType._count; i++) {
            type_arr[i] = OptionOutputType[i];
        }
        xx += 120;
        pnl.outputTypeList = pnl.add('dropdownlist', [xx, yy - 1, xx + 100, yy + 21], type_arr);
        xx = xOfs;
        yy += 23;

        // ignore images with no label
        pnl.ignoreNoLabelImgCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_IGNORE_NO_LABEL_IMG);
        pnl.ignoreNoLabelImgCheckBox.value = true;
        xx += 250;

        // do not close image document after importing complete
        pnl.notCloseCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_NOT_CLOSE);
        xx = xOfs;
        yy += 23;

        // output label index as text layer
        pnl.outputLabelIndexCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_OUTPUT_LABEL_INDEX);
        xx += 250;

        // do not create layer group
        pnl.noLayerGroupCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_NO_LAYER_GROUP);
        xx = xOfs;
        yy += 23;

        // center align
        pnl.centerAlignCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_CENTER_ALIGN);
        xx = xOfs;
        yy += 23;

        // use meo font size（長標籤單獨一行，避免與「居中對齊」並排被截斷）
        pnl.useMeoFontSizeCheckBox = pnl.add('checkbox', [xx, yy, xx + 460, yy + 20], I18n.CHECKBOX_USE_MEO_FONT_SIZE);
        pnl.useMeoFontSizeCheckBox.value = true;
        xx = xOfs;
        yy += 23;

        // BT：使用段落文字（有文字框時依框自動換行）
        pnl.useParagraphTextCheckBox = pnl.add('checkbox', [xx, yy, xx + 460, yy + 20], I18n.CHECKBOX_USE_PARAGRAPH_TEXT);
        pnl.useParagraphTextCheckBox.value = true;
        pnl.useParagraphTextCheckBox.onClick = () => {
            // 段落文字已依文字框定位，禁止「居中對齊」（變灰停用）
            let paragraphOn = pnl.useParagraphTextCheckBox.value;
            pnl.centerAlignCheckBox.enabled = !paragraphOn;
        };
        xx = xOfs;
        yy += 23;


        let opts = this.opts;
        if (opts.outputLabelIndex !== undefined) {
            pnl.outputLabelIndexCheckBox.value = opts.outputLabelIndex;
            Emit(pnl.outputLabelIndexCheckBox.onClick);
        }
        if (opts.ignoreNoLabelImg !== undefined) {
            pnl.ignoreNoLabelImgCheckBox.value = opts.ignoreNoLabelImg;
            Emit(pnl.ignoreNoLabelImgCheckBox.onClick);
        }
        if (opts.outputType !== undefined) {
            pnl.outputTypeList.selection = pnl.outputTypeList.find(OptionOutputType[opts.outputType]);
        }
        if (opts.notClose !== undefined) {
            pnl.notCloseCheckBox.value = opts.notClose;
            Emit(pnl.notCloseCheckBox.onClick);
        }
        if (opts.noLayerGroup !== undefined) {
            pnl.noLayerGroupCheckBox.value = opts.noLayerGroup;
            Emit(pnl.noLayerGroupCheckBox.onClick);
        }
        if (opts.centerAlign !== undefined) {
            pnl.centerAlignCheckBox.value = opts.centerAlign;
            Emit(pnl.centerAlignCheckBox.onClick);
        }
        if (opts.useMeoFontSize !== undefined) {
            pnl.useMeoFontSizeCheckBox.value = opts.useMeoFontSize;
            Emit(pnl.useMeoFontSizeCheckBox.onClick);
        }
        if (opts.useParagraphText !== undefined) {
            pnl.useParagraphTextCheckBox.value = opts.useParagraphText;
        }
        Emit(pnl.useParagraphTextCheckBox.onClick);

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            if (!toFile) {
                // image target folder
                let f = new Folder(pnl.targetTextBox.text);
                if (!f.exists) {
                    if (!f.create()) {
                        alert(I18n.ERROR_CREATE_NEW_FOLDER);
                        return null;
                    }
                }
                opts.target = f.fsName;
            } else {
                opts.target = pnl.targetTextBox.text;
            }
            opts.outputType = <number>pnl.outputTypeList.selection.index;
            opts.outputLabelIndex = pnl.outputLabelIndexCheckBox.value;
            opts.ignoreNoLabelImg = pnl.ignoreNoLabelImgCheckBox.value;
            opts.notClose = pnl.notCloseCheckBox.value;
            opts.noLayerGroup = pnl.noLayerGroupCheckBox.value;
            opts.useParagraphText = pnl.useParagraphTextCheckBox.value;
            // 段落文字啟用時強制不套用居中對齊
            opts.centerAlign = opts.useParagraphText ? false : pnl.centerAlignCheckBox.value;
            opts.useMeoFontSize = pnl.useMeoFontSizeCheckBox.value;
            return opts;
        }

        return {getOption: getOption};
    }

    private uiStylePanel = (pnl: any): PanelDesc => {
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_STYLE;

        // text direction
        pnl.textDirLabel = pnl.add('statictext', [xx, yy, xx + 100, yy + 20], I18n.LABEL_TEXT_DIRECTION);
        xx += 100;
        pnl.textDirList = pnl.add('dropdownlist', [xx, yy, xx + 100, yy + 20], I18n.LIST_TEXT_DIT_ITEMS);
        pnl.textDirList.selection = pnl.textDirList.find(I18n.LIST_TEXT_DIT_ITEMS[0]);
        xx = xOfs;
        yy += 23;

        // set font
        {
            pnl.setFontCheckBox = pnl.add('checkbox', [xx, yy, xx + 50, yy + 20], I18n.CHECKBOX_SET_FONT);
            pnl.setFontCheckBox.onClick = () => {
                let value = pnl.setFontCheckBox.value;
                pnl.font.family.enabled = value;
                pnl.font.style.enabled = value;
                pnl.font.fontSize.enabled = value;
            }
            xx += 60;
            pnl.font = pnl.add('group', [xx, yy + 2, xx + 400, yy + 25]);
            this.createFontPanel(pnl.font);
            pnl.font.label.text = " ";
            pnl.font.family.enabled = false;
            pnl.font.style.enabled = false;
            pnl.font.fontSize.enabled = false;
            pnl.font.family.selection = pnl.font.family.find("SimSun");
            xx = xOfs;
            yy += 25;
        }

        // leading
        pnl.setTextLeadingCheckBox = pnl.add('checkbox', [xx, yy, xx + 100, yy + 20], I18n.CHECKBOX_SET_LEADING);
        pnl.setTextLeadingCheckBox.onClick = () => {
            pnl.textLeadingTextBox.enabled = pnl.setTextLeadingCheckBox.value;
        }
        xx += 105;
        pnl.textLeadingTextBox = pnl.add('edittext', [xx, yy, xx + 50, yy + 20]);
        pnl.textLeadingTextBox.enabled = false;
        pnl.textLeadingTextBox.text = "120";
        xx += 55;
        pnl.add('statictext', [xx, yy, xx + 40, yy + 20], "%");
        xx += 50;

        // vertical roman alignment（與行距同一行）
        pnl.verticalRomanCheckBox = pnl.add('checkbox', [xx, yy, xx + 130, yy + 20], I18n.CHECKBOX_VERTICAL_ROMAN_CHARS);
        pnl.verticalRomanCheckBox.onClick = () => {
            pnl.verticalRomanTextBox.enabled = pnl.verticalRomanCheckBox.value;
        };
        xx += 135;
        pnl.verticalRomanTextBox = pnl.add('edittext', [xx, yy, xx + 80, yy + 20]);
        pnl.verticalRomanTextBox.text = "?!";
        pnl.verticalRomanTextBox.enabled = false;
        xx = xOfs;
        yy += 23;

        // tate-chu-yoko / 直排內橫排：用 | 分隔要匹配的文本片段
        pnl.tateChuYokoCheckBox = pnl.add('checkbox', [xx, yy, xx + 150, yy + 20], I18n.CHECKBOX_TATE_CHU_YOKO);
        pnl.tateChuYokoCheckBox.onClick = () => {
            pnl.tateChuYokoTextBox.enabled = pnl.tateChuYokoCheckBox.value;
        };
        xx += 155;
        pnl.tateChuYokoTextBox = pnl.add('edittext', [xx, yy, xx + 180, yy + 20]);
        pnl.tateChuYokoTextBox.text = "!!|!?|?!|??";
        pnl.tateChuYokoTextBox.enabled = false;
        xx = xOfs;
        yy += 23;

        // tsume / 比例間距：勾選框 + 字符欄 + 百分比下拉
        pnl.tsumeCheckBox = pnl.add('checkbox', [xx, yy, xx + 130, yy + 20], I18n.CHECKBOX_TSUME_CHARS);
        pnl.tsumeCheckBox.onClick = () => {
            pnl.tsumeTextBox.enabled = pnl.tsumeCheckBox.value;
            pnl.tsumePercentList.enabled = pnl.tsumeCheckBox.value;
        };
        xx += 135;
        pnl.tsumeTextBox = pnl.add('edittext', [xx, yy, xx + 160, yy + 20]);
        pnl.tsumeTextBox.text = "「」";
        pnl.tsumeTextBox.enabled = false;
        xx += 165;
        pnl.tsumePercentList = pnl.add('dropdownlist', [xx, yy, xx + 70, yy + 20]);
        // 10% ~ 90%（步進 10%）
        for (let p = 10; p <= 90; p += 10) {
            pnl.tsumePercentList.add('item', p + "%");
        }
        pnl.tsumePercentList.selection = 7; // 預設 80%
        pnl.tsumePercentList.enabled = false;
        xx = xOfs;
        yy += 23;

        let opts = this.opts;
        if (opts.textDirection !== undefined) {
            pnl.textDirList.selection = pnl.textDirList.find(I18n.LIST_TEXT_DIT_ITEMS[opts.textDirection]);
        }
        if (opts.font !== undefined) {
            if (opts.font === "") {
                pnl.setFontCheckBox.value = false;
            } else {
                pnl.setFontCheckBox.value = true;
                try {
                    pnl.font.setFont(opts.font, opts.fontSize);
                }
                catch(e) {
                    alert(I18n.ERROR_OPT_FONT_NOT_FOUND + ' ' + opts.font);
                }
            }
            Emit(pnl.setFontCheckBox.onClick);
        }
        if (opts.textLeading !== undefined) {
            if (opts.textLeading === 0) {
                pnl.setTextLeadingCheckBox.value = false;
            } else {
                pnl.setTextLeadingCheckBox.value = true;
                pnl.textLeadingTextBox.text = opts.textLeading;
            }
            Emit(pnl.setTextLeadingCheckBox.onClick);
        }
        if (opts.verticalRomanChars !== undefined) {
            if (opts.verticalRomanChars === "") {
                pnl.verticalRomanCheckBox.value = false;
            } else {
                pnl.verticalRomanCheckBox.value = true;
                pnl.verticalRomanTextBox.text = opts.verticalRomanChars;
            }
            Emit(pnl.verticalRomanCheckBox.onClick);
        }
        if (opts.tateChuYokoPatterns === undefined) {
            pnl.tateChuYokoCheckBox.value = true;
        } else if (opts.tateChuYokoPatterns === "") {
            pnl.tateChuYokoCheckBox.value = false;
        } else {
            pnl.tateChuYokoCheckBox.value = true;
            pnl.tateChuYokoTextBox.text = opts.tateChuYokoPatterns;
        }
        Emit(pnl.tateChuYokoCheckBox.onClick);
        if (opts.tsumeChars !== undefined) {
            if (opts.tsumeChars === "") {
                pnl.tsumeCheckBox.value = false;
            } else {
                pnl.tsumeCheckBox.value = true;
                pnl.tsumeTextBox.text = opts.tsumeChars;
            }
            Emit(pnl.tsumeCheckBox.onClick);
        }
        if (opts.tsumePercent !== undefined && opts.tsumePercent >= 10 && opts.tsumePercent <= 90) {
            // 將 10/20/.../90 對應到下拉選項 index 0..8
            let idx = Math.round((opts.tsumePercent - 10) / 10);
            if (idx >= 0 && idx <= 8) {
                pnl.tsumePercentList.selection = idx;
            }
        }

        let getOption = (opts: CustomOptions): CustomOptions  | null => {
            if (pnl.setFontCheckBox.value) {
                let font = pnl.font.getFont()
                opts.font = font.font;
                opts.fontSize = font.size;
            } else {
                opts.font = "";
                opts.fontSize = 0;
            }
            opts.textLeading = (pnl.setTextLeadingCheckBox.value) ? pnl.textLeadingTextBox.text : 0;
            opts.textDirection = <OptionTextDirection> I18n.LIST_TEXT_DIT_ITEMS.indexOf(pnl.textDirList.selection.text);
            opts.verticalRomanChars = (pnl.verticalRomanCheckBox.value) ? pnl.verticalRomanTextBox.text : "";
            opts.tateChuYokoPatterns = (pnl.tateChuYokoCheckBox.value) ? pnl.tateChuYokoTextBox.text : "";
            opts.tsumeChars = (pnl.tsumeCheckBox.value) ? pnl.tsumeTextBox.text : "";
            // 下拉文字格式 "50%"，轉成數字 50
            let tsumeText: string = pnl.tsumePercentList.selection ? pnl.tsumePercentList.selection.text : "50%";
            opts.tsumePercent = parseInt(tsumeText, 10) || 50;
            return opts;
        }

        return {getOption: getOption};
    }

    private uiAutomationPanel = (pnl: any): PanelDesc => {
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_AUTOMATION;

        // text replacing(example:"A->B|C->D")
        pnl.textReplaceCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_TEXT_REPLACE);
        pnl.textReplaceCheckBox.onClick = () => {
            pnl.textReplaceTextBox.enabled = pnl.textReplaceCheckBox.value;
        };
        xx += 260;
        pnl.textReplaceTextBox = pnl.add('edittext', [xx, yy, xx + 180, yy + 20]);
        xx = xOfs;
        yy += 23;

        // run action
        pnl.runActionGroupCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20],
            I18n.CHECKBOX_RUN_ACTION);
        pnl.runActionGroupCheckBox.onClick = () => {
            pnl.runActionGroupList.enabled = pnl.runActionGroupCheckBox.value;
        }
        xx += 260;
        let ary = Stdlib.getActionSets();
        pnl.runActionGroupList = pnl.add('dropdownlist', [xx, yy, xx + 180, yy + 20], ary);
        pnl.runActionGroupList.selection = pnl.runActionGroupList.find("LabelPlusAction");
        if (pnl.runActionGroupList.selection == undefined) {
            pnl.runActionGroupList.selection = pnl.runActionGroupList[0];
        }
        pnl.runActionGroupList.enabled = false;

        xx = xOfs;
        yy += 23;

        // dialog overlay（UI 已隱藏，邏輯與選項結構保留）
        pnl.dialogOverlayCheckBox = pnl.add('checkbox', [xx, yy, xx + 300, yy + 20], I18n.CHECKBOX_DIALOG_OVERLAY);
        pnl.dialogOverlayCheckBox.onClick = () => {
            let enable = pnl.dialogOverlayCheckBox.value;
            pnl.overlayPnl.enabled = enable;
        }
        pnl.dialogOverlayCheckBox.visible = false;

        // pnl
        xx =+ 10;
        pnl.overlayPnl = pnl.add('panel', [xx, yy, xx + 460, yy + 75]);
        pnl.overlayPnl.visible = false;

        {
            let xx = xOfs;
            let yy = 5;
            let doPnl = pnl.overlayPnl;

            doPnl.toleranceLabel = doPnl.add('statictext', [xx, yy, xx + 60, yy + 20], I18n.LABEL_DIALOG_OVERLAY_TOLERANCE);
            xx += 65;
            doPnl.toleranceTextBox = doPnl.add('edittext', [xx, yy, xx + 50, yy + 20]);
            doPnl.toleranceTextBox.text = "16";


            xx = xOfs;
            yy += 20;
            pnl.overlayPnl.overlayGroupLabel = doPnl.add('statictext', [xx, yy, xx + 600, yy + 20], I18n.LABEL_DIALOG_OVERLAY_GROUP);
            yy += 20;

            doPnl.groupTextBox = doPnl.add('edittext', [xx, yy, xx + 250, yy + 20]);
            xx += 255;
            let arr = [""];
            doPnl.addGroupList = doPnl.add('dropdownlist', [xx, yy - 1, xx + 100, yy + 21], arr);
            let func = () => {
                doPnl.groupTextBox.text += "," + doPnl.addGroupList.selection.text;
                doPnl.addGroupList.onChange = undefined;
                doPnl.addGroupList.selection = doPnl.addGroupList.find("");
                doPnl.addGroupList.onChange = func;
            }
            doPnl.addGroupList.onChange = func;

        }

        let opts = this.opts;
        if (opts.textReplace !== undefined) {
            pnl.textReplaceCheckBox.value = (opts.textReplace !== "");
            pnl.textReplaceTextBox.text = (opts.textReplace !== "") ? opts.textReplace : "！？->!?|...->…";
            Emit(pnl.textReplaceCheckBox.onClick);
        }
        if (opts.actionGroup !== undefined) {
            pnl.runActionGroupCheckBox.value = (opts.actionGroup !== "");
            let item = pnl.runActionGroupList.find(opts.actionGroup);
            if (item !== undefined)
                pnl.runActionGroupList.selection = item;
            Emit(pnl.runActionGroupCheckBox.onClick);
        }
        // UI 已隱藏：不從 ini 恢復對話框涂白
        pnl.dialogOverlayCheckBox.value = false;
        if (opts.dialogOverlayLabelGroups !== undefined) {
            pnl.overlayPnl.groupTextBox.text = opts.dialogOverlayLabelGroups;
        }
        Emit(pnl.dialogOverlayCheckBox.onClick);
        if (opts.dialogOverlayTolerance !== undefined) {
            pnl.overlayPnl.toleranceTextBox.text = opts.dialogOverlayTolerance.toString();
        }

        let getOption = (opts: CustomOptions): CustomOptions | null => {
            opts.textReplace = (pnl.textReplaceCheckBox.value) ? pnl.textReplaceTextBox.text : "";
            if (pnl.runActionGroupCheckBox.value && pnl.runActionGroupList.selection) {
                opts.actionGroup = pnl.runActionGroupList.selection.text;
            }
            // UI 已隱藏：強制關閉對話框涂白（相關代碼保留）
            opts.dialogOverlayLabelGroups = "";
            if (pnl.overlayPnl.toleranceTextBox.text !== "") {
                opts.dialogOverlayTolerance = pnl.overlayPnl.toleranceTextBox.text;
            }
            return opts;
        }

        return {getOption: getOption};
    }

    private uiHelpPanel(pnl: any): PanelDesc {
        return {};
    }

    private allPanelEnable = (enable: boolean) => {
        this.inputPnl.enabled = enable;
        this.outputPnl.enabled = enable;
        this.stylePnl.enabled = enable;
        this.automationPnl.enabled = enable;
    }

    public mainPannel = (pnl: any) => {
        let xOfs = 10, yOfs = 0;
        let xx = xOfs,  yy = yOfs;
        let ret: PanelDesc;

        this.optPickers = [];

        // BT 文本選擇（僅一行）
        ret = this.uiLpTextSelect(pnl);
        this.addToPickerList(ret.getOption);
        yy += 40;
        yOfs = yy;

        // setting save/load
        this.settingsPnl = pnl.add('panel', [xx, yy, xx + 355, yy + 78]);
        ret = this.uiSettingsPanel(this.settingsPnl);
        this.addToPickerList(ret.getOption);
        yy += 88;

        // input options
        this.inputPnl = pnl.add('panel', [xx, yy, xx + 355, yy + 420]);
        ret = this.uiInputPanel(this.inputPnl);
        this.addToPickerList(ret.getOption);
        xx += 365;

        xOfs = xx;
        xx = xOfs;
        yy = yOfs;

        // output options（Meo/BT 樣式 + 段落文字勾選，需加高）
        this.outputPnl = pnl.add('panel', [xx, yy, xx + 480, yy + 191]);
        ret = this.uiOutputPanel(this.outputPnl);
        this.addToPickerList(ret.getOption);
        yy += 201;

        // style
        this.stylePnl = pnl.add('panel', [xx, yy, xx + 480, yy + 150]);
        ret = this.uiStylePanel(this.stylePnl);
        this.addToPickerList(ret.getOption);
        yy += 160;

        // automation（對話框涂白 UI 已隱藏，面板縮矮）
        this.automationPnl = pnl.add('panel', [xx, yy, xx + 480, yy + 75]);
        ret = this.uiAutomationPanel(this.automationPnl);
        this.addToPickerList(ret.getOption);
        yy += 85;

        // help bar
        xx = this.winRect.w - 220;
        yy = 5;
        this.HelpPnl = pnl.add('panel', [xx, yy, xx + 200, yy + 25]);
        ret = this.uiHelpPanel(this.HelpPnl);

        this.allPanelEnable(this.lpFile != null);
        this.restoreLoadedTextFile();
        return pnl;
    }

    private geCustomOptions = (toFile: boolean): CustomOptions | null => {
        let new_opts = new CustomOptions();
        new_opts.language = this.opts.language || "auto";
        for (let i = 0; i < this.optPickers.length; i++) {
            let ret = this.optPickers[i](new_opts, toFile);
            if (ret == null) {
                return null
            }
            new_opts = ret;
        }
        return new_opts;
    }

}

LabelPlusInput.prototype.createPanel = function (pnl: any, ini: never) {
    this.mainPannel(pnl);
    this.moveWindow(100, 100);
}

// validate user panel, generate CustomOptions
// tofile: if it is saving config to file
LabelPlusInput.prototype.validatePanel = function (pnl: any, ini: any, tofile: boolean) :CustomOptions | boolean {
    let opts = this.geCustomOptions(tofile);
    if (opts == null) {
        return true; // continue, will not close the indow
    }

    // check image source exsits
    for (let i = 0; i < opts.imageSelected.length; i++) {
        let item = opts.imageSelected[i];
        if (!FileIsExists(opts.source + dirSeparator + item.matched_file)) {
            alert(I18n.ERROR_HAVE_NO_MATCH_IMG, 'error', true);
            Emit(this.inputPnl.checkSourceMatchButton.onClick);
            return true; // continue, will not close the indow
        }
    }

    return opts; // go process()
};

LabelPlusInput.prototype.process = function (opts: CustomOptions, doc)
{
    let result = false;

    try {
        writeIni(DEFAULT_INI_PATH, opts); // auto save ini
        result = importFiles(opts);
    } catch (e) {
        log_err('All log:');
        log_err(alllog);
        log_err('Unexpected Error:');
        log_err(Stdlib.exceptionMessage(e));
    }
    if (result && (errlog == "")) {
        alert(I18n.COMPLETE);
        return;
    }
    else if (result && (errlog != "")) {
        alert(I18n.COMPLETE_WITH_ERROR, "error", true);
    }
    else if (!result) {
        alert(I18n.COMPLETE_FAILED, "error", true);
    }

    var logwin = new LogWindow('Error');
    logwin.append(errlog);
    logwin.show();
}

function writeIni (iniFile: string, ini: CustomOptions) {
    if (!ini || !iniFile) {
        return;
    }
    let file = GenericUI.iniFileToFile(iniFile);

    if (!file) {
        throw new Error("Bad ini file specified: \"" + iniFile + "\".");
    }

    if (file.open("w", "TEXT", "????")) {
        file.lineFeed = "unix";
        file.encoding = 'UTF-8';
        let str = jamJSON.stringify(ini, "\n");
        file.write(str);
        file.close();
    }
    return ini;
};

function readIni(iniFile: string): CustomOptions {
    let ini = new CustomOptions();
    let file = GenericUI.iniFileToFile(iniFile);

    if (!file) {
        throw new Error("Bad ini file specified: \"" + iniFile + "\".");
    }
    if (file.exists && file.open("r", "TEXT", "????")) {
        file.lineFeed = "unix";
        file.encoding = 'UTF-8';
        let str = file.read();
        ini = jamJSON.parse(str);
        file.close();
    }

    return ini;
};

// get text/index info from listbox ojbect
function getSelectedItemsText(listBox: any): { text: string, index: number }[]
{
    let item_list = new Array();
    for (let i = 0; i < listBox.children.length; i++) {
        let item = listBox.children[i];
        if (item.selected) {
            item_list.push({ text: item.text, index: item.index });
        }
    }
    return item_list;
}

let ui = new LabelPlusInput();
ui.exec();

} // namespace LabelPlus
