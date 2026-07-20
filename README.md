# 커리어핏(CareerFit)

대학 진로·취업 상담 담당자가 학생의 이전 상담 기록, 미완료 후속 조치, 상담 일지를 한곳에서 관리하는 React 기반 반응형 웹 애플리케이션입니다.

## 실행 방법

```bash
npm install
npm run dev
```

프로덕션 빌드는 다음 명령으로 확인할 수 있습니다.

```bash
npm run build
npm run preview
```

## 주요 페이지 경로

| 경로 | 화면 |
| --- | --- |
| `/login` | 상담 담당자·학생 역할 선택 로그인 |
| `/dashboard` | 상담 담당자 대시보드 |
| `/students` | 학생 검색·필터·목록 |
| `/students/:studentId` | 학생 상담 상세, 상담 타임라인, 후속 조치 |
| `/students/:studentId/consultation/new` | 상담 메모 작성, AI 상담일지 초안 검토·저장 |
| `/consultations` | 전체 상담 기록 |
| `/follow-ups` | 전체 후속 조치 관리 |
| `/programs` | 상담 보조용 비교과 프로그램 추천 |
| `/student` | 학생용 마이페이지 |
| `/settings` | 알림 설정 |

## 구현 기능

- 역할 선택 방식의 데모 로그인과 역할별 메인 화면
- 오늘 상담, 기록 필요, 미완료·기한 초과 후속 조치 대시보드
- 학생 이름·학번·학과 검색과 학년·상담 상태·후속 조치 필터
- 학생 기본 정보, 상담 준비 요약, 접이식 상담 기록 타임라인
- 상담 메모 입력, 임시 저장, 입력 검증, 로딩 상태
- 규칙 기반 AI 상담일지 초안 생성, 재생성, 직접 수정, 검토 후 저장
- 학생 정보 및 프로그램 태그 기반 프로그램 추천과 상담 기록 추가
- 후속 조치 추가, 상태 변경, 완료 처리
- localStorage 기반 상담 기록과 후속 조치 영속 저장
- 토스트 알림, 빈 상태, 모바일 드로어 메뉴
- 학생용 상담 일정, 다음 행동 완료, 추천 프로그램 화면

## 코드 구조

```text
src/
├─ components/           # 레이아웃, 아이콘, 공통 UI
├─ data/                 # 학생·상담·후속 조치·프로그램 mock 데이터
├─ pages/                # 화면 단위 컴포넌트
├─ services/             # 규칙 기반 AI 초안 생성 로직
├─ styles/               # 전역 디자인 토큰과 반응형 CSS
├─ App.jsx               # 라우팅, 전역 상태, localStorage 연결
└─ main.jsx              # React 진입점
```

Mock 데이터는 `src/data/`에 있고, AI 생성 로직은 `src/services/consultationAiService.js`에 있습니다. 추후 백엔드는 `App.jsx`의 localStorage 상태 변경 부분을 API 호출로 교체해 연결할 수 있습니다. 실제 AI API는 `generateConsultationDraft()`와 동일한 반환 구조를 유지하는 API 서비스로 교체하면 됩니다.

## 디자인 시스템

`duolingo-DESIGN.md`의 밝고 친근한 표면, 8px 간격 리듬, 12px 버튼 라운드, 선명한 주요 액션과 눌림 상태를 참고했습니다. 대학 행정 서비스의 신뢰감을 위해 네이비·블루를 중심 색으로 재해석하고, 완료·진행·예정·기한 초과·AI 상태는 아이콘과 텍스트를 함께 표시합니다.

## 접근성

- `header`, `nav`, `main`, `section`, `article`, `aside` 등 시맨틱 구조
- 모든 폼 입력의 연결된 레이블과 오류 안내
- 아이콘 버튼의 접근 가능한 이름
- 키보드 포커스 스타일과 자연스러운 탭 순서
- 상태를 색상뿐 아니라 아이콘과 텍스트로 함께 표현
- 펼침 상태의 `aria-expanded`, 토스트의 `aria-live`
- 모달의 `role="dialog"`, `aria-modal`, 최초 입력 자동 포커스
- 모션 감소 설정(`prefers-reduced-motion`) 대응

## 반응형 레이아웃

- 데스크톱: 고정 사이드바, 상단 헤더, 다열 대시보드와 테이블
- 태블릿: 드로어 메뉴, 단일 메인 열, 보조 정보 재배치
- 모바일(390px): 학생 테이블을 카드 목록으로 전환, 폼·상세를 한 열로 전환, 하단 저장 바, 전체 너비 주요 버튼, 모바일 메뉴

## 데이터 안내

이 프로젝트의 학생·상담·프로그램 정보는 모두 가상 데이터입니다. 브라우저 localStorage의 `careerfit_students`, `careerfit_consultations`, `careerfit_followups` 키에 데모 상태가 저장됩니다. 실제 학교 포털, 개인정보, 예약 시스템, 프로그램 신청, 외부 AI API와는 연동되지 않습니다.
