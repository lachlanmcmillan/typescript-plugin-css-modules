import { readFileSync } from 'fs';
import { join } from 'path';
import type tsModule from 'typescript/lib/tsserverlibrary';
import { createDtsExports } from '../createDtsExports';
import { getCssExports } from '../getCssExports';
import { getProcessor } from '../getProcessor';
import { setClassLocations } from '../classLocationCache';
import {
  extractClassNameFromDts,
  lineToTextSpan,
  remapDefinitionInfo,
} from '../remapDefinition';
import { Logger } from '../logger';
import { Options } from '../../options';

const logger: Logger = {
  log: jest.fn(),
  error: jest.fn(),
};

const processor = getProcessor();

describe('helpers / goToDefinition locations', () => {
  const fileA = join(__dirname, 'fixtures', 'fileA.module.css');
  const fileB = join(__dirname, 'fixtures', 'fileB.module.css');
  const options: Options = { goToDefinition: true };

  it('maps imported classes to the declaring file and local classes to the importer', () => {
    const css = readFileSync(fileB, 'utf8');
    const cssExports = getCssExports({
      css,
      fileName: fileB,
      logger,
      options,
      processor,
      compilerOptions: {},
      directory: __dirname,
    });

    const { classLocations } = createDtsExports({
      cssExports,
      fileName: fileB,
      logger,
      options,
    });

    expect(classLocations.get('class1')).toEqual({
      fileName: fileA,
      line: 1,
    });
    expect(classLocations.get('class2')).toEqual({
      fileName: fileB,
      line: 3,
    });
  });

  it('remaps a definition into the declaring CSS module file', () => {
    const css = readFileSync(fileB, 'utf8');
    const cssExports = getCssExports({
      css,
      fileName: fileB,
      logger,
      options,
      processor,
      compilerOptions: {},
      directory: __dirname,
    });

    const { dts, classLocations } = createDtsExports({
      cssExports,
      fileName: fileB,
      logger,
      options,
    });
    setClassLocations(fileB, classLocations);

    const class1Index = dts.indexOf("'class1'");
    expect(class1Index).toBeGreaterThan(-1);
    expect(extractClassNameFromDts(dts, class1Index)).toBe('class1');

    const definition = {
      fileName: fileB,
      textSpan: { start: class1Index, length: 8 },
      kind: 'const' as tsModule.ScriptElementKind,
      name: 'class1',
      containerKind: '' as tsModule.ScriptElementKind,
      containerName: '',
    };

    const snapshots: Record<string, string> = {
      [fileB]: dts,
      [fileA]: readFileSync(fileA, 'utf8'),
    };

    const remapped = remapDefinitionInfo({
      definition,
      dtsText: dts,
      getSnapshotText: (name) => snapshots[name],
      fileExists: (name) => name in snapshots,
    });

    expect(remapped.fileName).toBe(fileA);
    expect(remapped.textSpan).toEqual(lineToTextSpan(snapshots[fileA], 1));
  });
});
