/// <reference path="legacy.d.ts" />

namespace LabelPlus {

export enum OptionTextDirection { Keep, Horizontal, Vertical };
export enum OptionOutputType { PSD, TIFF, PNG, JPG, _count };

export class ImageInfo {
    file: string = "";
    matched_file:string = "";
    index: number = 0;
};

export class CustomOptions {

    // ------------------------------------ not saved options
    source: string = ""; // images source folder
    target: string = ""; // images target folder
    overlayManualSource: string = ""; // overlay manual images source folder
    lpTextFilePath: string = ""; // path of labelplus text file
    imageSelected: ImageInfo[] = []; // selected images
    groupSelected: string[] = [];  // selected label group

    // ------------------------------------ saved options
    language: string = "auto"; // "auto" | "zh" | "en"；auto = 跟隨 Photoshop 介面語言
    outputType: OptionOutputType = OptionOutputType.PSD; // output image file type
    ignoreNoLabelImg: boolean = false; // ignore images with no label
    noLayerGroup: boolean = false; // do not create group in document for text layers
    notClose: boolean = false; // do not close image document
    centerAlign: boolean = true; // 是否居中对齐（默認勾選）
    useMeoFontSize: boolean = true; // 是否使用來源文字樣式（字級、方向、顏色、描邊等）；預設勾選
    useParagraphText: boolean = true; // BT：有文字框時建立段落文字（依框自動換行）；預設勾選
    verticalRomanChars: string = "?!"; // 直排文字中要套用「標準直立」的字符列表
    tateChuYokoPatterns: string = "!!|!?|?!|??"; // 直排時自動匹配並套用「直排內橫排」的文本片段
    tsumeChars: string = "「」"; // 套用「比例間距 / Tsume」的字符列表（直排/橫排都生效）；空字串=停用
    tsumePercent: number = 80; // 比例間距百分比，10~90（對應 Photoshop mojiZume 0.10~0.90）

    font: string = ""; // set font if it is not empty
    fontSize: number = 0; // set font size if it is not 0
    textLeading: number = 0; // set auto leading value if neq 0, unit is percent
    textReplace: string = ""; // run text replacing function, if the expression is not empty
    outputLabelIndex: boolean = false; // if true, output label index as text layer
    textDirection: OptionTextDirection = OptionTextDirection.Keep; // text direction option

    actionGroup: string = ""; // action group name
    dialogOverlayLabelGroups: string = ""; // the label groups need dialog overlay layer, split by ","
    dialogOverlayTolerance: number = 16; // dialog overlay tolerance
};

} // namespace LabelPlus
