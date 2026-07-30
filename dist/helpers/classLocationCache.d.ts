import type { ClassLocation } from './createDtsExports';
export declare const setClassLocations: (fileName: string, classLocations: Map<string, ClassLocation>) => void;
export declare const getClassLocations: (fileName: string) => Map<string, ClassLocation> | undefined;
export declare const getClassLocation: (fileName: string, className: string) => ClassLocation | undefined;
