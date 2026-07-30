import { readFileSync } from 'fs';
import { join } from 'path';
import type tsModule from 'typescript/lib/tsserverlibrary';
import { createDtsExports } from '../createDtsExports';
import { getCssExports } from '../getCssExports';
import { getProcessor } from '../getProcessor';
import { setClassLocations } from '../classLocationCache';
import {
  extractPropertyNameAtPosition,
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

  it('reads the clicked property name from source', () => {
    const source = `const x = classes.class2;\nconst y = classes['class1'];\n`;
    expect(
      extractPropertyNameAtPosition(source, source.indexOf('class2') + 2),
    ).toBe('class2');
    expect(
      extractPropertyNameAtPosition(source, source.indexOf("'class1'") + 3),
    ).toBe('class1');
  });

  it('remaps using the clicked class even if the dts span points at another class', () => {
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

    // Simulate TS pointing at class2 in the virtual dts while the user clicked class1.
    const class2Index = dts.indexOf("'class2'");
    expect(class2Index).toBeGreaterThan(-1);

    const definition = {
      fileName: fileB,
      textSpan: { start: class2Index, length: 8 },
      kind: 'const' as tsModule.ScriptElementKind,
      name: 'class2',
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
      classNameHint: 'class1',
      getSnapshotText: (name) => snapshots[name],
      fileExists: (name) => name in snapshots,
    });

    expect(remapped.fileName).toBe(fileA);
    expect(remapped.name).toBe('class1');
    expect(remapped.textSpan).toEqual(lineToTextSpan(snapshots[fileA], 1));
  });
});
