function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Only unwrap `addEventListener('DOMContentLoaded', function () { ... })`, not named handlers. */
function unwrapAnonymousDomContentLoaded(code: string): string {
  const patterns = [
    /document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\([^)]*\)\s*\{/g,
    /document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\s*\)\s*\{/g,
  ];

  let result = code;
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(result);
      if (!match || match.index === undefined) continue;

      const braceStart = match.index + match[0].length - 1;
      const braceEnd = findMatchingBrace(result, braceStart);
      if (braceEnd === -1) continue;

      const inner = result.slice(braceStart + 1, braceEnd);
      let end = braceEnd + 1;
      if (result[end] === ')') end += 1;
      if (result[end] === ';') end += 1;
      result = result.slice(0, match.index) + inner + result.slice(end);
      changed = true;
      break;
    }
  }

  return result;
}

/** Production scripts set inline styles on html/body and break React hydration. */
function stripKillTopGap(code: string): string {
  return code.replace(
    /\(function\s*\(\s*\)\s*\{\s*function\s+killTopGap\s*\(\s*\)[\s\S]*?\}\)\s*\(\s*\)\s*;?/g,
    '',
  );
}

function extractInitBody(source: string): string {
  const match = source.match(
    /\(function\s+runWhenReady\s*\(\s*\)\s*\{\s*function\s+init\s*\(\s*\)\s*\{([\s\S]*)\}\s*if\s*\(\s*document\.readyState/,
  );
  return match ? match[1] : source;
}

export function preparePageScript(source: string): string {
  let code = extractInitBody(source.trim());
  code = unwrapAnonymousDomContentLoaded(code);
  code = stripKillTopGap(code);
  return code.trim();
}
