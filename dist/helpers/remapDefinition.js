"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remapDefinitionInfo = exports.lineToTextSpan = exports.extractClassNameFromDts = exports.extractPropertyNameAtPosition = void 0;
var classLocationCache_1 = require("./classLocationCache");
var CLASS_NAME_IN_DTS = /(?:interface _CSSModules \{\s*'([^']+)'|export let ([A-Za-z_$][\w$]*))/;
var isIdentChar = function (char) { return /[A-Za-z0-9_$]/.test(char); };
/**
 * Reads the property name under the cursor for `classes.foo` / `classes['foo']`.
 */
var extractPropertyNameAtPosition = function (sourceText, position) {
    var _a, _b;
    if (position < 0 || position > sourceText.length)
        return undefined;
    // Quoted access: classes['foo'] or classes["foo"]
    var around = sourceText.slice(Math.max(0, position - 80), Math.min(sourceText.length, position + 80));
    var relative = Math.min(position, 80);
    var quoted = /\[\s*(['"])([^'"]+)\1\s*\]/g;
    var match;
    while ((match = quoted.exec(around)) !== null) {
        var start_1 = match.index;
        var end_1 = start_1 + match[0].length;
        if (relative >= start_1 && relative <= end_1) {
            return match[2];
        }
    }
    // Dot access: classes.foo
    var start = position;
    var end = position;
    while (start > 0 && isIdentChar((_a = sourceText[start - 1]) !== null && _a !== void 0 ? _a : ''))
        start -= 1;
    while (end < sourceText.length && isIdentChar((_b = sourceText[end]) !== null && _b !== void 0 ? _b : ''))
        end += 1;
    if (start === end)
        return undefined;
    var name = sourceText.slice(start, end);
    if (start > 0 && sourceText[start - 1] === '.') {
        return name;
    }
    return undefined;
};
exports.extractPropertyNameAtPosition = extractPropertyNameAtPosition;
var extractClassNameFromDts = function (dts, start) {
    var _a;
    // Prefer an exact match covering the span start, not the first match in a
    // large window (multiple declarations can share one virtual line).
    var lineStart = dts.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    var lineEnd = dts.indexOf('\n', start);
    var line = dts.slice(lineStart, lineEnd === -1 ? dts.length : lineEnd);
    var global = new RegExp(CLASS_NAME_IN_DTS.source, 'g');
    var best;
    var lineMatch;
    while ((lineMatch = global.exec(line)) !== null) {
        var name_1 = (_a = lineMatch[1]) !== null && _a !== void 0 ? _a : lineMatch[2];
        if (!name_1)
            continue;
        var absolute = lineStart + lineMatch.index;
        var distance = Math.abs(absolute - start);
        if (!best || distance < best.distance) {
            best = { name: name_1, distance: distance };
        }
    }
    return best === null || best === void 0 ? void 0 : best.name;
};
exports.extractClassNameFromDts = extractClassNameFromDts;
var lineToTextSpan = function (text, 
/** 1-based */
line) {
    var _a, _b;
    var lines = text.split('\n');
    var index = Math.max(0, Math.min(line - 1, lines.length - 1));
    var start = 0;
    for (var i = 0; i < index; i++) {
        start += lines[i].length + 1;
    }
    return { start: start, length: (_b = (_a = lines[index]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0 };
};
exports.lineToTextSpan = lineToTextSpan;
var remapDefinitionInfo = function (_a) {
    var definition = _a.definition, dtsText = _a.dtsText, classNameHint = _a.classNameHint, getSnapshotText = _a.getSnapshotText, fileExists = _a.fileExists;
    var candidates = [
        classNameHint,
        definition.name,
        (0, exports.extractClassNameFromDts)(dtsText, definition.textSpan.start),
    ].filter(function (name) { return Boolean(name); });
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var className = candidates_1[_i];
        var location_1 = (0, classLocationCache_1.getClassLocation)(definition.fileName, className);
        if (!location_1 || !fileExists(location_1.fileName))
            continue;
        var targetText = getSnapshotText(location_1.fileName);
        if (targetText == null)
            continue;
        return __assign(__assign({}, definition), { name: className, fileName: location_1.fileName, textSpan: (0, exports.lineToTextSpan)(targetText, location_1.line) });
    }
    return definition;
};
exports.remapDefinitionInfo = remapDefinitionInfo;
