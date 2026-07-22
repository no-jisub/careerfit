export const PROGRAM_STORE_VERSION = 1;
export const PROGRAM_RECOMMENDATION_STORE_VERSION = 1;

export const PROGRAM_TYPES = ['진로 탐색', '직무 역량', '취업 준비', '프로젝트', '창업'];
export const PROGRAM_MODES = ['온라인', '오프라인', '혼합'];
export const PROGRAM_STATUSES = ['draft', 'scheduled', 'recruiting', 'closed', 'completed', 'archived'];

export const PROGRAM_STATUS_LABELS = {
  draft: '작성 중',
  scheduled: '모집 예정',
  recruiting: '모집 중',
  closed: '모집 마감',
  completed: '운영 종료',
  archived: '보관됨',
};

const asDateKey = value => String(value || '').slice(0, 10);

export function formatProgramDate(value) {
  const dateKey = asDateKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return '-';
  return `${dateKey.slice(5, 7)}.${dateKey.slice(8, 10)}`;
}

export function formatProgramDateRange(start, end) {
  if (!start && !end) return '-';
  if (!end || start === end) return formatProgramDate(start || end);
  return `${formatProgramDate(start)}–${formatProgramDate(end)}`;
}

export function resolveProgramStatus(program, today = new Date().toISOString().slice(0, 10)) {
  if (program.archived || program.status === 'archived') return 'archived';
  if (program.status === 'draft') return 'draft';
  const current = asDateKey(today);
  const recruitStart = asDateKey(program.recruitmentStartDate);
  const recruitEnd = asDateKey(program.recruitmentEndDate);
  const programEnd = asDateKey(program.programEndDate);
  if (recruitStart && current < recruitStart) return 'scheduled';
  if (recruitEnd && current <= recruitEnd) return 'recruiting';
  if (programEnd && current > programEnd) return 'completed';
  if (recruitEnd && current > recruitEnd) return 'closed';
  return PROGRAM_STATUSES.includes(program.status) ? program.status : 'scheduled';
}

export function normalizeProgram(program, index = 0) {
  const now = new Date().toISOString();
  const normalized = {
    id: program.id || `program-${Date.now()}-${index}`,
    name: String(program.name || '').trim(),
    type: PROGRAM_TYPES.includes(program.type) ? program.type : PROGRAM_TYPES[0],
    description: String(program.description || program.reason || '').trim(),
    reason: String(program.reason || program.description || '').trim(),
    tags: Array.isArray(program.tags) ? [...new Set(program.tags.map(String).map(value => value.trim()).filter(Boolean))] : [],
    grades: Array.isArray(program.grades) ? [...new Set(program.grades.map(String).filter(Boolean))] : [],
    targetDepartments: Array.isArray(program.targetDepartments) ? [...new Set(program.targetDepartments.map(String).filter(Boolean))] : [],
    target: String(program.target || '').trim(),
    recruitmentStartDate: asDateKey(program.recruitmentStartDate),
    recruitmentEndDate: asDateKey(program.recruitmentEndDate),
    programStartDate: asDateKey(program.programStartDate),
    programEndDate: asDateKey(program.programEndDate),
    schedule: String(program.schedule || '').trim(),
    mode: PROGRAM_MODES.includes(program.mode) ? program.mode : PROGRAM_MODES[0],
    department: String(program.department || '').trim(),
    capacity: Math.max(0, Number(program.capacity) || 0),
    location: String(program.location || '').trim(),
    applicationUrl: String(program.applicationUrl || '').trim(),
    contact: String(program.contact || '').trim(),
    status: PROGRAM_STATUSES.includes(program.status) ? program.status : 'scheduled',
    featured: Boolean(program.featured),
    archived: Boolean(program.archived),
    score: Math.max(0, Math.min(100, Number(program.score) || 0)),
    createdAt: program.createdAt || now,
    updatedAt: program.updatedAt || program.updated || now,
  };
  return {
    ...normalized,
    recruit: formatProgramDateRange(normalized.recruitmentStartDate, normalized.recruitmentEndDate),
    period: formatProgramDateRange(normalized.programStartDate, normalized.programEndDate),
    updated: asDateKey(normalized.updatedAt),
  };
}

export function validateProgram(program) {
  const errors = {};
  if (!program.name?.trim()) errors.name = '프로그램명을 입력해 주세요.';
  if (!program.department?.trim()) errors.department = '담당 부서를 입력해 주세요.';
  if (!program.description?.trim()) errors.description = '프로그램 설명을 입력해 주세요.';
  if (!program.grades?.length) errors.grades = '참여 대상 학년을 하나 이상 선택해 주세요.';
  if (!program.recruitmentStartDate || !program.recruitmentEndDate) errors.recruitmentDates = '모집 기간을 입력해 주세요.';
  else if (program.recruitmentStartDate > program.recruitmentEndDate) errors.recruitmentDates = '모집 종료일은 시작일보다 빠를 수 없습니다.';
  if (!program.programStartDate || !program.programEndDate) errors.programDates = '운영 기간을 입력해 주세요.';
  else if (program.programStartDate > program.programEndDate) errors.programDates = '운영 종료일은 시작일보다 빠를 수 없습니다.';
  if (program.applicationUrl) {
    try {
      const url = new URL(program.applicationUrl);
      if (!['http:', 'https:'].includes(url.protocol)) errors.applicationUrl = 'http 또는 https 주소를 입력해 주세요.';
    } catch { errors.applicationUrl = '올바른 신청 링크를 입력해 주세요.'; }
  }
  return errors;
}

export function createProgramStore(programList) {
  return {
    version: PROGRAM_STORE_VERSION,
    programs: programList.map(normalizeProgram),
    updatedAt: new Date().toISOString(),
  };
}

export function restoreProgramStore(value, fallbackPrograms) {
  if (!value || value.version !== PROGRAM_STORE_VERSION || !Array.isArray(value.programs)) {
    return fallbackPrograms.map(normalizeProgram);
  }
  return value.programs.map(normalizeProgram);
}

export function createProgramRecommendationStore(recommendations) {
  return {
    version: PROGRAM_RECOMMENDATION_STORE_VERSION,
    recommendations,
    updatedAt: new Date().toISOString(),
  };
}

export function restoreProgramRecommendationStore(value, fallbackRecommendations) {
  if (!value || value.version !== PROGRAM_RECOMMENDATION_STORE_VERSION || !Array.isArray(value.recommendations)) {
    return fallbackRecommendations;
  }
  return value.recommendations.filter(item => item?.id && item?.studentId && item?.programId);
}
