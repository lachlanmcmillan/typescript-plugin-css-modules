import path from 'path';
import type { ClassLocation } from './createDtsExports';

const cache = new Map<string, Map<string, ClassLocation>>();

const normalize = (fileName: string) =>
  path.normalize(fileName).replace(/\\/g, '/');

export const setClassLocations = (
  fileName: string,
  classLocations: Map<string, ClassLocation>,
): void => {
  cache.set(normalize(fileName), classLocations);
};

export const getClassLocations = (
  fileName: string,
): Map<string, ClassLocation> | undefined => cache.get(normalize(fileName));

export const getClassLocation = (
  fileName: string,
  className: string,
): ClassLocation | undefined => getClassLocations(fileName)?.get(className);
