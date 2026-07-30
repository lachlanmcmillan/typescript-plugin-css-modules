import { Options } from '../options';
import { CSSExportsWithSourceMap } from './getCssExports';
import { Logger } from './logger';
export type ClassLocation = {
    fileName: string;
    /** 1-based line in the target file */
    line: number;
};
export type CreateDtsExportsResult = {
    dts: string;
    classLocations: Map<string, ClassLocation>;
};
export declare const createDtsExports: ({ cssExports, fileName, logger, options, }: {
    cssExports: CSSExportsWithSourceMap;
    fileName: string;
    logger: Logger;
    options: Options;
}) => CreateDtsExportsResult;
