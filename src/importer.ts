/// <reference path="legacy.d.ts" />
/// <reference path="custom_options.ts" />
/// <reference path="common.ts" />
/// <reference path="text_parser.ts" />
/// <reference path="dialog_clear.ts" />

namespace LabelPlus {

// global var
let opts: CustomOptions | null = null;
let textReplace: TextReplaceInfo = [];

interface Group {
    layerSet?: LayerSet;
};
type GroupDict = { [key: string]: Group };

interface LabelInfo {
    index: number;
    x: number;
    y: number;
    group: string;
    contents: string;
    fontSize?: number;
    orientation?: string;
    font?: string;
    fontStyle?: string;
    color?: string;
    strokeColor?: string;
    strokeWeight?: number;
    rotation?: number;
    boxX?: number;
    boxY?: number;
    boxW?: number;
    boxH?: number;
};

interface ImageWorkspace {
    doc: Document;

    bgLayer: ArtLayer;
    textTemplateLayer: ArtLayer;
    dialogOverlayLayer: ArtLayer;
    overlayManualLayer: ArtLayer;

    pendingDelLayerList: ArtLayer[];
    groups: GroupDict;
};

interface ImageInfo {
    ws: ImageWorkspace;
    name: string;
    name_pair: string;
    labels: LpLabel[];
};

function importLabel(img: ImageInfo, label: LabelInfo): boolean
{
    assert(opts !== null);

    // import the index of the Label
    if (opts.outputLabelIndex) {
        let o: TextInputOptions = {
            template: img.ws.textTemplateLayer,
            direction: Direction.HORIZONTAL,
            font: "Arial",
            size: (opts.fontSize !== 0) ? UnitValue(opts.fontSize, "pt") : undefined,
            lgroup: img.ws.groups["_Label"].layerSet,
        };
        newTextLayer(img.ws.doc, String(label.index), label.x, label.y, o);
    }

    // 替换文本
    if (opts.textReplace) {
        for (let k = 0; k < textReplace.length; k++) {
            while (label.contents.indexOf(textReplace[k].from) != -1)
                label.contents = label.contents.replace(textReplace[k].from, textReplace[k].to);
        }
    }

    // 确定文字方向
    let textDir: Direction | undefined;
    
    // 如果標籤提供了方向，且用戶啟用了該選項，則優先使用
    if (opts.useMeoFontSize && label.orientation) {
        if (label.orientation === "horizontal") {
            textDir = Direction.HORIZONTAL;
        } else if (label.orientation === "vertical") {
            textDir = Direction.VERTICAL;
        } else {
            // 如果方向值無效，使用全域設定
            switch (opts.textDirection) {
            case OptionTextDirection.Keep:       textDir = undefined; break;
            case OptionTextDirection.Horizontal: textDir = Direction.HORIZONTAL; break;
            case OptionTextDirection.Vertical:   textDir = Direction.VERTICAL; break;
            }
        }
    } else {
        // 使用全域設定
        switch (opts.textDirection) {
        case OptionTextDirection.Keep:       textDir = undefined; break;
        case OptionTextDirection.Horizontal: textDir = Direction.HORIZONTAL; break;
        case OptionTextDirection.Vertical:   textDir = Direction.VERTICAL; break;
        }
    }

    // 导出文本
    let textLayer: ArtLayer;
    let o: TextInputOptions = {
        font: (opts.font != "") ? opts.font : undefined,
        direction: textDir,
        lgroup: img.ws.groups[label.group].layerSet,
        lending: opts.textLeading ? opts.textLeading : undefined,
    };

    // 如果標籤提供了字體大小，且用戶啟用了該選項，則優先使用
    if (opts.useMeoFontSize && label.fontSize && label.fontSize > 0) {
        o.size = UnitValue(label.fontSize, "pt");
    } else {
        let proper_size = UnitValue(min(img.ws.doc.height.as("pt"), img.ws.doc.height.as("pt")) / 90.0, "pt");
        o.size = (opts.fontSize !== 0) ? UnitValue(opts.fontSize, "pt") : proper_size;
    }

    // 啟用來源文字樣式時，套用標籤級的字體 / 風格 / 顏色 / 描邊
    if (opts.useMeoFontSize) {
        if (label.font) {
            // BT 可能是 Qt family；Meo 可能已是 PostScript —— 統一解析
            let resolved = resolveToPostScriptFont(label.font, label.fontStyle);
            if (resolved) {
                o.font = resolved;
            }
            // 解析失敗時保留全域 opts.font（若有），不硬塞無效 family
        }
        if (label.fontStyle) {
            o.fontStyle = label.fontStyle;
        }
        if (label.color) {
            o.color = label.color;
        }
        if (label.strokeColor && label.strokeWeight && label.strokeWeight > 0) {
            o.strokeColor = label.strokeColor;
            o.strokeWeight = label.strokeWeight;
        }
        if (typeof label.rotation === "number" && !isNaN(label.rotation)) {
            o.rotation = label.rotation;
        }
    }

    // 直排「標準垂直羅馬對齊方式」：對指定字符（預設 ?!）套用直立顯示
    // 僅在最終文字方向為直排時才有意義
    if (textDir === Direction.VERTICAL && opts.verticalRomanChars) {
        o.isVertical = true;
        o.verticalRomanChars = opts.verticalRomanChars;
    }
    if (textDir === Direction.VERTICAL && opts.tateChuYokoPatterns) {
        o.isVertical = true;
        o.tateChuYokoPatterns = opts.tateChuYokoPatterns;
    }

    // 比例間距 (Tsume / mojiZume)：對指定字符套用百分比擠壓
    // 直排/橫排都生效；百分比 10~90 對應 mojiZume 0.10~0.90
    if (opts.tsumeChars && typeof opts.tsumePercent === "number" && opts.tsumePercent > 0) {
        o.tsumeChars = opts.tsumeChars;
        o.tsumePercent = opts.tsumePercent;
    }

    // BT：勾選段落文字且標籤有文字框時，建立 Area Text
    let usedParagraphBox = false;
    if (opts.useParagraphText &&
        typeof label.boxX === "number" && typeof label.boxY === "number" &&
        typeof label.boxW === "number" && typeof label.boxH === "number" &&
        label.boxW > 0 && label.boxH > 0) {
        o.paragraphBox = {
            x: label.boxX,
            y: label.boxY,
            w: label.boxW,
            h: label.boxH
        };
        usedParagraphBox = true;
    }

    textLayer = newTextLayer(img.ws.doc, label.contents, label.x, label.y, o);

    // 执行动作,名称为分组名
    if (opts.actionGroup) {
        img.ws.doc.activeLayer = textLayer;
        let result = doAction(label.group, opts.actionGroup);
        log("run action " + label.group + "[" + opts.actionGroup + "]..." + result ? "done" : "fail");
    }

    // Center the layer after the action has been applied, so the bounds are correct
    // 段落文字已依文字框定位，不再做居中平移（避免框被挪走）
    if (opts.centerAlign && !usedParagraphBox) {
        var ru = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        try {
            var bounds = textLayer.bounds;
            var layerWidth = bounds[2].as('px') - bounds[0].as('px');
            var layerHeight = bounds[3].as('px') - bounds[1].as('px');
            
            // Calculate the target center position in absolute coordinates
            var targetCenterX = img.ws.doc.width.as("px") * label.x;
            var targetCenterY = img.ws.doc.height.as("px") * label.y;
            
            // Calculate current center position
            var currentCenterX = bounds[0].as('px') + layerWidth / 2;
            var currentCenterY = bounds[1].as('px') + layerHeight / 2;
            
            // Calculate the offset needed to move current center to target center
            var deltaX = targetCenterX - currentCenterX;
            var deltaY = targetCenterY - currentCenterY;
            
            textLayer.translate(UnitValue(deltaX, 'px'), UnitValue(deltaY, 'px'));
        }
        finally {
            app.preferences.rulerUnits = ru;
        }
    }
    
    return true;
}

function convertPixelLabelCoords(img: ImageInfo): void
{
    let needConvert = false;
    for (let i = 0; i < img.labels.length; i++) {
        if (img.labels[i].pixelCoords) {
            needConvert = true;
            break;
        }
    }
    if (!needConvert) {
        return;
    }

    let docW = img.ws.doc.width.as("px");
    let docH = img.ws.doc.height.as("px");
    if (!docW || !docH) {
        log_err(img.name_pair + ": cannot convert pixel coordinates, invalid document size");
        return;
    }
    log("convert pixel coordinates using document size " + docW + "x" + docH);
    for (let i = 0; i < img.labels.length; i++) {
        let l = img.labels[i];
        if (!l.pixelCoords) {
            continue;
        }
        l.x = l.x / docW;
        l.y = l.y / docH;
        if (typeof l.boxX === "number") {
            l.boxX = l.boxX / docW;
        }
        if (typeof l.boxY === "number") {
            l.boxY = l.boxY / docH;
        }
        if (typeof l.boxW === "number") {
            l.boxW = l.boxW / docW;
        }
        if (typeof l.boxH === "number") {
            l.boxH = l.boxH / docH;
        }
        l.pixelCoords = false;
    }
}

function importImage(img: ImageInfo): boolean
{
    assert(opts !== null);
    convertPixelLabelCoords(img);

    // run action _start
    if (opts.actionGroup) {
        img.ws.doc.activeLayer = img.ws.doc.layers[img.ws.doc.layers.length - 1];
        let result = doAction("_start", opts.actionGroup);
        log("run action _start[" + opts.actionGroup + "]..." + result ? "done" : "fail");
    }

    // 找出需要涂白的标签,记录他们的坐标,执行涂白
    if (opts.dialogOverlayLabelGroups) {
        let points = new Array();
        let groups = opts.dialogOverlayLabelGroups.split(",");
        for (let j = 0; j < img.labels.length; j++) {
            let l = img.labels[j];
            if (groups.indexOf(l.group) >= 0) {
                points.push({ x: l.x, y: l.y });
            }
        }

        let contract = UnitValue(2, 'pt');
        let tolerance = opts.dialogOverlayTolerance;
        log("dialogClear() ,contract_px=" + contract + ",tolerance=" + tolerance);
        dialogClear(img.ws.doc, img.ws.bgLayer, img.ws.dialogOverlayLayer, points, tolerance, contract);
        delArrayElement<ArtLayer>(img.ws.pendingDelLayerList, img.ws.dialogOverlayLayer); // do not delete dialog-overlay-layer
    }

    // 遍历LabelData
    for (let j = 0; j < img.labels.length; j++) {
        let l = img.labels[j];
        if (opts.groupSelected.indexOf(l.group) == -1) // the group did not select by user, return directly
            continue;

        let label_info: LabelInfo = {
            index: j + 1,
            x: l.x,
            y: l.y,
            group: l.group,
            contents: l.contents,
            fontSize: l.fontSize,
            orientation: l.orientation,
            font: l.font,
            fontStyle: l.fontStyle,
            color: l.color,
            strokeColor: l.strokeColor,
            strokeWeight: l.strokeWeight,
            rotation: l.rotation,
            boxX: l.boxX,
            boxY: l.boxY,
            boxW: l.boxW,
            boxH: l.boxH
        };
        log("import label " + label_info.index + "...");
        importLabel(img, label_info);
    }

    // adjust layer order
    if (img.ws.bgLayer) {
        // move overlay-manual before bg
        log('move "overlay-manual" before "bg"');
        img.ws.overlayManualLayer.move(img.ws.bgLayer, ElementPlacement.PLACEBEFORE);
        
        if (opts.dialogOverlayLabelGroups !== "") {
            log('move "dialog-overlay" before "overlay-manual"');
            img.ws.dialogOverlayLayer.move(img.ws.overlayManualLayer, ElementPlacement.PLACEBEFORE);
        }
    }

    // remove unnecessary Layer/LayerSet
    log('remove unnecessary Layer/LayerSet...');
    for (var layer of img.ws.pendingDelLayerList) { // Layer
        try {
            // 檢查圖層是否仍然有效（通過訪問其屬性）
            let layerName = layer.name; // 如果圖層無效，這裡會拋出異常
            layer.remove();
            log("removed layer: " + layerName);
        } catch (e) {
            log("layer already removed or invalid: " + e.toString());
        }
    }
    for (let k in img.ws.groups) { // LayerSet
        if (img.ws.groups[k].layerSet !== undefined) {
            if (img.ws.groups[k].layerSet?.artLayers.length === 0) {
                img.ws.groups[k].layerSet?.remove();
            }
        }
    }

    // run action _end
    if (opts.actionGroup) {
        img.ws.doc.activeLayer = img.ws.doc.layers[img.ws.doc.layers.length - 1];
        let result = doAction("_end", opts.actionGroup);
        log("run action _end[" + opts.actionGroup + "]..." + result ? "done" : "fail");
    }
    return true;
}

// 在涂白文件夾中尋找匹配的圖片文件（支援不同後綴名）
function findOverlayManualFile(overlayManualSource: string, originalFilename: string): File | null
{
    // 先嘗試精確匹配（包含後綴）
    let exactMatchFile = new File(overlayManualSource + dirSeparator + originalFilename);
    if (exactMatchFile.exists) {
        return exactMatchFile;
    }
    
    // 如果精確匹配失敗，嘗試匹配不同後綴的文件
    let nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf("."));
    if (nameWithoutExt === "") {
        nameWithoutExt = originalFilename; // 如果沒有後綴，使用原始文件名
    }
    
    // 遍歷支援的圖片格式
    for (let i = 0; i < image_suffix_list.length; i++) {
        let suffix = image_suffix_list[i];
        let candidateFile = new File(overlayManualSource + dirSeparator + nameWithoutExt + suffix);
        if (candidateFile.exists) {
            log("found overlay-manual file with different extension: " + candidateFile.fsName + " (original: " + originalFilename + ")");
            return candidateFile;
        }
    }
    
    return null; // 找不到匹配的文件
}

// 強制文件 PPI 為 72（只改元數據，不重採樣像素）。
// 字級/涂白收縮等以 pt 為單位的屬性皆按 72 PPI 計算。
function forceDocResolution72(doc: Document): void
{
    if (doc.resolution !== 72) {
        doc.resizeImage(undefined, undefined, 72, ResampleMethod.NONE);
    }
}

function isUserCancelled(e: any): boolean
{
    if (!e) return false;
    if (e.number === 8007 || e.number === -128) return true;
    let msg = String(e.message || e).toLowerCase();
    return msg.indexOf("cancel") !== -1;
}

// 靜默開檔：關掉色彩描述檔不符／缺少描述檔等詢問框
function openSilent(fileObj: File): Document
{
    try {
        let s2t = (s: string) => app.stringIDToTypeID(s);
        let desc = new ActionDescriptor();
        desc.putPath(s2t("null"), fileObj);
        app.executeAction(s2t("open"), desc, DialogModes.NO);
        return app.activeDocument;
    } catch (e) {
        if (isUserCancelled(e)) throw e;
        return app.open(fileObj);
    }
}

function openImageWorkspace(img_filename: string): ImageWorkspace | null
{
    assert(opts !== null);

    // open background image
    let bgDoc: Document;
    try {
        let bgFile = new File(opts.source + dirSeparator + img_filename);
        bgDoc = openSilent(bgFile);
    } catch {
        return null; //note: do not exit if image not exist
    }

    forceDocResolution72(bgDoc);

    // 不使用模板：直接新建文件
    let wsDoc: Document = app.documents.add(bgDoc.width, bgDoc.height, 72, bgDoc.name, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    wsDoc.activeLayer.name = TEMPLATE_LAYER.IMAGE;

    // wsDoc is clean, check template elements, if a element not exist
    let bgLayer: ArtLayer;
    let textTemplateLayer: ArtLayer;
    let dialogOverlayLayer: ArtLayer;
    let overlayManualLayer: ArtLayer;
    let pendingDelLayerList: ArtLayer[] = new Array();
    {
        // add all artlayers to the pending delete list
        for (let i = 0; i < wsDoc.artLayers.length; i++) {
            let layer: ArtLayer = wsDoc.artLayers[i];
            pendingDelLayerList.push(layer);
        }

        // bg layer template
        try { bgLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.IMAGE); }
        catch {
            bgLayer = wsDoc.artLayers.add();
            bgLayer.name = TEMPLATE_LAYER.IMAGE;
        }
        // text layer template
        try { textTemplateLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.TEXT); }
        catch {
            textTemplateLayer = wsDoc.artLayers.add();
            textTemplateLayer.name = TEMPLATE_LAYER.TEXT;
            pendingDelLayerList.push(textTemplateLayer); // pending delete
        }
        // dialog overlay layer template
        try { dialogOverlayLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.DIALOG_OVERLAY); }
        catch {
            dialogOverlayLayer = wsDoc.artLayers.add();
            dialogOverlayLayer.name = TEMPLATE_LAYER.DIALOG_OVERLAY;
        }
        // 如果用戶沒有啟用對話框涂白功能，將此圖層加入待刪除列表
        if (!opts.dialogOverlayLabelGroups || opts.dialogOverlayLabelGroups === "") {
            pendingDelLayerList.push(dialogOverlayLayer); // 加入待刪除列表
        }
        // overlay manual layer template
        try { overlayManualLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.OVERLAY_MANUAL); }
        catch {
            overlayManualLayer = wsDoc.artLayers.add();
            overlayManualLayer.name = TEMPLATE_LAYER.OVERLAY_MANUAL;
        }
    }

    // import bgDoc to wsDoc:
    // if bgDoc has only a layer, select all and copy to bg layer, for applying bg layer template
    // if bgDoc has multiple layers, move all layers after bg layer (bg layer template is invalid)
    if ((bgDoc.artLayers.length == 1) && (bgDoc.layerSets.length == 0)) {
        app.activeDocument = bgDoc;
        bgDoc.selection.selectAll();
        bgDoc.selection.copy();
        app.activeDocument = wsDoc;
        wsDoc.activeLayer = bgLayer;
        wsDoc.paste();
        delArrayElement<ArtLayer>(pendingDelLayerList, bgLayer); // keep bg layer
        
        // import overlay-manual layer from manual source folder or copy from bg layer
        if (opts.overlayManualSource !== "") {
            // try to load image from overlay manual source folder
            try {
                let overlayManualFile = findOverlayManualFile(opts.overlayManualSource, img_filename);
                if (overlayManualFile !== null) {
                    let overlayManualDoc = openSilent(overlayManualFile);
                    forceDocResolution72(overlayManualDoc);
                    app.activeDocument = overlayManualDoc;
                    overlayManualDoc.selection.selectAll();
                    overlayManualDoc.selection.copy();
                    overlayManualDoc.close(SaveOptions.DONOTSAVECHANGES);
                    
                    app.activeDocument = wsDoc;
                    wsDoc.activeLayer = overlayManualLayer;
                    wsDoc.paste();
                    log("loaded overlay-manual from: " + overlayManualFile.fsName);
                } else {
                    // fallback: copy bg layer content to overlay-manual layer
                    log("overlay-manual file not found, fallback to copy bg layer (searched for: " + img_filename + ")");
                    wsDoc.activeLayer = bgLayer;
                    wsDoc.selection.selectAll();
                    wsDoc.selection.copy();
                    wsDoc.activeLayer = overlayManualLayer;
                    wsDoc.paste();
                }
            } catch (e) {
                log_err("failed to load overlay-manual image: " + e.toString() + ", fallback to copy bg layer");
                // fallback: copy bg layer content to overlay-manual layer
                wsDoc.activeLayer = bgLayer;
                wsDoc.selection.selectAll();
                wsDoc.selection.copy();
                wsDoc.activeLayer = overlayManualLayer;
                wsDoc.paste();
            }
        } else {
            // copy bg layer content to overlay-manual layer
            wsDoc.activeLayer = bgLayer;
            wsDoc.selection.selectAll();
            wsDoc.selection.copy();
            wsDoc.activeLayer = overlayManualLayer;
            wsDoc.paste();
        }
    } else {
        app.activeDocument = bgDoc;
        let item = bgLayer;
        for (let i = 0; i < bgDoc.layers.length; i++) {
            item = bgDoc.layers[i].duplicate(item, ElementPlacement.PLACEAFTER);
        }
        
        // import overlay-manual layer from manual source folder or copy from bg layer
        app.activeDocument = wsDoc;
        if (opts.overlayManualSource !== "") {
            // try to load image from overlay manual source folder
            try {
                let overlayManualFile = findOverlayManualFile(opts.overlayManualSource, img_filename);
                if (overlayManualFile !== null) {
                    let overlayManualDoc = openSilent(overlayManualFile);
                    forceDocResolution72(overlayManualDoc);
                    app.activeDocument = overlayManualDoc;
                    overlayManualDoc.selection.selectAll();
                    overlayManualDoc.selection.copy();
                    overlayManualDoc.close(SaveOptions.DONOTSAVECHANGES);
                    
                    app.activeDocument = wsDoc;
                    wsDoc.activeLayer = overlayManualLayer;
                    wsDoc.paste();
                    log("loaded overlay-manual from: " + overlayManualFile.fsName);
                } else {
                    // fallback: copy bg layer content to overlay-manual layer
                    log("overlay-manual file not found, fallback to copy bg layer (searched for: " + img_filename + ")");
                    wsDoc.activeLayer = bgLayer;
                    wsDoc.selection.selectAll();
                    wsDoc.selection.copy();
                    wsDoc.activeLayer = overlayManualLayer;
                    wsDoc.paste();
                }
            } catch (e) {
                log_err("failed to load overlay-manual image: " + e.toString() + ", fallback to copy bg layer");
                // fallback: copy bg layer content to overlay-manual layer
                wsDoc.activeLayer = bgLayer;
                wsDoc.selection.selectAll();
                wsDoc.selection.copy();
                wsDoc.activeLayer = overlayManualLayer;
                wsDoc.paste();
            }
        } else {
            // copy bg layer content to overlay-manual layer  
            wsDoc.activeLayer = bgLayer;
            wsDoc.selection.selectAll();
            wsDoc.selection.copy();
            wsDoc.activeLayer = overlayManualLayer;
            wsDoc.paste();
        }
    }
    bgDoc.close(SaveOptions.DONOTSAVECHANGES);

    // 若文档类型为索引色模式 更改为RGB模式
    if (wsDoc.mode == DocumentMode.INDEXEDCOLOR) {
        log("wsDoc.mode is INDEXEDCOLOR, set RGB");
        wsDoc.changeMode(ChangeMode.RGB);
    }

    // 分组
    let groups: GroupDict = {};
    for (let i = 0; i < opts.groupSelected.length; i++) {
        let name = opts.groupSelected[i];
        let tmp: Group = {};

        // 创建PS中图层分组
        if (!opts.noLayerGroup) {
            tmp.layerSet = wsDoc.layerSets.add();
            tmp.layerSet.name = name;
            tmp.layerSet.blendMode = BlendMode.NORMAL;
        }
        groups[name] = tmp; // add
    }
    if (opts.outputLabelIndex) {
        let tmp: Group = {};
        tmp.layerSet = wsDoc.layerSets.add();
        tmp.layerSet.name = "Label";
        groups["_Label"] = tmp;
    }

    let ws: ImageWorkspace = {
        doc: wsDoc,
        bgLayer: bgLayer,
        textTemplateLayer: textTemplateLayer,
        dialogOverlayLayer: dialogOverlayLayer,
        overlayManualLayer: overlayManualLayer,
        pendingDelLayerList: pendingDelLayerList,
        groups: groups,
    };
    return ws;
}

function closeImage(img: ImageInfo, saveType: OptionOutputType = OptionOutputType.PSD): boolean
{
    assert(opts !== null);

    // 保存文件
    let fileOut = new File(opts.target + dirSeparator + img.name);
    let asCopy = false;
    let options: any;
    switch (saveType) {
    case OptionOutputType.PSD:
        options = PhotoshopSaveOptions;
        break;
    case OptionOutputType.TIFF:
        options = TiffSaveOptions;
        break;
    case OptionOutputType.PNG:
        options = PNGSaveOptions;
        asCopy = true;
        break;
    case OptionOutputType.JPG:
        options = new JPEGSaveOptions();
        options.quality = 10;
        asCopy = true;
        break;
    default:
        log_err(img.name_pair + ": unkown save type " + saveType);
        return false
    }

    let extensionType = Extension.LOWERCASE;
    img.ws.doc.saveAs(fileOut, options, asCopy, extensionType);

    // 关闭文件
    if (!opts.notClose)
        img.ws.doc.close(SaveOptions.DONOTSAVECHANGES);

    return true;
}

export function importFiles(custom_opts: CustomOptions): boolean
{
    opts = custom_opts;

    log("Start import process!!!");
    log("Properties start ------------------");
    log(Stdlib.listProps(opts));
    log("Properties end   ------------------");

    let origDialogs = app.displayDialogs;
    try {
        app.displayDialogs = DialogModes.NO;

        // 解析 BT 文本文件
        let filePath = opts.lpTextFilePath;
        let lpFile = btTextParser(filePath);
        if (lpFile == null) {
            log_err("error: " + I18n.ERROR_PARSER_BTTEXT_FAIL);
            return false;
        }
        log("parse bt format text done...");

        // 替换文本解析
        if (opts.textReplace) {
            let tmp = textReplaceReader(opts.textReplace);
            if (tmp === null) {
                log_err("error: " + I18n.ERROR_TEXT_REPLACE_EXPRESSION);
                return false;
            }
            textReplace = tmp;
        }
        log("parse textreplace done...");

        // 遍历所选图片
        for (let i = 0; i < opts.imageSelected.length; i++) {
            let orgin_name :string = opts.imageSelected[i].file; // 翻译文件中的图片文件名
            let matched_name: string = opts.imageSelected[i].matched_file;
            let name_pair = LabelPlus.str_filename_pair(orgin_name, matched_name);

            log(name_pair + 'in processing...' );
            if (opts.ignoreNoLabelImg && lpFile?.images[orgin_name].length == 0) { // ignore img with no label
                log('no label, ignored...');
                continue;
            }
            let ws = openImageWorkspace(matched_name);
            if (ws == null) {
                log_err(name_pair + ": " + I18n.ERROR_FILE_OPEN_FAIL);
                continue;
            }

            let img_info: ImageInfo = {
                ws: ws,
                name: matched_name,
                name_pair: name_pair,
                labels: lpFile.images[orgin_name],
            };
            if (!importImage(img_info)) {
                log_err(name_pair + ": import label failed");
            }
            if (!closeImage(img_info, opts.outputType)) {
                log_err(name_pair + ": " + I18n.ERROR_FILE_SAVE_FAIL);
            }
            log(name_pair + ": done");
        }
        log("All Done!");
        return true;
    } finally {
        app.displayDialogs = origDialogs;
    }
};


// 文本导入选项，参数为undefined时表示不设置该项
interface TextInputOptions {
    template?: ArtLayer;     // 文本图层模板
    font?: string;
    fontStyle?: string;      // "Regular" / "Bold" / "Italic" / "Bold Italic"
    size?: UnitValue;
    direction?: Direction;
    lgroup?: LayerSet;
    lending?: number;        // 自动行距
    color?: string;          // 文字颜色 (HEX，例 "#000000")
    strokeColor?: string;    // 描边颜色 (HEX)
    strokeWeight?: number;   // 描边宽度 (px)
    rotation?: number;       // 文字旋转角度（度），任意值會被正規化到 (-180, 180]
    verticalRomanChars?: string; // 直排時對這些字符套用「標準直立」(baselineDirection: withStream)
    tateChuYokoPatterns?: string; // 直排時自動匹配並套用「直排內橫排」的文本片段（以 | 分隔）
    isVertical?: boolean;    // 文本最終方向是否為直排（用來判斷是否套用 verticalRomanChars）
    tsumeChars?: string;     // 套用「比例間距 / Tsume」的字符列表
    tsumePercent?: number;   // 比例間距百分比 10~90（對應 mojiZume 0.10~0.90）
    // 段落文字框（相對座標 0–1：左上角 + 寬高）；有值則建立 PARAGRAPHTEXT
    paragraphBox?: { x: number; y: number; w: number; h: number };
};

// -------------------- 字體：Qt/BT family → Photoshop PostScript --------------------
// BT 存的是 QFont.family()（如 "[toolbox]BuDing-JF"）；
// PS textItem.font 需要 postScriptName（如 "toolboxBuDingJF-W7"）。
// Mac / Windows 皆透過 app.fonts 查詢，行為一致。

let _psFontResolveCache: { [key: string]: string } = {};

function normalizeFontKey(s: string): string
{
    // 去掉 [xxx] 前綴、空白與常見分隔符，便於模糊比對
    return String(s || "")
        .replace(/^\[[^\]]*\]/, "")
        .replace(/[\s\-_.]+/g, "")
        .toLowerCase();
}

function stylePreferenceScore(style: string, wantStyle?: string): number
{
    let st = (style || "").toLowerCase();
    let want = (wantStyle || "").toLowerCase();
    let score = 0;

    if (want) {
        let wantBold = want.indexOf("bold") !== -1;
        let wantItalic = want.indexOf("italic") !== -1;
        let isBold = st.indexOf("bold") !== -1 || st.indexOf("heavy") !== -1 || st.indexOf("black") !== -1;
        let isItalic = st.indexOf("italic") !== -1 || st.indexOf("oblique") !== -1;
        if (wantBold === isBold) score += 20;
        if (wantItalic === isItalic) score += 10;
        if (st === want) score += 30;
    } else {
        // 未指定風格：偏好 Regular / Medium / 空
        if (st === "regular" || st === "normal" || st === "book" || st === "") score += 25;
        else if (st.indexOf("medium") !== -1) score += 15;
        else if (st.indexOf("bold") !== -1 || st.indexOf("italic") !== -1) score -= 5;
    }
    return score;
}

/** family 名裡的字重提示（toolbox 字體常見：style=Regular，字重在 family） */
function familyWeightHintScore(family: string, wantStyle?: string): number
{
    let fam = (family || "").toLowerCase();
    let want = (wantStyle || "").toLowerCase();
    let wantBold = want.indexOf("bold") !== -1;
    let hasBold = fam.indexOf("bold") !== -1 || fam.indexOf("heavy") !== -1 ||
        fam.indexOf("black") !== -1 || fam.indexOf("ultra") !== -1 || /[-_]w[789]\b/.test(fam);
    let hasMedium = fam.indexOf("medium") !== -1 || fam.indexOf("regular") !== -1 || /[-_]w[45]\b/.test(fam);
    let hasLight = fam.indexOf("light") !== -1 || fam.indexOf("thin") !== -1 || /[-_]w[123]\b/.test(fam);

    if (wantBold) {
        return hasBold ? 15 : (hasMedium ? 0 : -10);
    }
    if (!want) {
        if (hasMedium) return 12;
        if (hasBold || hasLight) return -8;
        return 0;
    }
    return 0;
}

/**
 * 將 BT family / Meo PostScript / 任意字體字串解析為 Photoshop postScriptName。
 * 找不到時回傳 null（呼叫端可回退原字串）。
 */
function resolveToPostScriptFont(fontStr: string, wantStyle?: string): string | null
{
    if (!fontStr) return null;

    let cacheKey = fontStr + "\0" + (wantStyle || "");
    if (_psFontResolveCache.hasOwnProperty(cacheKey)) {
        return _psFontResolveCache[cacheKey] || null;
    }

    let resolved: string | null = null;
    try {
        let fonts: any = app.fonts;
        let n: number = fonts.length;
        let queryKey = normalizeFontKey(fontStr);

        // 1) 精確：postScriptName / name / family
        let exactMatches: any[] = [];
        for (let i = 0; i < n; i++) {
            let f = fonts[i];
            if (f.postScriptName === fontStr || f.name === fontStr || f.family === fontStr) {
                exactMatches.push(f);
            }
        }
        if (exactMatches.length === 1) {
            resolved = exactMatches[0].postScriptName;
        } else if (exactMatches.length > 1) {
            let best = exactMatches[0];
            let bestScore = -9999;
            for (let i = 0; i < exactMatches.length; i++) {
                let f = exactMatches[i];
                let sc = stylePreferenceScore(f.style, wantStyle);
                if (f.postScriptName === fontStr || f.name === fontStr) sc += 100;
                if (sc > bestScore) {
                    bestScore = sc;
                    best = f;
                }
            }
            resolved = best.postScriptName;
        }

        // 2) 模糊：normalize 後相等，或 PS family 以 query 為前綴（BuDing-JF → BuDing-JF-W7）
        if (!resolved && queryKey) {
            let best: any = null;
            let bestScore = -9999;
            for (let i = 0; i < n; i++) {
                let f = fonts[i];
                let famKey = normalizeFontKey(f.family);
                let nameKey = normalizeFontKey(f.name);
                let psKey = normalizeFontKey(f.postScriptName);

                let matched = false;
                let sc = stylePreferenceScore(f.style, wantStyle);
                // toolbox 等字體常把字重寫在 family 名裡、style 仍是 Regular
                sc += familyWeightHintScore(f.family, wantStyle);

                if (famKey === queryKey || nameKey === queryKey || psKey === queryKey) {
                    matched = true;
                    sc += 80;
                } else if (famKey.indexOf(queryKey) === 0) {
                    matched = true;
                    sc += 60;
                    sc -= Math.min(20, famKey.length - queryKey.length);
                } else if (queryKey.indexOf(famKey) === 0 && famKey.length >= 4) {
                    matched = true;
                    sc += 40;
                } else if (psKey.indexOf(queryKey) === 0) {
                    matched = true;
                    sc += 50;
                }

                if (matched && sc > bestScore) {
                    bestScore = sc;
                    best = f;
                }
            }
            if (best) {
                resolved = best.postScriptName;
            }
        }

        if (resolved) {
            log("font resolve: \"" + fontStr + "\" -> \"" + resolved + "\"");
        } else {
            log_err("font resolve failed: \"" + fontStr + "\" (not found in app.fonts)");
        }
    } catch (e) {
        log_err("font resolve error: " + e.toString());
        resolved = null;
    }

    _psFontResolveCache[cacheKey] = resolved ? resolved : "";
    return resolved;
}

// 將任意角度正規化到 (-180, 180] 區間
function normalizeRotation(deg: number): number
{
    let r = deg % 360;
    if (r > 180) r -= 360;
    if (r <= -180) r += 360;
    return r;
}

// 將 HEX 字串解析成 SolidColor，失敗時回傳 null
function parseHexColor(hex: string): SolidColor | null
{
    if (!hex) return null;
    let h = hex.replace(/^#/, "").trim();
    // 支援 3 位簡寫
    if (h.length === 3) {
        h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
        return null;
    }
    let c = new SolidColor();
    c.rgb.hexValue = h;
    return c;
}

// 為當前圖層套用「描邊」圖層樣式（透過 ActionDescriptor）
// 注意：因 ExtendScript 的 TextItem 沒有描邊屬性，必須用 Layer Style 實現
function applyStrokeLayerStyle(strokeColor: string, strokeWeightPx: number): void
{
    let color = parseHexColor(strokeColor);
    if (!color) {
        log_err("applyStrokeLayerStyle: invalid stroke color " + strokeColor);
        return;
    }

    try {
        let cTID = (s: string) => app.charIDToTypeID(s);

        let ref = new ActionReference();
        ref.putProperty(cTID("Prpr"), cTID("Lefx"));
        ref.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));

        let lefx = new ActionDescriptor();
        let scl = new ActionDescriptor();
        scl.putUnitDouble(cTID("Scl "), cTID("#Prc"), 100);
        lefx.putObject(cTID("Scl "), cTID("Scl "), scl);

        let frfx = new ActionDescriptor();
        frfx.putBoolean(cTID("enab"), true);
        frfx.putEnumerated(cTID("Styl"), cTID("FStl"), cTID("OutF"));   // 位置：外側
        frfx.putEnumerated(cTID("PntT"), cTID("FrFl"), cTID("SClr"));   // 填充：純色
        frfx.putEnumerated(cTID("Md  "), cTID("BlnM"), cTID("Nrml"));   // 混合模式：正常
        frfx.putUnitDouble(cTID("Opct"), cTID("#Prc"), 100);
        frfx.putUnitDouble(cTID("Sz  "), cTID("#Pxl"), strokeWeightPx);

        let clr = new ActionDescriptor();
        clr.putDouble(cTID("Rd  "), color.rgb.red);
        clr.putDouble(cTID("Grn "), color.rgb.green);
        clr.putDouble(cTID("Bl  "), color.rgb.blue);
        frfx.putObject(cTID("Clr "), cTID("RGBC"), clr);

        lefx.putObject(cTID("FrFX"), cTID("FrFX"), frfx);

        let desc = new ActionDescriptor();
        desc.putReference(cTID("null"), ref);
        desc.putObject(cTID("T   "), cTID("Lefx"), lefx);

        app.executeAction(cTID("setd"), desc, DialogModes.NO);
    } catch (e) {
        log_err("applyStrokeLayerStyle failed: " + e.toString());
    }
}

// 深複製 ActionDescriptor（保留所有屬性與型別，供修改 textStyleRange 使用）
function cloneActionDescriptor(src: ActionDescriptor): ActionDescriptor
{
    try {
        let stream = (<any>src).toStream();
        let cloned = new ActionDescriptor();
        (<any>cloned).fromStream(stream);
        return cloned;
    } catch (e) {
        // 舊版 Photoshop 若不支援 stream clone，退回逐項複製。
    }

    let dst = new ActionDescriptor();
    for (let i = 0; i < src.count; i++) {
        let key = src.getKey(i);
        let type = src.getType(key);
        switch (type) {
            case DescValueType.BOOLEANTYPE:
                dst.putBoolean(key, src.getBoolean(key)); break;
            case DescValueType.STRINGTYPE:
                dst.putString(key, src.getString(key)); break;
            case DescValueType.INTEGERTYPE:
                dst.putInteger(key, src.getInteger(key)); break;
            case DescValueType.DOUBLETYPE:
                dst.putDouble(key, src.getDouble(key)); break;
            case DescValueType.UNITDOUBLE:
                dst.putUnitDouble(key, src.getUnitDoubleType(key), src.getUnitDoubleValue(key)); break;
            case DescValueType.ENUMERATEDTYPE:
                dst.putEnumerated(key, src.getEnumerationType(key), src.getEnumerationValue(key)); break;
            case DescValueType.OBJECTTYPE:
                dst.putObject(key, src.getObjectType(key), cloneActionDescriptor(src.getObjectValue(key))); break;
            case DescValueType.LISTTYPE:
                dst.putList(key, cloneActionList(src.getList(key))); break;
            case DescValueType.REFERENCETYPE:
                dst.putReference(key, src.getReference(key)); break;
            case DescValueType.CLASSTYPE:
                dst.putClass(key, src.getClass(key)); break;
            case DescValueType.RAWTYPE:
                dst.putData(key, src.getData(key)); break;
            case DescValueType.ALIASTYPE:
                dst.putPath(key, src.getPath(key)); break;
        }
    }
    return dst;
}

function cloneActionList(src: ActionList): ActionList
{
    let dst = new ActionList();
    for (let i = 0; i < src.count; i++) {
        let type = src.getType(i);
        if (type === DescValueType.OBJECTTYPE) {
            dst.putObject(src.getObjectType(i), cloneActionDescriptor(src.getObjectValue(i)));
        }
        // 其他型別在 textStyleRange 上下文中極罕見；若遇到請補上
    }
    return dst;
}

// 字符級樣式覆寫規則：對 chars 中出現的每個字符，於 cloned style 上套用 mutate
interface CharStyleRule {
    chars: string;
    mutate: (style: ActionDescriptor) => void;
}

interface PatternStyleRule {
    patterns: string;
    mutate: (style: ActionDescriptor) => void;
}

interface StyleOverrideRange {
    from: number;
    to: number;
    mutators: Array<(s: ActionDescriptor) => void>;
}

function splitStylePatterns(patterns: string): string[]
{
    let arr: string[] = [];
    if (!patterns) return arr;

    let parts = patterns.split("|");
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== "") {
            arr.push(parts[i]);
        }
    }
    arr.sort((a, b) => {
        return b.length - a.length;
    });
    return arr;
}

function isRangeCovered(covered: boolean[], from: number, to: number): boolean
{
    for (let i = from; i < to; i++) {
        if (covered[i]) return true;
    }
    return false;
}

function markRangeCovered(covered: boolean[], from: number, to: number): void
{
    for (let i = from; i < to; i++) {
        covered[i] = true;
    }
}

function collectPatternStyleRanges(text: string, rules: PatternStyleRule[]): StyleOverrideRange[]
{
    let ranges: StyleOverrideRange[] = [];
    let covered: boolean[] = [];
    for (let i = 0; i < text.length; i++) {
        covered[i] = false;
    }

    for (let r = 0; r < rules.length; r++) {
        let patterns = splitStylePatterns(rules[r].patterns);
        let i = 0;
        while (i < text.length) {
            let matched = "";
            for (let p = 0; p < patterns.length; p++) {
                let pattern = patterns[p];
                if (pattern.length > 0 && text.substr(i, pattern.length) === pattern && !isRangeCovered(covered, i, i + pattern.length)) {
                    matched = pattern;
                    break;
                }
            }
            if (matched !== "") {
                ranges.push({
                    from: i,
                    to: i + matched.length,
                    mutators: [rules[r].mutate]
                });
                markRangeCovered(covered, i, i + matched.length);
                i += matched.length;
            } else {
                i++;
            }
        }
    }
    return ranges;
}

// 為當前圖層套用字符/片段級樣式覆寫
// 一次性讀寫 textKey；多條字符規則命中同一字符時會疊加套用
//
// 實作策略：透過 ActionManager 讀取 textKey → 取出 textStyleRange[0] 的預設樣式 →
// 重建 textStyleRange 列表，命中的字符或片段獨立成 range 並套用對應 mutate
function applyCharStyleOverrides(text: string, rules: CharStyleRule[], patternRules?: PatternStyleRule[]): void
{
    if (!text) return;
    if ((!rules || rules.length === 0) && (!patternRules || patternRules.length === 0)) return;

    // 片段規則優先保留完整 range，避免直排內橫排被拆成單字符。
    let ranges: StyleOverrideRange[] = collectPatternStyleRanges(text, patternRules || []);
    let covered: boolean[] = [];
    for (let i = 0; i < text.length; i++) {
        covered[i] = false;
    }
    for (let i = 0; i < ranges.length; i++) {
        markRangeCovered(covered, ranges[i].from, ranges[i].to);
    }

    // 收集未被片段規則覆蓋的單字符規則。
    for (let i = 0; i < text.length; i++) {
        if (covered[i]) continue;
        let ch = text.charAt(i);
        let muts: Array<(s: ActionDescriptor) => void> = [];
        for (let r = 0; r < rules.length; r++) {
            if (rules[r].chars.indexOf(ch) !== -1) {
                muts.push(rules[r].mutate);
            }
        }
        if (muts.length > 0) {
            ranges.push({from: i, to: i + 1, mutators: muts});
        }
    }
    if (ranges.length === 0) return;
    ranges.sort((a, b) => {
        return a.from - b.from;
    });

    try {
        let cTID = (s: string) => app.charIDToTypeID(s);
        let sTID = (s: string) => app.stringIDToTypeID(s);

        let getRef = new ActionReference();
        getRef.putProperty(cTID("Prpr"), sTID("textKey"));
        getRef.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
        let layerDesc = app.executeActionGet(getRef);
        if (!layerDesc.getObjectValue) return;
        let textKey = layerDesc.getObjectValue(sTID("textKey"));

        let oldRanges = textKey.getList(sTID("textStyleRange"));
        if (oldRanges.count === 0) return;

        let buildRange = (from: number, to: number, baseStyle: ActionDescriptor, mutators: Array<(s: ActionDescriptor) => void>): ActionDescriptor => {
            let r = new ActionDescriptor();
            r.putInteger(sTID("from"), from);
            r.putInteger(sTID("to"), to);
            let style = cloneActionDescriptor(baseStyle);
            for (let i = 0; i < mutators.length; i++) {
                mutators[i](style);
            }
            r.putObject(sTID("textStyle"), sTID("textStyle"), style);
            return r;
        };

        let newRanges = new ActionList();
        for (let oi = 0; oi < oldRanges.count; oi++) {
            let oldRange = oldRanges.getObjectValue(oi);
            let from = oldRange.getInteger(sTID("from"));
            let to = oldRange.getInteger(sTID("to"));
            let baseStyle = oldRange.getObjectValue(sTID("textStyle"));
            let cursor = from;

            for (let ri = 0; ri < ranges.length; ri++) {
                let range = ranges[ri];
                if (range.to <= from) continue;
                if (range.from >= to) break;

                let overlapFrom = Math.max(range.from, cursor);
                let overlapTo = Math.min(range.to, to);
                if (overlapTo <= overlapFrom) continue;

                if (cursor < overlapFrom) {
                    newRanges.putObject(sTID("textStyleRange"), buildRange(cursor, overlapFrom, baseStyle, []));
                }
                newRanges.putObject(sTID("textStyleRange"), buildRange(overlapFrom, overlapTo, baseStyle, range.mutators));
                cursor = overlapTo;
            }

            if (cursor < to) {
                newRanges.putObject(sTID("textStyleRange"), buildRange(cursor, to, baseStyle, []));
            }
        }

        textKey.putList(sTID("textStyleRange"), newRanges);

        let setRef = new ActionReference();
        setRef.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
        let setDesc = new ActionDescriptor();
        setDesc.putReference(cTID("null"), setRef);
        // Adobe 標準寫法：textLayer 的 class ID 為 CharID "TxLr"
        setDesc.putObject(cTID("T   "), cTID("TxLr"), textKey);
        app.executeAction(cTID("setd"), setDesc, DialogModes.NO);
    } catch (e) {
        log_err("applyCharStyleOverrides failed: " + e.toString());
    }
}

// 创建文本图层
function newTextLayer(doc: Document, text: string, x: number, y: number, topts: TextInputOptions = {}): ArtLayer
{
    let artLayerRef: ArtLayer;
    let textItemRef: TextItem;

    // 从模板创建，可以保证图层的所有格式与模板一致
    if (topts.template) {
        /// @ts-ignore ts声明文件有误，duplicate()返回ArtLayer对象，而不是void
        artLayerRef = <ArtLayer> topts.template.duplicate();
        textItemRef = artLayerRef.textItem;
    }
    else {
        artLayerRef = doc.artLayers.add();
        artLayerRef.kind = LayerKind.TEXT;
        textItemRef = artLayerRef.textItem;
    }

    if (topts.size)
        textItemRef.size = topts.size;

    if (topts.font) {
        try {
            textItemRef.font = topts.font;
        } catch (e) {
            log_err("set font failed: \"" + topts.font + "\" - " + e.toString());
        }
    }

    if (topts.direction)
        textItemRef.direction = topts.direction;

    // 文字風格（Bold / Italic）：當 PostScript 字體本身已包含風格時，
    // 此處主要作為輔助；若樣式包含 "Bold"/"Italic" 才套用 fauxBold/fauxItalic
    if (topts.fontStyle) {
        let style = topts.fontStyle.toLowerCase();
        try {
            (<any>textItemRef).fauxBold = (style.indexOf("bold") !== -1);
            (<any>textItemRef).fauxItalic = (style.indexOf("italic") !== -1);
        } catch (e) {
            log("fauxBold/fauxItalic not supported: " + e.toString());
        }
    }

    // 文字顏色
    if (topts.color) {
        let c = parseHexColor(topts.color);
        if (c) {
            textItemRef.color = c;
        } else {
            log_err("invalid text color: " + topts.color);
        }
    }

    // 段落文字：依文字框建立 Area Text；否則維持點文字
    let useParagraph = !!(topts.paragraphBox &&
        topts.paragraphBox.w > 0 && topts.paragraphBox.h > 0);
    if (useParagraph) {
        let box = topts.paragraphBox!;
        let docW = doc.width.as("px");
        let docH = doc.height.as("px");
        let ru = app.preferences.rulerUnits;
        try {
            app.preferences.rulerUnits = Units.PIXELS;
            textItemRef.kind = TextType.PARAGRAPHTEXT;
            // position = 文字框左上角
            textItemRef.position = Array(
                UnitValue(docW * box.x, "px"),
                UnitValue(docH * box.y, "px")
            );
            textItemRef.width = UnitValue(docW * box.w, "px");
            textItemRef.height = UnitValue(docH * box.h, "px");
        } catch (e) {
            log_err("create paragraph text failed, fallback to point text: " + e.toString());
            useParagraph = false;
            textItemRef.position = Array(UnitValue(doc.width.as("px") * x, "px"), UnitValue(doc.height.as("px") * y, "px"));
        } finally {
            app.preferences.rulerUnits = ru;
        }
    } else {
        textItemRef.position = Array(UnitValue(doc.width.as("px") * x, "px"), UnitValue(doc.height.as("px") * y, "px"));
    }

    if (topts.lgroup)
        artLayerRef.move(topts.lgroup, ElementPlacement.PLACEATBEGINNING);

    if ((topts.lending) && (topts.lending != 0)) {
        textItemRef.useAutoLeading = true;
        textItemRef.autoLeadingAmount = topts.lending;
    }

    artLayerRef.name     = text;
    textItemRef.contents = text;

    // 字符/片段級樣式覆寫：直立字符、直排內橫排、比例間距
    // 必須在文字內容寫入後、旋轉前進行（旋轉前才能正確修改 textKey）
    {
        let rules: CharStyleRule[] = [];
        let patternRules: PatternStyleRule[] = [];
        let sTID = (s: string) => app.stringIDToTypeID(s);

        if (topts.isVertical && topts.verticalRomanChars) {
            rules.push({
                chars: topts.verticalRomanChars,
                mutate: (s) => {
                    s.putEnumerated(sTID("baselineDirection"), sTID("baselineDirection"), sTID("withStream"));
                }
            });
        }
        if (topts.isVertical && topts.tateChuYokoPatterns) {
            patternRules.push({
                patterns: topts.tateChuYokoPatterns,
                mutate: (s) => {
                    let idBaselineDirection = sTID("baselineDirection");
                    s.putEnumerated(idBaselineDirection, idBaselineDirection, app.charIDToTypeID("Crs "));
                }
            });
        }
        if (topts.tsumeChars && typeof topts.tsumePercent === "number" && topts.tsumePercent > 0) {
            let tsumeValue = topts.tsumePercent / 100;
            rules.push({
                chars: topts.tsumeChars,
                mutate: (s) => {
                    s.putDouble(sTID("mojiZume"), tsumeValue);
                }
            });
        }
        if (rules.length > 0 || patternRules.length > 0) {
            doc.activeLayer = artLayerRef;
            applyCharStyleOverrides(text, rules, patternRules);
        }
    }

    // 旋轉：在內容寫入後、描邊套用前進行；以圖層中心為錨點
    // 描邊圖層樣式會跟隨變換，所以順序對描邊結果沒有影響
    //
    // 角度慣例與 Photoshop 一致（與 PS 匯出相同）：
    //   正值 = 順時針，負值 = 逆時針（等同 ArtLayer.rotate()）
    if (typeof topts.rotation === "number" && !isNaN(topts.rotation)) {
        let deg = normalizeRotation(topts.rotation);
        if (deg !== 0) {
            try {
                artLayerRef.rotate(deg, AnchorPosition.MIDDLECENTER);
            } catch (e) {
                log_err("rotate text layer failed: " + e.toString());
            }
        }
    }

    // 描邊樣式：必須在文本內容寫入後再套用，否則邊界尚未定型
    if (topts.strokeColor && topts.strokeWeight && topts.strokeWeight > 0) {
        doc.activeLayer = artLayerRef;
        applyStrokeLayerStyle(topts.strokeColor, topts.strokeWeight);
    }

    return artLayerRef;
}

type TextReplaceInfo = { from: string; to: string; }[];

// 文本替换表达式解析
function textReplaceReader(str: string): TextReplaceInfo | null
{
    let arr: TextReplaceInfo = [];

    let strs = str.split('|');
    if (!strs)
        return null; //解析失败

    for (let i = 0; i < strs.length; i++) {
        if (strs[i] === "")
            continue;

        let strss = strs[i].split("->");
        if ((strss.length != 2) || (strss[0] == ""))
            return null; //解析失败

        arr.push({ from: strss[0], to: strss[1] });
    }
    return arr;
}

} // namespace LabelPlus
