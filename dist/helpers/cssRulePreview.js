"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCssRuleAtLocation = exports.extractCssRuleAtLine = void 0;
var fs_1 = __importDefault(require("fs"));
/**
 * Extracts the CSS rule starting at a 1-based line (brace-matched).
 */
var extractCssRuleAtLine = function (css, line) {
    var _a;
    var lines = css.split('\n');
    if (lines.length === 0)
        return '';
    var startIdx = Math.max(0, Math.min(line - 1, lines.length - 1));
    var depth = 0;
    var started = false;
    var out = [];
    for (var i = startIdx; i < lines.length; i++) {
        var current = (_a = lines[i]) !== null && _a !== void 0 ? _a : '';
        out.push(current);
        for (var _i = 0, current_1 = current; _i < current_1.length; _i++) {
            var char = current_1[_i];
            if (char === '{') {
                depth += 1;
                started = true;
            }
            else if (char === '}') {
                depth -= 1;
            }
        }
        if (started && depth <= 0) {
            break;
        }
        // Selector-only / at-rule without `{` yet: keep a small look-ahead.
        if (!started && i - startIdx > 15) {
            break;
        }
    }
    return out.join('\n').replace(/\s+$/u, '');
};
exports.extractCssRuleAtLine = extractCssRuleAtLine;
var readCssRuleAtLocation = function (fileName, line) {
    if (!fs_1.default.existsSync(fileName))
        return undefined;
    var css = fs_1.default.readFileSync(fileName, 'utf8');
    var rule = (0, exports.extractCssRuleAtLine)(css, line);
    return rule || undefined;
};
exports.readCssRuleAtLocation = readCssRuleAtLocation;
