"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDtsExports = void 0;
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var source_map_js_1 = require("source-map-js");
var classTransforms_1 = require("./classTransforms");
var validVarRegexp_1 = require("./validVarRegexp");
var isValidVariable = function (classname) {
    return validVarRegexp_1.VALID_VARIABLE_REGEXP.test(classname);
};
var flattenClassNames = function (previousValue, currentValue) {
    if (previousValue === void 0) { previousValue = []; }
    return previousValue.concat(currentValue);
};
var resolveSourcePath = function (source, fileName, sourceRoot) {
    if (!source)
        return undefined;
    var resolved = source;
    if (resolved.startsWith('file://')) {
        resolved = resolved.replace(/^file:\/\//, '');
    }
    if (path_1.default.isAbsolute(resolved)) {
        return path_1.default.normalize(resolved);
    }
    var candidates = [
        path_1.default.resolve(path_1.default.dirname(fileName), resolved),
        path_1.default.resolve(process.cwd(), resolved),
    ];
    if (sourceRoot) {
        candidates.push(path_1.default.resolve(sourceRoot, resolved));
    }
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        var normalized = path_1.default.normalize(candidate);
        if (fs_1.default.existsSync(normalized)) {
            return normalized;
        }
    }
    return path_1.default.normalize(path_1.default.resolve(process.cwd(), resolved));
};
var isCurrentSource = function (source, fileName, sourceRoot) {
    var resolved = resolveSourcePath(source, fileName, sourceRoot);
    if (!resolved)
        return false;
    return path_1.default.normalize(resolved) === path_1.default.normalize(fileName);
};
var createDtsExports = function (_a) {
    var _b, _c;
    var cssExports = _a.cssExports, fileName = _a.fileName, logger = _a.logger, options = _a.options;
    var classes = cssExports.classes;
    var classLocations = new Map();
    var possiblyUndefined = Boolean(options.noUncheckedIndexedAccess);
    var classnameToProperty = function (classname) {
        return "'".concat(classname, "'").concat(possiblyUndefined ? '?' : '', ": string;");
    };
    var classnameToNamedExport = function (classname) {
        return "export let ".concat(classname, ": string").concat(possiblyUndefined ? ' | undefined' : '', ";");
    };
    // Interface merging so `classes.foo` (default import) navigates to the
    // line-mapped property instead of a single block at the end of the file.
    var classnameToInterface = function (classname) {
        return "interface _CSSModules { ".concat(classnameToProperty(classname), " }");
    };
    var processedClasses = Object.keys(classes)
        .map((0, classTransforms_1.transformClasses)(options.classnameTransform))
        .reduce(flattenClassNames, []);
    var filteredNamedExports = processedClasses
        .filter(isValidVariable)
        .map(classnameToNamedExport);
    var dts = '';
    if (options.goToDefinition && cssExports.sourceMap) {
        var smc_1 = new source_map_js_1.SourceMapConsumer(cssExports.sourceMap);
        var cssLines_1 = (_c = (_b = cssExports.css) === null || _b === void 0 ? void 0 : _b.split('\n')) !== null && _c !== void 0 ? _c : [];
        var dtsLines_1 = Array.from(Array(cssLines_1.length), function () { return ''; });
        var sourceRoot_1 = cssExports.sourceMap.sourceRoot;
        var filteredClasses = Object.entries(cssExports.classes)
            .map(function (_a) {
            var classname = _a[0], originalClassname = _a[1];
            return [
                // TODO: Improve this. It may return multiple valid classnames and we
                // want to handle all of those.
                (0, classTransforms_1.transformClasses)(options.classnameTransform)(classname)[0],
                originalClassname,
            ];
        })
            .filter(function (_a) {
            var classname = _a[0];
            return isValidVariable(classname);
        });
        filteredClasses.forEach(function (_a) {
            var _b, _c, _d;
            var classname = _a[0], originalClassname = _a[1];
            // composes values look like "local other"; search for the local token.
            var searchName = (_b = originalClassname.split(/\s+/)[0]) !== null && _b !== void 0 ? _b : originalClassname;
            var best;
            for (var i = 0; i < cssLines_1.length; i++) {
                var matcher = new RegExp(
                // NOTE: This excludes any match not starting with:
                // - `.` for classnames,
                // - `:` or ` ` for animation names,
                // and any matches followed by valid CSS selector characters.
                "[:.\\s]".concat(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "(?![_a-zA-Z0-9-])"), 'g');
                var match = void 0;
                while ((match = matcher.exec(cssLines_1[i])) !== null) {
                    var position = smc_1.originalPositionFor({
                        line: i + 1,
                        column: match.index,
                    });
                    if (position.line == null)
                        continue;
                    var fromCurrentFile = isCurrentSource(position.source, fileName, sourceRoot_1);
                    var candidate = {
                        line: i,
                        originalLine: position.line,
                        source: position.source,
                        fromCurrentFile: fromCurrentFile,
                    };
                    if (!best ||
                        (fromCurrentFile && !best.fromCurrentFile) ||
                        (fromCurrentFile === best.fromCurrentFile && i < best.line)) {
                        best = candidate;
                    }
                }
            }
            var targetFile = (_c = resolveSourcePath(best === null || best === void 0 ? void 0 : best.source, fileName, sourceRoot_1)) !== null && _c !== void 0 ? _c : fileName;
            var targetLine = (_d = best === null || best === void 0 ? void 0 : best.originalLine) !== null && _d !== void 0 ? _d : 1;
            classLocations.set(classname, {
                fileName: targetFile,
                line: targetLine,
            });
            // Only line-map declarations into this file's virtual dts when the
            // class is defined here. Imported classes are remapped at definition time.
            if (best === null || best === void 0 ? void 0 : best.fromCurrentFile) {
                var lineIndex = targetLine - 1;
                while (dtsLines_1.length <= lineIndex) {
                    dtsLines_1.push('');
                }
                dtsLines_1[lineIndex] +=
                    classnameToInterface(classname) + classnameToNamedExport(classname);
            }
            else {
                // Keep types available on this module; definition remap sends navigation
                // to the declaring file. Put each on its own trailing line to avoid
                // ambiguous spans when several imports share line 0.
                dtsLines_1.push(classnameToInterface(classname) + classnameToNamedExport(classname));
            }
        });
        dts = dtsLines_1.join('\n');
        dts += "interface _CSSModules {}\ndeclare let _classes: _CSSModules".concat(options.allowUnknownClassnames ? ' & { [key: string]: string }' : '', ";\nexport default _classes;\n");
    }
    else {
        dts += "declare let _classes: {\n  ".concat(processedClasses.map(classnameToProperty).join('\n  ')).concat(options.allowUnknownClassnames ? '\n  [key: string]: string;' : '', "\n};\nexport default _classes;\n");
        if (options.namedExports !== false && filteredNamedExports.length) {
            dts += filteredNamedExports.join('\n') + '\n';
        }
    }
    if (options.customTemplate) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        var customTemplate = require(options.customTemplate);
        return {
            dts: customTemplate(dts, {
                classes: classes,
                fileName: fileName,
                logger: logger,
            }),
            classLocations: classLocations,
        };
    }
    return { dts: dts, classLocations: classLocations };
};
exports.createDtsExports = createDtsExports;
