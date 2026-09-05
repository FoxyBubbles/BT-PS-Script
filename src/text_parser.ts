// LabelPlus专用格式TextReader
/// <reference path="legacy.d.ts" />

namespace LabelPlus {

export interface LpLabel {
    x: number;
    y: number;
    contents: string;
    group: string;
    fontSize?: number; // 增加可選的字體大小屬性
    orientation?: string; // 增加可選的文字方向屬性（"horizontal" 或 "vertical"）
    font?: string; // PostScript name，例如 "SourceHanSansSC-Bold"
    fontStyle?: string; // 字體風格，例如 "Regular"、"Bold"、"Italic"、"Bold Italic"
    color?: string; // 文字顏色（HEX 字串，例如 "#000000"）
    strokeColor?: string; // 描邊顏色（HEX 字串，空字串表示不描邊）
    strokeWeight?: number; // 描邊寬度（單位：px），0 表示不描邊
    rotation?: number; // 文字旋轉角度（度，Photoshop 慣例：正值=順時針，負值=逆時針），會正規化到 (-180, 180]
    // 文字框（相對座標 0–1；BT 等有框資訊時填入；x/y 為左上角，w/h 為寬高）
    boxX?: number;
    boxY?: number;
    boxW?: number;
    boxH?: number;
    // true：x/y/box* 為像素絕對座標（image_info 缺寬高時）；匯入時再依文件尺寸正規化
    pixelCoords?: boolean;
}

export type LpLabelDict = {
    [key: string]: LpLabel[]
};

export interface LpFile {
    path: string;
	groups: string[];
	images: LpLabelDict;
    directory?: string; // BT JSON 的 directory（原工程資料夾，可能與 JSON 所在路徑不同）
};

// Meo格式的接口定義
export interface MeoGroupInfo {
    name: string;
    color: string;
}

export interface MeoLabel {
    index: number;
    groupId: number;
    x: number;
    y: number;
    text: string;
    "font-size"?: number; // 增加可選的字體大小屬性
    orientation?: string; // 增加可選的文字方向屬性（"horizontal" 或 "vertical"）
    "font-family"?: string; // 字體名稱（PostScript name，例如 "SourceHanSansSC-Bold"）
    font?: string; // 兼容欄位：部分 Meo JSON 用 "font" 取代 "font-family"
    "font-style"?: string; // 字體風格（"Regular"、"Bold"、"Italic"、"Bold Italic"）
    color?: string; // 文字顏色（HEX，如 "#000000"）
    "stroke-color"?: string; // 描邊顏色（HEX，空字串表示不描邊）
    "stroke-weight"?: number; // 描邊寬度（px，0 表示不描邊）
    rotation?: number; // 文字旋轉角度（度，Photoshop 慣例：正值=順時針，負值=逆時針）
}

export interface MeoFile {
    version: number[];
    comment: string;
    groupList: MeoGroupInfo[];
    transMap: {
        [key: string]: MeoLabel[]
    };
}

// Meo格式JSON解析函數
export function meoTextParser(path: string): LpFile | null
{
    var f = new File(path);
    if (!f || !f.exists) {
        log_err("MeoTextReader: file " + path + " not exists");
        return null;
    }

    try {
        // 打開並讀取文件
        f.open("r", "TEXT", "????");
        f.lineFeed = "unix";
        f.encoding = 'UTF-8';
        var json = f.read();
        f.close();

        // 解析JSON
        var meoData: MeoFile = (new Function('return ' + json))();
        
        // 檢查是否為有效的Meo格式
        if (!meoData.groupList || !meoData.transMap) {
            log_err("Invalid Meo format: missing groupList or transMap");
            return null;
        }

        // 記錄Meo格式的額外信息
        log("Meo format detected:");
        log("  version: " + (meoData.version ? meoData.version.join('.') : 'unknown'));
        log("  comment: " + (meoData.comment || 'none'));
        log("  groups: " + meoData.groupList.length);

        // 轉換為LpFile格式
        let groups: string[] = [];
        for (let i = 0; i < meoData.groupList.length; i++) {
            groups.push(meoData.groupList[i].name);
            // 記錄分組顏色信息（雖然LabelPlus不使用，但記錄到日誌中）
            log("  group[" + i + "]: " + meoData.groupList[i].name + " (color: " + meoData.groupList[i].color + ")");
        }

        let images: LpLabelDict = {};
        for (let filename in meoData.transMap) {
            let meoLabels = meoData.transMap[filename];
            let lpLabels: LpLabel[] = [];
            
            // 按照原始index排序，以保持標籤順序
            meoLabels.sort((a, b) => a.index - b.index);
            
            for (let j = 0; j < meoLabels.length; j++) {
                let meoLabel = meoLabels[j];
                
                // 修正：直接使用groupId作為索引（與原始Meo腳本一致）
                let groupName = (meoLabel.groupId >= 0 && meoLabel.groupId < meoData.groupList.length) 
                    ? groups[meoLabel.groupId]
                    : "未知分組";
                
                // 修正：將空格替換為換行符（與原始Meo腳本一致，只替換第一個空格）
                let processedText = meoLabel.text.replace(/\n/g, "\r");
                
                let lpLabel: LpLabel = {
                    x: meoLabel.x,
                    y: meoLabel.y,
                    contents: processedText,
                    group: groupName,
                    fontSize: meoLabel["font-size"], // 傳遞字體大小
                    orientation: meoLabel.orientation, // 傳遞文字方向
                    font: meoLabel["font-family"] || meoLabel.font, // 兼容兩種欄位名
                    fontStyle: meoLabel["font-style"],
                    color: meoLabel.color,
                    strokeColor: meoLabel["stroke-color"],
                    strokeWeight: meoLabel["stroke-weight"],
                    rotation: meoLabel.rotation
                };
                lpLabels.push(lpLabel);
                
                // 記錄原始index信息（用於調試）
                log("  label[" + filename + "#" + meoLabel.index + "]: '" + meoLabel.text + "' -> '" + processedText + "' @(" + meoLabel.x + "," + meoLabel.y + ") group:" + groupName);
            }
            images[filename] = lpLabels;
        }

        let result: LpFile = {
            path: path,
            groups: groups,
            images: images
        };

        return result;
    } catch (e) {
        log_err("MeoTextReader: parse error - " + e.toString());
        return null;
    }
}

// BalloonsTranslator (BT) JSON 介面
export interface BtImageInfo {
    finish_code?: number;
    width?: number;
    height?: number;
    translation_target?: string;
}

export interface BtFontFormat {
    font_family?: string;
    font_size?: number;
    stroke_width?: number;
    frgb?: number[]; // [R, G, B]
    srgb?: number[]; // stroke [R, G, B]
    bold?: boolean;
    italic?: boolean;
    vertical?: boolean;
    alignment?: number;
    font_weight?: number;
    line_spacing?: number;
    letter_spacing?: number;
}

export interface BtBalloon {
    xyxy: number[]; // [x1, y1, x2, y2] 像素絕對座標
    text?: string[];
    translation?: string;
    angle?: number;
    src_is_vertical?: boolean;
    label?: string | null;
    fontformat?: BtFontFormat;
    _detected_font_size?: number;
}

export interface BtFile {
    directory?: string;
    pages: { [filename: string]: BtBalloon[] };
    current_img?: string;
    image_info: { [filename: string]: BtImageInfo };
}

function btRgbToHex(rgb: number[]): string | undefined
{
    if (!rgb || rgb.length < 3) {
        return undefined;
    }
    function toHex(n: number): string {
        let v = Math.round(n);
        if (v < 0) v = 0;
        if (v > 255) v = 255;
        let h = v.toString(16).toUpperCase();
        return (h.length < 2) ? ("0" + h) : h;
    }
    return "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
}

function btFontStyleFromFlags(bold?: boolean, italic?: boolean): string | undefined
{
    if (bold && italic) return "Bold Italic";
    if (bold) return "Bold";
    if (italic) return "Italic";
    return undefined;
}

function parseJsonObject(json: string): any
{
    if (!json) {
        throw new Error("empty json");
    }
    if (json.charAt(0) === "\uFEFF") {
        json = json.substring(1);
    }
    if (typeof jamJSON !== "undefined" && jamJSON.parse) {
        return jamJSON.parse(json);
    }
    return (new Function("return " + json))();
}

// BalloonsTranslator JSON 解析函數（獨立 parser，輸出統一為 LpFile）
export function btTextParser(path: string): LpFile | null
{
    var f = new File(path);
    if (!f || !f.exists) {
        log_err("BtTextReader: file " + path + " not exists");
        return null;
    }

    try {
        f.open("r", "TEXT", "????");
        f.lineFeed = "unix";
        f.encoding = 'UTF-8';
        var json = f.read();
        f.close();

        var btData: BtFile = parseJsonObject(json);

        if (!btData.pages) {
            log_err("Invalid BT format: missing pages");
            return null;
        }
        if (!btData.image_info) {
            btData.image_info = {};
        }

        log("BT format detected:");
        log("  directory: " + (btData.directory || 'none'));

        // BT 無分組概念：優先用 balloon.label，否則統一歸入 default
        let groups: string[] = [];
        let groupSet: { [name: string]: boolean } = {};

        let images: LpLabelDict = {};
        let totalLabels = 0;

        for (let filename in btData.pages) {
            if (!btData.pages.hasOwnProperty(filename)) {
                continue;
            }
            let balloons = btData.pages[filename];
            if (!balloons || typeof balloons.length !== "number") {
                continue;
            }

            let imgInfo = btData.image_info[filename];
            let imgW = (imgInfo && imgInfo.width) ? imgInfo.width : 0;
            let imgH = (imgInfo && imgInfo.height) ? imgInfo.height : 0;
            // 部分 BT 工程的 image_info 只有 finish_code，沒有寬高。
            // 不可整頁跳過，否則圖片列表會是空的；改存像素座標，匯入時再正規化。
            let usePixelCoords = !(imgW > 0 && imgH > 0);
            if (usePixelCoords) {
                log("BtTextReader: image_info missing width/height for " + filename + ", keep pixel coords");
            }

            let lpLabels: LpLabel[] = [];
            for (let i = 0; i < balloons.length; i++) {
                let b = balloons[i];
                if (!b || !b.xyxy || b.xyxy.length < 4) {
                    continue;
                }

                let rawText = "";
                if (b.translation != null && String(b.translation) !== "") {
                    rawText = String(b.translation);
                } else if (b.text && b.text.length > 0) {
                    rawText = b.text.join("\n");
                }
                if (rawText === "") {
                    continue;
                }
                let processedText = rawText.replace(/\n/g, "\r");

                let x1 = b.xyxy[0], y1 = b.xyxy[1], x2 = b.xyxy[2], y2 = b.xyxy[3];
                // 有寬高時轉成相對座標（框中心）；否則保留像素，匯入時再除以文件尺寸
                let nx = (x1 + x2) / 2.0;
                let ny = (y1 + y2) / 2.0;
                let boxX = x1;
                let boxY = y1;
                let boxW = x2 - x1;
                let boxH = y2 - y1;
                if (!usePixelCoords) {
                    nx = nx / imgW;
                    ny = ny / imgH;
                    boxX = boxX / imgW;
                    boxY = boxY / imgH;
                    boxW = boxW / imgW;
                    boxH = boxH / imgH;
                }

                let groupName = "default";
                if (b.label != null && String(b.label) !== "") {
                    groupName = String(b.label);
                }
                if (!groupSet[groupName]) {
                    groupSet[groupName] = true;
                    groups.push(groupName);
                }

                let ff = b.fontformat;
                let orientation: string | undefined = undefined;
                if (ff && typeof ff.vertical === "boolean") {
                    orientation = ff.vertical ? "vertical" : "horizontal";
                } else if (typeof b.src_is_vertical === "boolean") {
                    orientation = b.src_is_vertical ? "vertical" : "horizontal";
                }

                let fontSize: number | undefined = undefined;
                if (ff && ff.font_size && ff.font_size > 0) {
                    fontSize = ff.font_size;
                } else if (b._detected_font_size && b._detected_font_size > 0) {
                    fontSize = b._detected_font_size;
                }

                let font: string | undefined = undefined;
                if (ff && ff.font_family) {
                    // 保留 BT/Qt family 原名（可能含 [toolbox]）；PS PostScript 對應在 importer 解析
                    font = ff.font_family;
                }

                let fontStyle: string | undefined = undefined;
                let color: string | undefined = undefined;
                let strokeColor: string | undefined = undefined;
                let strokeWeight: number | undefined = undefined;
                if (ff) {
                    fontStyle = btFontStyleFromFlags(ff.bold, ff.italic);
                    color = btRgbToHex(ff.frgb || []);
                    if (ff.stroke_width && ff.stroke_width > 0) {
                        strokeWeight = ff.stroke_width;
                        strokeColor = btRgbToHex(ff.srgb || []);
                    }
                }

                let rotation: number | undefined = undefined;
                if (typeof b.angle === "number" && !isNaN(b.angle)) {
                    rotation = b.angle;
                }

                let lpLabel: LpLabel = {
                    x: nx,
                    y: ny,
                    contents: processedText,
                    group: groupName,
                    fontSize: fontSize,
                    orientation: orientation,
                    font: font,
                    fontStyle: fontStyle,
                    color: color,
                    strokeColor: strokeColor,
                    strokeWeight: strokeWeight,
                    rotation: rotation,
                    boxX: boxX,
                    boxY: boxY,
                    boxW: boxW,
                    boxH: boxH,
                    pixelCoords: usePixelCoords ? true : undefined
                };
                lpLabels.push(lpLabel);
                totalLabels++;

                log("  label[" + filename + "#" + (i + 1) + "]: '" + processedText + "' @(" + nx + "," + ny + ") group:" + groupName);
            }
            images[filename] = lpLabels;
        }

        if (groups.length === 0) {
            groups.push("default");
        }

        log("  pages: " + (function () { let n = 0; for (let k in images) { if (images.hasOwnProperty(k)) n++; } return n; })());
        log("  labels: " + totalLabels);
        log("  groups: " + groups.join(", "));

        return {
            path: path,
            groups: groups,
            images: images,
            directory: btData.directory || ""
        };
    } catch (e) {
        log_err("BtTextReader: parse error - " + e.toString());
        return null;
    }
}

export function lpTextParser(path: string): LpFile | null
{
    var f = new File(path);
    if (!f || !f.exists) {
        log_err("LabelPlusTextReader: file " + path + " not exists");
        return null;
    }

    // 打开
    f.open("r");
    f.encoding = 'UTF-8';

    // json格式读取
    if (path.substring(path.lastIndexOf("."), path.length) == '.json') {
        f.open("r", "TEXT", "????");
        f.lineFeed = "unix";
        f.encoding = 'UTF-8';
        var json = f.read();
        var data = (new Function('return ' + json))();
        f.close();
        return data;
    }

    // 分行读取
    var state = 'start'; //'start','filehead','context'
    var notDealStr;
    var notDealLabelheadMsg;
    var nowFilename;
    var labelData = new Array();
    var filenameList = new Array();
    var groupData;
    var lineMsg;

    for (var i = 0; !f.eof; i++) {
        var lineStr = f.readln();
        lineMsg = judgeLineType(lineStr);
        switch (lineMsg.Type) {
            case 'filehead':
                if (state == 'start') {
                    //处理start blocks
                    var result = readStartBlocks(notDealStr);
                    if (!result) {
                        log_err("readStartBlocks fail");
                        return null;
                    }
                    groupData = result.Groups;
                }
                else if (state == 'filehead') {
                }
                else if (state == 'context') {
                    //保存label
                    labelData[nowFilename].push(
                        {
                            LabelheadValue: notDealLabelheadMsg.Values,
                            LabelString: notDealStr.trim()
                        }
                    );
                }

                //新建文件项
                labelData[lineMsg.Title] = new Array();
                filenameList.push(lineMsg.Title);
                nowFilename = lineMsg.Title;
                notDealStr = "";
                state = 'filehead';
                break;

            case 'labelhead':
                if (state == 'start') {
                    log_err("start-filehead not found...");
                    return null;
                }
                else if (state == 'filehead') {
                }
                else if (state == 'context') {
                    labelData[nowFilename].push(
                        {
                            LabelheadValue: notDealLabelheadMsg.Values,
                            LabelString: notDealStr.trim()
                        }
                    );
                }

                notDealStr = "";
                notDealLabelheadMsg = lineMsg;
                state = 'context';
                break;

            case 'unknown':
                notDealStr += "\r" + lineStr;
                break;
        }
    }

    if (state == 'context' && lineMsg.Type == 'unknown') {
        labelData[nowFilename].push(
            {
                LabelheadValue: notDealLabelheadMsg.Values,
                LabelString: notDealStr.trim()
            }
        );
    }

    // output
    let label_dict: LpLabelDict = {};
    for (let i = 0; i < filenameList.length; i++) {
        let img_name = filenameList[i];
        let labels_of_image: LpLabel[] = new Array();
        for (let j = 0; j < labelData[img_name].length; j++) {
            let data = labelData[img_name][j];
            let l: LpLabel = {
                x: data.LabelheadValue[0],
                y: data.LabelheadValue[1],
                group: groupData[data.LabelheadValue[2] - 1],
                contents: data.LabelString,
            };
            labels_of_image.push(l);
        }
        label_dict[img_name] = labels_of_image;
    }
    let dat: LpFile = {
        path:   <string> path,
        groups: <string[]> groupData,
        images: label_dict,
    };
    return dat;
};

//
// 判断字符串行类型 'filehead','labelhead','unknown'
// filehead:    >>>>>>[filename]<<<<<<
// labelhead:   ------[num]------[value, list]
//
function judgeLineType(str: string) {
    let index = 0;
    var result = {
        Type: 'unknown',
        Title: '',
        Values: [''],
    };

    // FIXME handle invalid string format error
    str = str.trim();
    if (str.substr(0, 6) == '>>>>>>') { // assumed to be a file name
        str = str.slice(2 + str.indexOf(">["));
        if ((index = str.search(/\]<{6,}$/)) < 0)
            return result;
        result.Title = str.substring(0, index);
        result.Type = 'filehead';
    } else if (str.substr(0, 6) == '------') { // assumed to be a label
        str = str.slice(2 + str.indexOf("-["));
        if ((index = str.search(/\]-{6,}\[/)) < 0)
            return result;
        result.Title = str.substring(0, index);
        str = str.slice(2 + str.indexOf("-["))
        if ((index = str.search(/\]$/)) < 0)
            return result;
        str = str.substring(0, index);
        result.Values = str.split(',');
        result.Type = 'labelhead';
    }

    return result;
};

function readStartBlocks(str: string) {
    var blocks = str.split("-");
    if (blocks.length < 3) {
        log_err("Start blocks format error!");
        return null;
    }

    //block1 文件头
    var filehead = blocks[0].split(",");
    if (filehead.length < 2) {
        log_err("filehead format error!");
        return null;
    }
    var first_version = parseInt(filehead[0]);
    var last_version = parseInt(filehead[1]);

    //block2 分组信息
    var groups = blocks[1].trim().split("\r");
    for (var i = 0; i < groups.length; i++)
        groups[i] = groups[i].trim();

    //block末
    var comment = blocks[blocks.length - 1];

    return {
        FirstVer: first_version,
        LastVer: last_version,
        Groups: groups,
        Comment: comment,
    };
};

} // namespace LabelPlus
