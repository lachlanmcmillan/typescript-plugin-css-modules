import { extractCssRuleAtLine } from '../cssRulePreview';

describe('helpers / cssRulePreview', () => {
  it('extracts a multi-line rule from the starting line', () => {
    const css = `.before {
  color: red;
}

.reportSection {
  display: flex;
  gap: 8px;
}

.after {
  color: blue;
}
`;

    expect(extractCssRuleAtLine(css, 5)).toBe(`.reportSection {
  display: flex;
  gap: 8px;
}`);
  });

  it('extracts a single-line rule', () => {
    expect(extractCssRuleAtLine('.only { color: red; }\n', 1)).toBe(
      '.only { color: red; }',
    );
  });
});
