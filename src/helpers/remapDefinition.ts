import type tsModule from 'typescript/lib/tsserverlibrary';
import { getClassLocation } from './classLocationCache';

const CLASS_NAME_IN_DTS =
  /(?:interface _CSSModules \{\s*'([^']+)'|export let ([A-Za-z_$][\w$]*))/;

export const extractClassNameFromDts = (
  dts: string,
  start: number,
): string | undefined => {
  // Search a window around the span for an interface property or named export.
  const from = Math.max(0, start - 80);
  const to = Math.min(dts.length, start + 120);
  const slice = dts.slice(from, to);
  const match = CLASS_NAME_IN_DTS.exec(slice);
  return match?.[1] ?? match?.[2];
};

export const lineToTextSpan = (
  text: string,
  /** 1-based */
  line: number,
): tsModule.TextSpan => {
  const lines = text.split('\n');
  const index = Math.max(0, Math.min(line - 1, lines.length - 1));
  let start = 0;
  for (let i = 0; i < index; i++) {
    start += lines[i].length + 1;
  }
  return { start, length: lines[index]?.length ?? 0 };
};

export const remapDefinitionInfo = ({
  definition,
  dtsText,
  getSnapshotText,
  fileExists,
}: {
  definition: tsModule.DefinitionInfo;
  dtsText: string;
  getSnapshotText: (fileName: string) => string | undefined;
  fileExists: (fileName: string) => boolean;
}): tsModule.DefinitionInfo => {
  const className = extractClassNameFromDts(dtsText, definition.textSpan.start);
  if (!className) return definition;

  const location = getClassLocation(definition.fileName, className);
  if (!location || !fileExists(location.fileName)) return definition;

  const targetText = getSnapshotText(location.fileName);
  if (targetText == null) return definition;

  return {
    ...definition,
    fileName: location.fileName,
    textSpan: lineToTextSpan(targetText, location.line),
  };
};
