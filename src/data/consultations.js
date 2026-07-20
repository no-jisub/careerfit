export const initialConsultations = [
  {
    id: 'c1', studentId: 's1', date: '2026-07-08', type: '진로 탐색', purpose: '관심 직무 구체화', counselor: '박지현',
    summary: '개발 수업 경험이 있으나 서비스 기획에도 관심이 있음. 프로젝트 경험과 포트폴리오가 부족하다고 느낌.',
    guidance: 'IT 직무 소개 자료를 확인하고, 관심 직무 두 개의 역할과 필요 역량을 비교해 보기로 함.',
    concern: '개발과 서비스 기획 중 어떤 직무가 더 적합할지 판단이 어려움.',
    programs: [], studentActions: 'IT 직무 소개 자료 확인, 관심 직무 두 개 정리', counselorActions: 'UX 직무 체험 프로그램 일정 확인', nextCheckItems: '비교 결과와 프로그램 신청 여부',
  },
  { id: 'c2', studentId: 's2', date: '2026-07-17', type: '취업 준비', purpose: '인턴 지원 준비', counselor: '박지현', summary: '마케팅 프로젝트 경험을 포트폴리오에 배치하는 순서를 논의함.', guidance: '성과를 수치와 행동 중심으로 정리하도록 안내함.', concern: '경험은 있으나 직무 역량과 연결하기 어려움.', programs: ['데이터 분석 프로젝트'], studentActions: '프로젝트 성과 수치 정리', counselorActions: '포트폴리오 예시 전달', nextCheckItems: '초안 피드백' },
  { id: 'c3', studentId: 's3', date: '2026-07-15', type: '면접', purpose: '실무 면접 준비', counselor: '박지현', summary: '브랜딩 프로젝트의 본인 기여도를 중심으로 답변을 구성함.', guidance: 'STAR 방식으로 1분 답변을 준비하도록 안내함.', concern: '긴장하면 답변이 길어짐.', programs: ['모의 면접 집중 과정'], studentActions: '1분 답변 녹화', counselorActions: '예상 질문 전달', nextCheckItems: '답변 길이와 핵심 메시지' },
];
