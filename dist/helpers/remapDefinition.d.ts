import type tsModule from 'typescript/lib/tsserverlibrary';
/**
 * Reads the property name under the cursor for `classes.foo` / `classes['foo']`.
 */
export declare const extractPropertyNameAtPosition: (sourceText: string, position: number) => string | undefined;
export declare const extractClassNameFromDts: (dts: string, start: number) => string | undefined;
export declare const lineToTextSpan: (text: string, line: number) => tsModule.TextSpan;
export declare const remapDefinitionInfo: ({ definition, dtsText, classNameHint, getSnapshotText, fileExists, }: {
    definition: tsModule.DefinitionInfo;
    dtsText: string;
    /** Property name from the click site or definition.name */
    classNameHint?: string | undefined;
    getSnapshotText: (fileName: string) => string | undefined;
    fileExists: (fileName: string) => boolean;
}) => tsModule.DefinitionInfo;
