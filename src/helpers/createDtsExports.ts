import path from 'path';
import fs from 'fs';
import { SourceMapConsumer } from 'source-map-js';
import { CustomTemplate, Options } from '../options';
import { transformClasses } from './classTransforms';
import { CSSExportsWithSourceMap } from './getCssExports';
import { VALID_VARIABLE_REGEXP } from './validVarRegexp';
import { Logger } from './logger';

const isValidVariable = (classname: string) =>
  VALID_VARIABLE_REGEXP.test(classname);

const flattenClassNames = (
  previousValue: string[] = [],
  currentValue: string[],
) => previousValue.concat(currentValue);

export type ClassLocation = {
  fileName: string;
  /** 1-based line in the target file */
  line: number;
};

export type CreateDtsExportsResult = {
  dts: string;
  classLocations: Map<string, ClassLocation>;
};

const resolveSourcePath = (
  source: string | null | undefined,
  fileName: string,
  sourceRoot?: string,
): string | undefined => {
  if (!source) return undefined;

  let resolved = source;
  if (resolved.startsWith('file://')) {
    resolved = resolved.replace(/^file:\/\//, '');
  }

  if (path.isAbsolute(resolved)) {
    return path.normalize(resolved);
  }

  const candidates = [
    path.resolve(path.dirname(fileName), resolved),
    path.resolve(process.cwd(), resolved),
  ];

  if (sourceRoot) {
    candidates.push(path.resolve(sourceRoot, resolved));
  }

  for (const candidate of candidates) {
    const normalized = path.normalize(candidate);
    if (fs.existsSync(normalized)) {
      return normalized;
    }
  }

  return path.normalize(path.resolve(process.cwd(), resolved));
};

const isCurrentSource = (
  source: string | null,
  fileName: string,
  sourceRoot?: string,
): boolean => {
  const resolved = resolveSourcePath(source, fileName, sourceRoot);
  if (!resolved) return false;
  return path.normalize(resolved) === path.normalize(fileName);
};

export const createDtsExports = ({
  cssExports,
  fileName,
  logger,
  options,
}: {
  cssExports: CSSExportsWithSourceMap;
  fileName: string;
  logger: Logger;
  options: Options;
}): CreateDtsExportsResult => {
  const classes = cssExports.classes;
  const classLocations = new Map<string, ClassLocation>();

  const possiblyUndefined = Boolean(options.noUncheckedIndexedAccess);

  const classnameToProperty = (classname: string) =>
    `'${classname}'${possiblyUndefined ? '?' : ''}: string;`;
  const classnameToNamedExport = (classname: string) =>
    `export let ${classname}: string${
      possiblyUndefined ? ' | undefined' : ''
    };`;
  // Interface merging so `classes.foo` (default import) navigates to the
  // line-mapped property instead of a single block at the end of the file.
  const classnameToInterface = (classname: string) =>
    `interface _CSSModules { ${classnameToProperty(classname)} }`;

  const processedClasses = Object.keys(classes)
    .map(transformClasses(options.classnameTransform))
    .reduce(flattenClassNames, []);
  const filteredNamedExports = processedClasses
    .filter(isValidVariable)
    .map(classnameToNamedExport);

  let dts = '';

  if (options.goToDefinition && cssExports.sourceMap) {
    const smc = new SourceMapConsumer(cssExports.sourceMap);
    const cssLines = cssExports.css?.split('\n') ?? [];
    const dtsLines = Array.from(Array(cssLines.length), () => '');
    const sourceRoot = cssExports.sourceMap.sourceRoot;

    const filteredClasses = Object.entries(cssExports.classes)
      .map(([classname, originalClassname]) => [
        // TODO: Improve this. It may return multiple valid classnames and we
        // want to handle all of those.
        transformClasses(options.classnameTransform)(classname)[0],
        originalClassname,
      ])
      .filter(([classname]) => isValidVariable(classname));

    filteredClasses.forEach(([classname, originalClassname]) => {
      let best:
        | {
            line: number;
            originalLine: number;
            source: string | null;
            fromCurrentFile: boolean;
          }
        | undefined;

      for (let i = 0; i < cssLines.length; i++) {
        const matcher = new RegExp(
          // NOTE: This excludes any match not starting with:
          // - `.` for classnames,
          // - `:` or ` ` for animation names,
          // and any matches followed by valid CSS selector characters.
          `[:.\\s]${originalClassname.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          )}(?![_a-zA-Z0-9-])`,
          'g',
        );

        let match: RegExpExecArray | null;
        while ((match = matcher.exec(cssLines[i])) !== null) {
          const position = smc.originalPositionFor({
            line: i + 1,
            column: match.index,
          });

          if (position.line == null) continue;

          const fromCurrentFile = isCurrentSource(
            position.source,
            fileName,
            sourceRoot,
          );
          const candidate = {
            line: i,
            originalLine: position.line,
            source: position.source,
            fromCurrentFile,
          };

          if (
            !best ||
            (fromCurrentFile && !best.fromCurrentFile) ||
            (fromCurrentFile === best.fromCurrentFile && i < best.line)
          ) {
            best = candidate;
          }
        }
      }

      const targetFile =
        resolveSourcePath(best?.source, fileName, sourceRoot) ?? fileName;
      const targetLine = best?.originalLine ?? 1;

      classLocations.set(classname, {
        fileName: targetFile,
        line: targetLine,
      });

      // Only line-map declarations into this file's virtual dts when the
      // class is defined here. Imported classes are remapped at definition time.
      if (best?.fromCurrentFile) {
        const lineIndex = targetLine - 1;
        while (dtsLines.length <= lineIndex) {
          dtsLines.push('');
        }
        dtsLines[lineIndex] +=
          classnameToInterface(classname) + classnameToNamedExport(classname);
      } else {
        // Keep types available on this module; definition remap sends navigation
        // to the declaring file.
        dtsLines[0] +=
          classnameToInterface(classname) + classnameToNamedExport(classname);
      }
    });

    dts = dtsLines.join('\n');

    dts += `\
interface _CSSModules {}
declare let _classes: _CSSModules${
      options.allowUnknownClassnames ? ' & { [key: string]: string }' : ''
    };
export default _classes;
`;
  } else {
    dts += `\
declare let _classes: {
  ${processedClasses.map(classnameToProperty).join('\n  ')}${
    options.allowUnknownClassnames ? '\n  [key: string]: string;' : ''
  }
};
export default _classes;
`;

    if (options.namedExports !== false && filteredNamedExports.length) {
      dts += filteredNamedExports.join('\n') + '\n';
    }
  }

  if (options.customTemplate) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const customTemplate = require(options.customTemplate) as CustomTemplate;
    return {
      dts: customTemplate(dts, {
        classes,
        fileName,
        logger,
      }),
      classLocations,
    };
  }

  return { dts, classLocations };
};
