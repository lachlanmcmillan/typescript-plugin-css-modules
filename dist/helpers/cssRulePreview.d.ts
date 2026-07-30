/**
 * Extracts the CSS rule starting at a 1-based line (brace-matched).
 */
export declare const extractCssRuleAtLine: (css: string, line: number) => string;
export declare const readCssRuleAtLocation: (fileName: string, line: number) => string | undefined;
