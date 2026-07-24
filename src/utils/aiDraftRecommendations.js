function extractKoreanKeywords(value) {
  return [...new Set(String(value || '')
    .toLocaleLowerCase('ko-KR')
    .split(/[^0-9a-z가-힣]+/i)
    .map(keyword => keyword.trim().replace(/(에서는|에서|으로|에게|까지|부터|하기로|하고|하며|은|는|이|가|을|를|과|와|의|도|만)$/u, ''))
    .filter(keyword => keyword.length >= 2))];
}

export function recommendProgramNamesFromMemo(rawMemo, programCatalog = [], limit = 1) {
  const memoKeywords = extractKoreanKeywords(rawMemo);
  return programCatalog
    .map((program, index) => {
      const programKeywords = extractKoreanKeywords([program.name, program.type, program.description, ...(program.tags || [])].join(' '));
      const score = memoKeywords.filter(keyword => programKeywords.some(programKeyword => (
        programKeyword === keyword
        || (keyword.length >= 4 && programKeyword.length >= 4 && (programKeyword.includes(keyword) || keyword.includes(programKeyword)))
      ))).length;
      return { program, index, score };
    })
    .filter(item => item.score >= 3)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(item => item.program.name)
    .filter(Boolean);
}
