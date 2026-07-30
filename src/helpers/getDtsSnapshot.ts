import { readFileSync } from 'fs';
import type tsModule from 'typescript/lib/tsserverlibrary';
import { Options } from '../options';
import { getCssExports } from './getCssExports';
import { createDtsExports } from './createDtsExports';
import { setClassLocations } from './classLocationCache';
import { Logger } from './logger';
import Processor from 'postcss/lib/processor';

export const getDtsSnapshot = (
  ts: typeof tsModule,
  processor: Processor,
  fileName: string,
  options: Options,
  logger: Logger,
  compilerOptions: tsModule.CompilerOptions,
  directory: string,
): tsModule.IScriptSnapshot => {
  const css = readFileSync(fileName, 'utf-8');
  const cssExports = getCssExports({
    css,
    fileName,
    logger,
    options,
    processor,
    compilerOptions,
    directory,
  });
  const { dts, classLocations } = createDtsExports({
    cssExports,
    fileName,
    logger,
    options,
  });

  if (options.goToDefinition) {
    setClassLocations(fileName, classLocations);
  }

  return ts.ScriptSnapshot.fromString(dts);
};
