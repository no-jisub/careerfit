function normalizeKeyword(value) {
  return String(value || '').toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}

function countInterestMatches(program, student) {
  const interests = (student?.interests || []).map(normalizeKeyword).filter(Boolean);
  return (program.tags || []).filter(tag => {
    const normalizedTag = normalizeKeyword(tag);
    return interests.some(interest => interest.includes(normalizedTag) || normalizedTag.includes(interest));
  }).length;
}

export function recommendPrograms(programList, student, limit = 2) {
  return programList
    .map((program, index) => ({
      program,
      index,
      interestMatches: countInterestMatches(program, student),
      gradeMatch: (program.grades || []).includes(student?.grade) ? 1 : 0,
    }))
    .sort((a, b) => (
      b.interestMatches - a.interestMatches
      || b.gradeMatch - a.gradeMatch
      || (b.program.score || 0) - (a.program.score || 0)
      || a.index - b.index
    ))
    .slice(0, Math.max(0, limit))
    .map(item => item.program);
}
