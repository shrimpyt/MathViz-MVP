import katex from 'katex';

// A mock parseMath function since it wasn't provided but referenced in the context
export function parseMath(eq: string): string {
  // Simple parser: trims and ensures it's a string, maybe handle some basic replacements
  return eq.trim();
}

export function renderEquation(eq: string) {
  // Parse equation logic here
  const parsed = parseMath(eq);

  try {
    // Implement basic math rendering using KaTeX
    const rendered = katex.renderToString(parsed, {
      throwOnError: false, // Prevents throwing errors for invalid LaTeX
      displayMode: false   // Default to inline mode
    });

    return `<div>${rendered}</div>`;
  } catch (error) {
    // Fallback if rendering fails completely
    return `<div>${parsed}</div>`;
  }
}
