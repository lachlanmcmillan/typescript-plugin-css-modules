"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassLocation = exports.getClassLocations = exports.setClassLocations = void 0;
var path_1 = __importDefault(require("path"));
var cache = new Map();
var normalize = function (fileName) {
    return path_1.default.normalize(fileName).replace(/\\/g, '/');
};
var setClassLocations = function (fileName, classLocations) {
    cache.set(normalize(fileName), classLocations);
};
exports.setClassLocations = setClassLocations;
var getClassLocations = function (fileName) { return cache.get(normalize(fileName)); };
exports.getClassLocations = getClassLocations;
var getClassLocation = function (fileName, className) { var _a; return (_a = (0, exports.getClassLocations)(fileName)) === null || _a === void 0 ? void 0 : _a.get(className); };
exports.getClassLocation = getClassLocation;
