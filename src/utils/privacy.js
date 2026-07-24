const patterns = [
  { type: 'residentId', label: '주민등록번호 형식', pattern: /\b\d{6}\s*[- ]?\s*[1-4]\d{6}\b/g },
  { type: 'email', label: '이메일 형식', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: 'phone', label: '전화번호 형식', pattern: /\b01[016789]\s*[-.) ]?\s*\d{3,4}\s*[-. ]?\s*\d{4}\b/g },
];

export function detectDirectIdentifiers(value = '') {
  const text = String(value);
  const findings = patterns.map(item => ({
    type: item.type,
    label: item.label,
    count: (text.match(item.pattern) || []).length,
  })).filter(item => item.count > 0);

  return {
    findings,
    total: findings.reduce((sum, item) => sum + item.count, 0),
    needsMasking: findings.length > 0,
  };
}
