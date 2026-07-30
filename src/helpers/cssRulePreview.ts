import fs from 'fs';

/**
 * Extracts the CSS rule starting at a 1-based line (brace-matched).
 */
export const extractCssRuleAtLine = (css: string, line: number): string => {
  const lines = css.split('\n');
  if (lines.length === 0) return '';

  const startIdx = Math.max(0, Math.min(line - 1, lines.length - 1));
  let depth = 0;
  let started = false;
  const out: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const current = lines[i] ?? '';
    out.push(current);

    for (const char of current) {
      if (char === '{') {
        depth += 1;
        started = true;
      } else if (char === '}') {
        depth -= 1;
      }
    }

    if (started && depth <= 0) {
      break;
    }

    // Selector-only / at-rule without `{` yet: keep a small look-ahead.
    if (!started && i - startIdx > 15) {
      break;
    }
  }

  return out.join('\n').replace(/\s+$/u, '');
};

export const readCssRuleAtLocation = (
  fileName: string,
  line: number,
): string | undefined => {
  if (!fs.existsSync(fileName)) return undefined;
  const css = fs.readFileSync(fileName, 'utf8');
  const rule = extractCssRuleAtLine(css, line);
  return rule || undefined;
};
