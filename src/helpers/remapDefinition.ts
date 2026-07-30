import type tsModule from 'typescript/lib/tsserverlibrary';
import { getClassLocation } from './classLocationCache';

const CLASS_NAME_IN_DTS =
  /(?:interface _CSSModules \{\s*'([^']+)'|export let ([A-Za-z_$][\w$]*))/;

const isIdentChar = (char: string) => /[A-Za-z0-9_$]/.test(char);

/**
 * Reads the property name under the cursor for `classes.foo` / `classes['foo']`.
 */
export const extractPropertyNameAtPosition = (
  sourceText: string,
  position: number,
): string | undefined => {
  if (position < 0 || position > sourceText.length) return undefined;

  // Quoted access: classes['foo'] or classes["foo"]
  const around = sourceText.slice(
    Math.max(0, position - 80),
    Math.min(sourceText.length, position + 80),
  );
  const relative = Math.min(position, 80);
  const quoted = /\[\s*(['"])([^'"]+)\1\s*\]/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(around)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (relative >= start && relative <= end) {
      return match[2];
    }
  }

  // Dot access: classes.foo
  let start = position;
  let end = position;
  while (start > 0 && isIdentChar(sourceText[start - 1] ?? '')) start -= 1;
  while (end < sourceText.length && isIdentChar(sourceText[end] ?? '')) end += 1;

  if (start === end) return undefined;

  const name = sourceText.slice(start, end);
  if (start > 0 && sourceText[start - 1] === '.') {
    return name;
  }

  return undefined;
};

export const extractClassNameFromDts = (
  dts: string,
  start: number,
): string | undefined => {
  // Prefer an exact match covering the span start, not the first match in a
  // large window (multiple declarations can share one virtual line).
  const lineStart = dts.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEnd = dts.indexOf('\n', start);
  const line = dts.slice(lineStart, lineEnd === -1 ? dts.length : lineEnd);

  const global = new RegExp(CLASS_NAME_IN_DTS.source, 'g');
  let best: { name: string; distance: number } | undefined;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = global.exec(line)) !== null) {
    const name = lineMatch[1] ?? lineMatch[2];
    if (!name) continue;
    const absolute = lineStart + lineMatch.index;
    const distance = Math.abs(absolute - start);
    if (!best || distance < best.distance) {
      best = { name, distance };
    }
  }

  return best?.name;
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
  classNameHint,
  getSnapshotText,
  fileExists,
}: {
  definition: tsModule.DefinitionInfo;
  dtsText: string;
  /** Property name from the click site or definition.name */
  classNameHint?: string;
  getSnapshotText: (fileName: string) => string | undefined;
  fileExists: (fileName: string) => boolean;
}): tsModule.DefinitionInfo => {
  const candidates = [
    classNameHint,
    definition.name,
    extractClassNameFromDts(dtsText, definition.textSpan.start),
  ].filter((name): name is string => Boolean(name));

  for (const className of candidates) {
    const location = getClassLocation(definition.fileName, className);
    if (!location || !fileExists(location.fileName)) continue;

    const targetText = getSnapshotText(location.fileName);
    if (targetText == null) continue;

    return {
      ...definition,
      name: className,
      fileName: location.fileName,
      textSpan: lineToTextSpan(targetText, location.line),
    };
  }

  return definition;
};
