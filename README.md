# 커리어핏(CareerFit)

대학 진로·취업 상담 담당자가 학생 정보, 상담 기록, 후속 조치와 비교과 프로그램을 한곳에서 관리하고, 학생은 자신의 상담 일정과 다음 행동을 확인할 수 있도록 만든 반응형 웹 애플리케이션입니다.

이 문서는 사람 또는 다른 AI가 프로젝트를 바로 이어서 개발·운영할 수 있도록 현재 구조와 배포 상태를 설명하는 인수인계 문서입니다.

> 최종 문서 갱신일: 2026-07-22

## 현재 운영 상태

| 항목 | 현재 값 |
| --- | --- |
| GitHub 저장소 | <https://github.com/no-jisub/careerfit> |
| 기본 브랜치 | `main` |
| 운영 사이트 | <https://careerfit-aiboost-a601a.web.app/> |
| Firebase 프로젝트 ID | `careerfit-aiboost-a601a` |
| Google Cloud 프로젝트 번호 | `540520328208` |
| 운영 Hosting 사이트 | `careerfit-aiboost-a601a` |
| 배포 방식 | GitHub Actions → Firebase Hosting |
| 배포 트리거 | `main` push/PR merge 또는 수동 실행 |
| 현재 운영 모드 | 임시 공개 데모 모드(로그인 없음) |
| Firebase Authentication | 구현 완료, 공개 데모 배포에서는 일시 비활성화 |
| Cloud Firestore 동기화 | 구현 완료, 공개 데모 배포에서는 일시 비활성화 |
| 외부 AI API | 연동하지 않음 |

### 반드시 알아둘 현재 상태

- Firebase Hosting 배포와 GitHub Actions 자동 배포는 정상적으로 연결되어 있습니다.
- 실제 사용자를 받기 전까지 GitHub Actions는 `VITE_FIREBASE_AUTH_ENABLED=false`, `VITE_FIRESTORE_SYNC_ENABLED=false`, `VITE_DEMO_MODE_ENABLED=true`로 공개 데모 빌드를 생성합니다.
- 운영 사이트에서는 로그인 없이 상담 담당자·학생 역할을 선택할 수 있습니다. 상담 담당자 화면에 사용자 등록과 학생 배정 등 운영 관리 기능이 포함됩니다.
- 공개 데모에서 생성한 데이터는 해당 브라우저의 `localStorage`에만 저장되며 Cloud Firestore 운영 데이터와 연결되지 않습니다.
- Firebase 웹 설정은 빌드에 포함되는 공개 클라이언트 설정입니다. 반면 서비스 계정 키, 비밀번호, 서버 토큰은 절대 `VITE_` 변수나 Git에 저장하면 안 됩니다.
- GitHub Pages 배포는 제거되었습니다. Vite의 `base`는 Firebase 루트 배포를 위해 반드시 `/`를 유지해야 합니다.
- `.openai/hosting.json`, `sites` Git remote와 `scripts/prepare-sites.mjs`는 보조 Sites 호환용입니다. 현재 공식 운영 배포 대상은 Firebase Hosting입니다.

## 주요 사용자와 기능

### 상담 담당자(`counselor`)

- 오늘 상담, 기록 필요 상담과 기한 초과 후속 조치 대시보드
- 학생 이름·학번·학과 검색 및 학년·상태·후속 조치 필터
- 학생 기본 정보, 상담 준비 요약과 상담 기록 타임라인 확인
- 상담 메모 작성, 임시 저장, 상담 기록 저장
- 규칙 기반 상담일지 초안 생성 및 직접 수정
- 학생/교직원 담당 후속 조치 추가와 상태 관리
- 학생 관심 분야에 맞춘 비교과 프로그램 추천
- 비교과 프로그램 등록·수정·복제·보관과 모집 상태 관리
- 학생별 프로그램 직접 추천과 추천 사유·학생 반응 확인
- 상담사·학생 계정 등록과 학생별 담당 상담사 배정
- 전체 상담 일정·기록·후속 조치·운영 통계 확인
- 계정별 비밀번호 재설정 메일 발송

### 학생(`student`)

- 다음 상담 일정과 최근 상담 요약 확인
- 본인에게 배정된 후속 조치 확인 및 완료 처리
- 추천 비교과 프로그램 확인
- 프로그램 검색·태그·운영 방식·모집 상태 필터
- 상담사 추천 프로그램에 관심 있음·신청 완료·참여하지 않음 표시

### 호환용 관리자(`admin`)

- 기존 관리자 계정은 계속 사용할 수 있으며 상담 담당자와 동일한 운영 권한을 가집니다.
- 공개 데모에서는 별도 관리자 시작 버튼을 제공하지 않습니다.

### 공통 운영 기능

- 학생·학번·상담 내용 통합 검색과 목록별 필터
- 오늘 일정, 마감 임박, 기한 초과 알림 센터와 읽음 처리
- 기간별 상담 실적, 후속 조치 완료율, 예약 완료율 통계
- 입력값 정규화·형식 검증과 전역 오류 복구 화면

## 기술 스택

| 영역 | 기술/버전 | 용도 |
| --- | --- | --- |
| UI | React `19.2.7` | 컴포넌트 기반 화면 |
| 렌더링 | React DOM `19.2.7` | 브라우저 렌더링 |
| 라우팅 | React Router DOM `7.18.1` | Hash Router 기반 SPA 라우팅 |
| 빌드 | Vite `8.1.5` | 개발 서버와 프로덕션 번들 |
| React 플러그인 | `@vitejs/plugin-react` `6.0.3` | Vite React 변환 |
| Firebase SDK | Firebase JS SDK `12.16.0` | Auth, Firestore 클라이언트 |
| Firebase CLI | `firebase-tools` `15.24.0` | Hosting·규칙·에뮬레이터 운영 |
| 런타임 | Node.js `22` | 로컬 및 GitHub Actions 빌드 |
| 배포 | Firebase Hosting | 정적 SPA 운영 |
| CI/CD | GitHub Actions | PR 기능 검증, `main` 검증 후 자동 배포 |
| CI 인증 | Google Workload Identity Federation | 서비스 계정 JSON 키 없는 단기 OIDC 인증 |

Node 단위 테스트와 Firebase Emulator 통합·권한 테스트가 CI에서 실행됩니다. 컴포넌트 상호작용 테스트, 린터와 포매터는 추가 도입이 필요합니다.

## 애플리케이션 구조

```text
src/
├─ auth/                 # Firebase 인증 상태와 역할 관리
├─ components/           # 레이아웃, 아이콘과 공통 UI
├─ data/                 # 학생·상담·후속 조치·프로그램 데모 데이터
├─ lib/                  # Firebase 앱/Auth/Firestore 초기화
├─ pages/                # 화면 단위 React 컴포넌트
├─ services/             # Firestore 데이터 서비스와 상담 초안 생성 로직
├─ styles/               # 전역 디자인·반응형 CSS
├─ utils/                # 날짜 등 공통 유틸리티
├─ App.jsx               # 라우팅, 전역 상태와 저장 계층 연결
└─ main.jsx              # React 진입점, HashRouter, AuthProvider

.github/
├─ workflows/firebase-hosting-live.yml  # main → Firebase 자동 배포
└─ dependabot.yml                       # npm/Actions 주간 업데이트

scripts/prepare-sites.mjs               # 보조 Sites 호환 번들 생성
firebase.json                           # Hosting, Firestore, Emulator 설정
.firebaserc                             # 기본 Firebase 프로젝트 연결
firestore.rules                         # Firestore 역할 기반 보안 규칙
firestore.indexes.json                  # Firestore 인덱스 설정
vite.config.js                          # Vite 설정, Firebase base 경로 `/`
.env.example                            # 환경변수 템플릿
SECURITY.md                             # 보안 운영 정책
design-system/careerfit/MASTER.md       # UI 디자인 시스템 기준
```

### 주요 상태 흐름

1. `main.jsx`가 `HashRouter`와 `AuthProvider`를 초기화합니다.
2. `AuthContext.jsx`가 Firebase 로그인과 `admin`·`counselor`·`student` 역할을 결정합니다.
3. `App.jsx`가 역할별 라우트를 보호하고 전역 데이터를 관리합니다.
4. 운영에서는 `firebaseDataService.js`가 역할별 Firestore 쿼리를 구독합니다.
5. Firebase 설정이 없는 로컬 빌드에서만 `src/data/` 초기 데이터와 `localStorage` 데모가 사용됩니다.

## 라우팅

이 프로젝트는 `HashRouter`를 사용합니다. 브라우저의 실제 주소에는 `#`이 포함됩니다.

| React 경로 | 실제 운영 URL 예시 | 화면/권한 |
| --- | --- | --- |
| `/login` | `/#/login` | 로그인 또는 데모 역할 선택 |
| `/dashboard` | `/#/dashboard` | 상담 담당자 대시보드 |
| `/students` | `/#/students` | 학생 검색·목록 |
| `/appointments` | `/#/appointments` | 상담 예약 생성·변경·취소 |
| `/students/:studentId` | `/#/students/s1` | 학생 상세 |
| `/students/:studentId/consultation/new` | `/#/students/s1/consultation/new` | 상담 기록 작성 |
| `/consultations` | `/#/consultations` | 전체 상담 기록 |
| `/follow-ups` | `/#/follow-ups` | 후속 조치 관리 |
| `/notifications` | `/#/notifications` | 일정·마감 알림 센터 |
| `/insights` | `/#/insights` | 기간별 상담 운영 통계 |
| `/programs` | `/#/programs` | 프로그램 추천 |
| `/settings` | `/#/settings` | 설정 |
| `/student` | `/#/student` | 학생 마이페이지 |
| `/admin/users` | `/#/admin/users` | 상담 담당자 계정 등록·담당 배정 |

역할이 없거나 허용되지 않은 경로로 접근하면 `/login`으로 이동합니다. 상담 담당자와 관리자는 상담 담당자 라우트를 사용하고, 학생은 `/student`만 사용할 수 있습니다.

## 데이터 저장 모드

### 1. 로컬 팀 개발: 데모/localStorage 모드

초기 데이터는 `src/data/`에 있으며 변경 내용은 다음 키로 저장됩니다.

- `careerfit_role`
- `careerfit_students`
- `careerfit_consultations`
- `careerfit_consultation_notes`
- `careerfit_followups`
- `careerfit_appointments`
- `careerfit_users`
- `careerfit_read_notifications`
- `careerfit_program_store`
- `careerfit_program_recommendation_store`

브라우저나 도메인이 달라지면 데이터가 공유되지 않습니다. 브라우저 저장소를 지우면 초기 데모 데이터로 돌아갑니다. 현재 데이터는 모두 가상 데이터이며 실제 학교·학생 개인정보가 아닙니다.

### 2. 실제 서비스 전환용 Firebase Auth + Firestore 모드

실제 동기화가 활성화되면 다음 컬렉션을 사용합니다.

| 컬렉션 | 목적 | 중요한 연결 필드 |
| --- | --- | --- |
| `users` | 사용자 역할 프로필 | 문서 ID=`Auth UID`, `role` |
| `studentRegistrations` | 학생 셀프 회원가입과 배정 대기 정보 | 문서 ID=`Auth UID`, `status`, `emailVerified`, `counselorUid` |
| `students` | 학생 기본 정보 | `uid`, `counselorUid` |
| `consultations` | 공개 가능한 상담 기록 | `studentId`, `studentUid`, `counselorUid`, `studentVisible` |
| `consultationNotes` | 상담 담당자 전용 메모 | `studentId`, `counselorUid` |
| `followUps` | 학생/교직원 후속 조치 | `studentId`, `ownerUid`, `assigneeUid` |
| `programs` | 비교과 프로그램 | 관리자 쓰기, 로그인 사용자 읽기 |
| `auditLogs` | 감사 로그 예약 컬렉션 | 관리자 읽기, 클라이언트 쓰기 금지 |

`firebaseDataService.js`의 쿼리 범위:

- 상담 담당자와 호환용 관리자: 운영에 필요한 모든 대상 문서
- 학생: 자신의 `uid`, `studentUid`, `assigneeUid`와 일치하는 문서
- 학생 상담 기록: `studentVisible == true`인 문서만

Firestore 복합 쿼리를 확장하면 `firestore.indexes.json`에 인덱스가 추가로 필요할 수 있습니다. 현재 인덱스 목록은 비어 있습니다.

## 인증과 역할

역할은 다음 순서로 확인합니다.

1. Firebase ID 토큰의 custom claim `role`
2. `users/{uid}` 문서의 `role`

허용 역할은 `counselor`, `student`, `admin`입니다. `counselor`는 상담과 운영 관리 기능을 함께 사용하고, `admin`은 기존 계정 호환을 위해 동일 권한으로 유지합니다. 실제 Auth를 켤 때 이메일/비밀번호 로그인을 Firebase Console에서 활성화하고 각 계정에 역할 정보를 반드시 연결해야 합니다.

데모 로그인의 역할은 `localStorage`에 저장됩니다. 실제 Firebase 로그인에 성공하면 데모 역할 값은 제거됩니다.

실제 서비스 전환 시 로그인 화면은 Firebase Authentication 이메일/비밀번호 로그인, 비밀번호 재설정, 학생 셀프 회원가입을 제공합니다. 학생은 가입 후 이메일 인증과 상담사 배정을 모두 마쳐야 학생 화면에 접근할 수 있습니다. 공개 화면에서 상담사 역할로 가입할 수 없으며 상담사 계정은 기존 상담 담당자가 등록합니다. 현재 공개 데모 배포에서는 Firebase 인증 기능을 일시적으로 비활성화했습니다.

학생 가입·배정 흐름:

1. 학생이 이름, 이메일, 학번, 학과, 학년과 상담 희망 정보를 입력합니다.
2. `users/{uid}`는 `active=false`, `approvalStatus=pending`으로 생성됩니다.
3. `studentRegistrations/{uid}`에 배정 대기 정보가 저장되고 인증 메일이 발송됩니다.
4. 이메일 인증 전에는 상담 데이터에 접근할 수 없습니다.
5. 상담 담당자는 사용자 관리 화면에서 인증 완료 학생을 선택해 **내 담당으로 배정**합니다.
6. 배정 작업은 사용자 승인, 가입 신청 승인, 담당 학생 문서 생성을 한 번의 Firestore batch로 저장합니다.
7. 학생이 승인 상태를 새로고침하면 자신의 학생 화면으로 이동합니다.

## 상담 초안 생성 기능

`src/services/consultationAiService.js`의 `generateConsultationDraft()`는 현재 외부 생성형 AI를 호출하지 않습니다. 상담사가 입력한 메모를 정해진 필드 구조로 정리하고 기본 안내 문구를 채우는 로컬 규칙 기반 함수입니다.

실제 AI API로 교체할 경우:

- API 비밀키를 Vite/브라우저에 넣지 마세요.
- Firebase Functions, Cloud Run 등 서버 측 프록시를 사용하세요.
- 기존 함수의 입력·반환 구조를 유지하면 UI 변경을 줄일 수 있습니다.
- 개인정보 전송 동의, 데이터 최소화, 로그 마스킹과 보존 기간을 먼저 설계하세요.

## 로컬 개발

### 권장 환경

- Node.js `22`
- npm `10` 이상
- Firebase Emulator 사용 시 JDK `21` 이상
- Firebase CLI는 프로젝트 dev dependency로 설치됨

### 설치 및 실행

```bash
npm ci
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

macOS/Linux:

```bash
cp .env.example .env.local
npm run dev
```

Vite가 출력한 로컬 주소로 접속합니다. 환경변수를 변경하면 개발 서버를 다시 시작하세요.

### Firebase 실제 흐름 로컬 실행

실제 Firebase 프로젝트나 개인정보를 사용하지 않고 Auth 로그인, 담당 학생 조회,
Firestore 저장 흐름을 확인할 수 있습니다. 세 개의 터미널에서 순서대로 실행합니다.

```bash
# 터미널 1: Auth/Firestore Emulator
npm run firebase:emulators

# 터미널 2: Emulator가 준비된 뒤 가상 계정과 담당 학생 데이터 생성
npm run firebase:seed

# 선택: 로그인과 담당 학생 권한 흐름 검증
npm run firebase:verify

# 터미널 3: Firebase 모드로 프런트엔드 실행
npm run dev:firebase
```

로컬 테스트 계정은 다음과 같습니다. 이 계정과 비밀번호는 Emulator에만 존재합니다.

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 상담 담당자 | `counselor@careerfit.local` | `CareerFit123!` |
| 학생 | `student@careerfit.local` | `CareerFit123!` |

상담 담당자 계정에는 김하늘 학생만 배정되어 있습니다. 별도 상담사에게 배정된
이서준 학생도 시드되므로, 김하늘 학생만 조회되면 담당 학생 필터가 작동한 것입니다.
Emulator UI는 `http://127.0.0.1:4000`에서 확인할 수 있습니다.

### 주요 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 |
| `npm run dev:firebase` | Emulator 설정으로 Vite 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 및 Sites 호환 산출물 생성 |
| `npm test` | 입력 검증·알림·운영 통계 단위 테스트 |
| `npm run preview` | `dist` 로컬 미리보기 |
| `npm run firebase:emulators` | Auth/Firestore/Hosting Emulator 실행 |
| `npm run firebase:seed` | Emulator 전용 가상 계정·담당 학생 데이터 생성 |
| `npm run firebase:verify` | 로그인·담당 학생 권한·상담 문서 묶음 저장·학생 완료 처리 검증 |
| `npm run firebase:deploy:hosting` | 로컬 빌드 후 Firebase Hosting 수동 배포 |
| `npm run firebase:deploy:rules` | Firestore 규칙과 인덱스만 배포 |

최소 기능 검증은 Emulator 실행 중 아래 명령으로 수행합니다.

```bash
npm run build
npm run firebase:seed
npm run firebase:verify
```

## 환경변수

`.env.local`은 Git에서 제외됩니다. `.env.example`을 복사한 뒤 값을 채우세요.

### Firebase 웹 앱 설정

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` — 선택 사항, 현재 Analytics SDK는 초기화하지 않음

### 기능 플래그

| 변수 | 의미 |
| --- | --- |
| `VITE_FIREBASE_AUTH_ENABLED` | Firebase Authentication 사용 여부 |
| `VITE_FIRESTORE_SYNC_ENABLED` | Firestore 실시간 동기화 사용 여부. Auth도 활성화되어야 함 |
| `VITE_DEMO_MODE_ENABLED` | 실제 Auth가 켜진 상태에서도 데모 역할 선택을 명시적으로 허용 |
| `VITE_USE_FIREBASE_EMULATORS` | 개발 모드에서 Auth/Firestore Emulator 연결 |

동작 규칙:

- 필수 Firebase 설정이 없으면 Firebase 앱을 초기화하지 않습니다.
- `VITE_FIREBASE_AUTH_ENABLED`가 `true`가 아니면 자동으로 데모 모드가 됩니다.
- Firestore 동기화는 Firebase 설정 + Auth 활성화 + `VITE_FIRESTORE_SYNC_ENABLED=true` 조건을 모두 만족해야 합니다.
- Emulator 연결은 개발 빌드에서만 동작합니다.

`VITE_` 변수는 최종 JavaScript 번들에서 볼 수 있습니다. 공개 Firebase 웹 설정 외의 비밀값은 넣지 마세요.

## Firebase 설정

### 프로젝트 연결

`.firebaserc`의 기본 프로젝트:

```text
careerfit-aiboost-a601a
```

Hosting은 `dist`를 배포하고 모든 SPA 경로를 `/index.html`로 rewrite합니다.

### Hosting 보안/캐시 정책

`firebase.json`에 다음 정책이 적용되어 있습니다.

- Content Security Policy
- `Cross-Origin-Opener-Policy: same-origin`
- 카메라·마이크·위치·결제·USB 차단 Permissions Policy
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- 해시가 포함된 `/assets/**`는 1년 immutable 캐시
- `/`와 `/index.html`은 `no-cache`로 재배포 즉시 새 자산 경로 확인

Vite `base`를 `/careerfit/` 등으로 변경하면 Firebase 루트에서 JS/CSS가 로드되지 않아 빈 화면이 됩니다. GitHub Pages용 `GITHUB_ACTIONS` 조건을 다시 추가하지 마세요.

### Firestore 보안 규칙

`firestore.rules`는 기본 거부 방식입니다.

- 인증되지 않은 사용자는 데이터 접근 불가
- 승인된 상담 담당자는 해커톤 통합 운영 역할로 사용자 승인·학생 재배정과 상담 업무를 처리
- 학생은 자신의 `consultationSummaries` 공개 문서와 자신에게 배정된 후속 조치만 읽기
- 학생은 본인 후속 조치의 완료 상태와 완료 시각만 제한적으로 변경
- 역할/학생 UID 연결, 담당 상담자 UID 등 권한 핵심 필드는 일반 사용자가 바꾸지 못함
- 알 수 없는 컬렉션은 마지막 catch-all 규칙에서 거부
- 비활성 계정은 custom claim이 남아 있어도 접근 거부
- 문서별 필수 필드, 상태 범위, 문자열 크기 검증
- 상담 원본과 내부 메모는 `consultations`, `consultationNotes`에 분리하고 학생 조회 거부

Hosting 자동 배포는 Firestore 규칙을 배포하지 않습니다. 규칙 변경 시 반드시 별도 검증 후 아래 명령을 실행해야 합니다.

```bash
npm run firebase:deploy:rules
```

## GitHub Actions 자동 배포

워크플로 파일: `.github/workflows/firebase-hosting-live.yml`

PR 검증과 배포 흐름:

```text
PR 생성/갱신
→ npm ci
→ npm run build
→ npm test
→ Firebase Emulator에서 로그인·담당 권한·문서 저장 검증

main push 또는 PR merge
→ npm ci
→ 동일한 빌드·Emulator 기능 검증 통과
→ Firebase 빌드 환경변수 검사
→ npm run build
→ GitHub OIDC로 Google Cloud 인증
→ firebase deploy --only hosting
```

수동으로는 GitHub 저장소의 Actions 탭에서 `Deploy Firebase Hosting` 워크플로를 실행할 수 있습니다.

### GitHub Repository Variables

저장소 Settings → Secrets and variables → Actions → Variables에 다음 이름이 등록되어 있어야 합니다.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

워크플로는 필수 변수가 비어 있으면 배포 전에 실패하도록 구성되어 있습니다.

### 배포 인증

장기 서비스 계정 JSON 키나 `FIREBASE_TOKEN`을 GitHub Secrets에 저장하지 않습니다. 다음 Workload Identity Federation 연결을 사용합니다.

- Provider: `projects/540520328208/locations/global/workloadIdentityPools/github-actions/providers/careerfit-main`
- Service account: `github-actions-hosting@careerfit-aiboost-a601a.iam.gserviceaccount.com`
- 허용 저장소: `no-jisub/careerfit`
- 허용 브랜치: `refs/heads/main`
- GitHub Actions 권한: `contents: read`, `id-token: write`

외부 GitHub Action은 공급망 위험을 줄이기 위해 태그가 아니라 커밋 SHA로 고정되어 있습니다. Dependabot이 npm과 GitHub Actions 업데이트를 매주 월요일 확인합니다.

동시 실행은 Git ref별 concurrency group으로 묶입니다. 같은 PR 또는 `main`의 새 실행은 이전 실행을 취소하지만, 서로 다른 PR 검증과 `main` 배포는 방해하지 않습니다.

## Auth/Firestore 구축 상태

2026-07-22에 다음 전환을 완료했습니다.

1. Firebase Authentication 이메일/비밀번호 제공업체 활성화
2. `asia-northeast3` 서울 리전의 `(default)` Firestore Standard 데이터베이스 생성
3. 역할 기반 `firestore.rules`와 인덱스 배포
4. 최초 관리자 계정 생성 및 비밀번호 설정 메일 발송
5. GitHub Actions 운영 빌드의 Auth·Firestore 플래그 활성화
6. Emulator에서 관리자·상담사·학생 전체 흐름 검증

현재 운영 빌드는 Firebase Authentication과 Firestore 동기화를 활성화하면서 공개 데모 역할 선택도 함께 제공하는 혼합 운영 단계입니다. 실제 계정은 Firebase 데이터를 사용하고, 로그인하지 않은 방문자는 브라우저 로컬 데모 데이터만 사용합니다. 실제 사용자 도입이 확정되면 `VITE_DEMO_MODE_ENABLED=false`로 바꿔 로그인 필수 서비스로 전환합니다.

## 해커톤 계정·상담 운영 MVP

해커톤에서는 실제 대학 운영 자동화보다 역할별 기능이 끝까지 작동하는지 확인하는 데 초점을 둡니다.

- 학생은 한 명의 주 담당 상담사를 가지며, 승인된 상담사는 다른 상담사에게 학생을 재배정할 수 있습니다.
- 재배정할 때 학생 프로필과 함께 진행 중인 예약·교직원 후속 조치가 새 담당자에게 넘어가고, 기존 상담 기록은 학생 기준 이력으로 계속 조회됩니다.
- 상담사는 공개 회원가입 후 승인 대기 상태가 되며, 기존의 승인된 상담사가 승인하거나 거절합니다.
- 학생 탈퇴는 즉시 이용 중지와 30일 뒤 삭제 예정일 표시로 시연합니다. 해커톤 버전은 자동 삭제 대신 상담사 복구 기능을 제공합니다.
- 학생은 공개된 상담 기록의 삭제를 요청할 수 있고, 담당 상담사는 승인 또는 사유를 입력한 반려를 처리합니다.
- 상담 원본 `consultations`와 학생 공개 문서 `consultationSummaries`를 분리합니다. 학생은 상담사가 체크한 요약·강점·고민·추천 프로그램·후속 조치·다음 상담 계획만 읽습니다.
- 완료된 상담 기록도 수정할 수 있으며 마지막 수정일과 수정 상담사를 표시합니다.
- 예약 상태는 `pending`(대기), `confirmed`(확정), `completed`(완료), `cancelled`(취소)를 사용합니다. 동일 상담사의 같은 시간 중복 예약을 차단하고 학생과 상담사 모두 취소할 수 있습니다.
- 상담사 설정 화면의 전체 데모 데이터 초기화 기능으로 발표 도중 변경된 브라우저 데이터를 복구할 수 있습니다.

30일 후 Auth 계정과 관련 문서를 자동으로 삭제하는 작업은 Cloud Functions 또는 별도 서버 작업이 필요한 운영 기능이므로 해커톤 범위에서 제외합니다.

인증 제공업체나 Firestore 규칙을 변경한 경우 `npm run firebase:deploy:backend-config`를 별도로 실행해야 합니다. 일반 `main` 배포는 Hosting 자산만 자동 배포합니다.

## 보안 운영 원칙

- `.env`, `.env.*`, 서비스 계정 JSON, 인증서와 키 파일은 `.gitignore`에서 제외됩니다.
- `gha-creds-*.json`도 Git에서 제외됩니다.
- Firebase 웹 API 키는 서버 비밀키가 아니지만 Google Cloud에서 허용 도메인과 필요한 API만 제한하세요.
- App Check, 예산 알림, 사용량 알림은 실제 사용자·데이터 전환 전에 활성화하세요.
- 실제 학생 개인정보를 데모 데이터나 GitHub 이슈/PR에 넣지 마세요.
- 보안 규칙 변경과 프런트엔드 쿼리 변경은 항상 함께 검토하세요.
- 취약점 보고와 배포 체크리스트는 `SECURITY.md`를 참고하세요.

## 디자인과 접근성

디자인 기준은 `design-system/careerfit/MASTER.md`입니다.

- 네이비·블루 중심의 대학 상담 서비스 톤
- 8px 간격 리듬과 공통 UI 컴포넌트
- 데스크톱, 태블릿, 390px 모바일 반응형 레이아웃
- 의미 있는 HTML 구조와 입력 라벨
- 키보드 포커스와 접근 가능한 아이콘 이름
- 상태를 색상뿐 아니라 텍스트와 아이콘으로 함께 표현
- `aria-live`, `aria-expanded`, `role="dialog"`, `aria-modal` 사용
- `prefers-reduced-motion` 대응

## 관련 문서

- `docs/CareerFit_Easy_User_Guide_Counselor_Student.docx`: 상담 담당자/학생용 쉬운 사용 가이드
- `docs/CareerFit_User_Guide_and_Roadmap.docx`: 상세 사용 방법과 운영 로드맵
- `design-system/careerfit/MASTER.md`: 디자인 시스템
- `SECURITY.md`: 보안 정책과 배포 체크리스트

## 알려진 제한 사항과 다음 우선순위

1. 현재 공개 데모의 데이터는 브라우저에만 저장됩니다. 실제 서비스 전환 후 최초 관리자 로그인으로 상담사·학생 계정을 등록해야 운영 데이터가 채워집니다.
2. 상담 초안 생성은 실제 AI가 아니라 규칙 기반 로컬 함수입니다.
3. 프로그램은 `src/data/programs.js`의 가상 초기 데이터로 시작하며 등록·수정·학생 추천 내역은 현재 브라우저에만 저장됩니다. 학교 공식 API나 실제 신청 시스템과는 연결되지 않습니다.
4. 입력 검증·알림·통계 단위 테스트와 Firebase 통합 검증은 있으나, React 컴포넌트 테스트·린트·포맷 검사는 아직 없습니다.
5. Firebase App Check와 Analytics는 현재 초기화하지 않습니다.
6. 복합 쿼리를 추가할 때는 `firestore.indexes.json`에 인덱스를 추가해야 합니다.
7. 실제 대학 포털, 프로그램 신청과 외부 알림 시스템은 연동되지 않았습니다.

권장 개발 순서는 테스트 기반 추가 → Auth 검증 → Firestore 데이터 마이그레이션/규칙 검증 → 서버 기반 AI 연동 → App Check/모니터링 순입니다.

## 앞으로의 개발 방향

개발 방향의 핵심은 현재의 완성도 높은 데모 UI를 바로 실제 서비스로 전환하는 것이 아니라, 테스트·인증·데이터 권한을 먼저 안정화한 뒤 실제 기능을 단계적으로 여는 것입니다. 각 단계가 검증되기 전에는 다음 단계의 운영 플래그를 켜지 않는 것을 원칙으로 합니다.

### 0단계: 개발 품질 기반 만들기 — 최우선

목표: 기능을 추가해도 기존 상담 흐름과 배포가 깨지지 않는 개발 환경을 만듭니다.

주요 작업:

- ESLint와 일관된 코드 포맷 도구 도입
- Vitest + React Testing Library 도입
- 상담 기록 저장, 후속 조치 완료, 역할별 라우팅 테스트 작성
- Firebase Emulator 기반 Firestore Rules 테스트 작성
- GitHub Actions에 빌드 외에 lint/test 단계를 추가
- React Error Boundary와 사용자용 오류 화면 추가
- 큰 메인 번들 코드 분할과 성능 예산 설정

완료 기준:

- PR마다 build/lint/test가 자동 실행됨
- 상담 담당자와 학생의 핵심 시나리오가 자동 테스트됨
- Firestore 역할별 허용/거부 규칙이 Emulator 테스트로 증명됨

### 1단계: Firebase Authentication 실제 전환

목표: 데모 역할 선택 대신 실제 계정과 역할로 로그인합니다.

주요 작업:

- 이메일/비밀번호 인증 활성화
- 비밀번호 재설정, 로그인 실패, 로그아웃과 세션 만료 UX 구현
- `users/{uid}` 역할 프로필 생성 절차 마련
- 관리자만 역할을 부여·변경할 수 있는 서버 측 관리 기능 구현
- 상담 담당자/학생/관리자 테스트 계정으로 권한 검증
- 향후 대학 SSO 도입을 고려한 인증 계층 분리

완료 기준:

- 잘못된 역할 또는 역할 없는 계정이 보호된 화면에 들어갈 수 없음
- 학생은 상담 담당자 화면에, 상담 담당자는 다른 담당자의 데이터에 접근할 수 없음
- 운영 빌드에서 `VITE_FIREBASE_AUTH_ENABLED=true`로 배포 가능
- 운영 빌드의 데모 역할 선택이 비활성화됨

### 2단계: Firestore 실제 데이터 전환

목표: localStorage 데모 데이터를 안전한 다중 사용자 데이터로 전환합니다.

주요 작업:

- 컬렉션별 스키마와 필수 필드 문서화
- 학생/상담 담당자 UID 연결 및 초기 데이터 이관 도구 작성
- 서버 타임스탬프, 생성자, 수정자와 버전 필드 추가
- 필요한 복합 인덱스 정의
- 페이지네이션, 검색과 대량 데이터 성능 개선
- 동시 수정 충돌과 네트워크 재시도 정책 구현
- 백업, 복구와 데이터 보존/삭제 정책 수립

완료 기준:

- 모든 Firestore 접근이 보안 규칙과 일치함
- 권한 오류가 사용자에게 이해 가능한 메시지로 표시됨
- 초기 데이터 이관과 롤백 절차가 문서화됨
- `VITE_FIRESTORE_SYNC_ENABLED=true` 운영 배포 후 핵심 시나리오가 정상 동작함

### 3단계: 상담 업무 운영 기능 강화

목표: 실제 상담 부서가 반복 업무에 사용할 수 있는 운영 도구로 확장합니다.

후보 기능:

- 관리자용 학생·상담 담당자 배정 화면
- 상담 예약 생성/변경/취소와 캘린더 보기
- 후속 조치 알림과 기한 초과 알림
- 상담 템플릿, 태그, 검색과 필터 저장
- CSV 가져오기/내보내기와 보고서 생성
- 프로그램 담당 부서용 프로그램 등록·수정 화면(데모 저장소 구현 완료, Firestore 전환 필요)
- 서버에서 생성하는 감사 로그와 관리자 감사 화면
- 상담 통계와 익명화된 운영 대시보드

완료 기준:

- 관리자 권한이 필요한 기능은 서버에서 다시 권한을 검증함
- 개인정보 내보내기는 권한·목적·감사 기록을 남김
- 알림 실패와 재시도 상태를 운영자가 확인할 수 있음

### 4단계: 실제 생성형 AI 상담 보조

목표: 상담사를 대체하지 않고 기록 정리 시간을 줄이는 검토 가능한 AI 보조 기능을 만듭니다.

권장 구조:

```text
브라우저
→ 인증된 Firebase Function 또는 Cloud Run API
→ 개인정보 최소화/마스킹
→ 생성형 AI API
→ 구조화된 응답 검증
→ 상담사 검토·수정
→ 명시적 저장
```

필수 원칙:

- AI API 키를 브라우저 번들에 포함하지 않음
- 생성 결과를 자동 확정하거나 자동 저장하지 않음
- 입력·출력 스키마 검증과 금지 표현 필터 적용
- 프롬프트 버전, 모델 버전과 사용자의 최종 수정 이력 관리
- 개인정보 처리 동의, 전송 범위와 보존 정책 명시
- 품질 평가 세트와 환각/편향/민감정보 노출 테스트 운영
- 장애나 비용 초과 시 기존 수동 작성 흐름으로 안전하게 전환

완료 기준:

- 상담사가 원문과 AI 초안의 차이를 확인하고 승인해야만 저장됨
- 서버 로그에 원문 개인정보가 불필요하게 남지 않음
- 품질·안전·비용 지표를 운영자가 확인할 수 있음

### 5단계: 대학 시스템 연동

목표: 커리어핏이 독립 데모가 아니라 대학 업무 흐름의 일부로 작동하도록 합니다.

후보 연동:

- 대학 SSO 또는 통합 인증
- 학사 정보 시스템의 최소 학생 정보 동기화
- 교내 캘린더/예약 시스템
- 비교과 프로그램 시스템과 신청 상태
- 이메일, 앱 푸시 또는 학교 알림 시스템

연동 원칙:

- 필요한 정보만 가져오는 최소 권한 방식 사용
- 외부 시스템 장애가 상담 기록 작성까지 막지 않도록 비동기 처리
- 재시도, 중복 방지와 동기화 상태를 명시적으로 저장
- 실데이터 연동 전 별도 테스트 프로젝트와 가명 데이터 사용

### 6단계: 보안·접근성·운영 성숙도

목표: 실제 개인정보를 다루는 운영 서비스 수준으로 강화합니다.

주요 작업:

- Firebase App Check 적용
- Google Cloud API 제한, 예산 알림과 이상 사용량 탐지
- 정기적인 의존성·보안 규칙·권한 검토
- 관리자 행위와 중요 데이터 변경 감사 로그
- WCAG 기준 접근성 감사와 키보드/스크린리더 회귀 테스트
- Core Web Vitals 및 클라이언트 오류 모니터링
- 장애 대응, 백업 복구, 키 교체와 계정 회수 절차 문서화
- 개인정보 보존 기간 만료에 따른 자동 삭제 또는 익명화

완료 기준:

- 운영 체크리스트와 장애 대응 담당자가 명확함
- 복구 연습과 권한 회수 테스트가 정기적으로 수행됨
- 접근성·성능·오류율 지표가 릴리스 기준에 포함됨

### 권장 우선순위

| 우선순위 | 작업 | 이유 |
| --- | --- | --- |
| P0 | 자동 테스트, lint, Firestore Rules 테스트 | 이후 모든 변경의 안전망 |
| P0 | 실제 Auth 역할 모델과 관리자 역할 부여 절차 | 모든 데이터 권한의 기반 |
| P0 | Firestore 스키마·UID·마이그레이션 설계 | 실제 데이터 전환의 선행 조건 |
| P1 | 상담/후속 조치 실제 저장과 오류 UX | 핵심 사용자 가치 |
| P1 | App Check, 모니터링, 백업 | 개인정보 운영 준비 |
| P1 | 관리자 배정·프로그램 관리 | 실제 부서 운영에 필요 |
| P2 | 서버 기반 생성형 AI | 기반과 안전 정책이 준비된 후 진행 |
| P2 | 대학 SSO·포털·알림 연동 | 외부 협의와 운영 체계가 필요 |

### 다음 스프린트 권장 작업

다음 개발자는 아래 범위를 첫 스프린트로 잡는 것이 좋습니다.

1. ESLint, Vitest와 React Testing Library 설정
2. 데모 역할별 라우팅과 상담 기록 저장 테스트 작성
3. Firebase Emulator용 Rules 테스트 환경 구성
4. Firestore 컬렉션 스키마를 `docs/`에 명세
5. Auth 테스트 계정과 `users/{uid}` 역할 생성 절차 문서화
6. GitHub Actions에 test/lint 단계를 추가하되 Hosting 배포는 build/test 통과 후에만 실행
7. 스테이징용 별도 Firebase 프로젝트가 필요한지 결정

## 다른 AI/개발자를 위한 작업 체크리스트

작업을 시작할 때:

1. 이 README와 `SECURITY.md`를 읽습니다.
2. `git status -sb`로 사용자 변경 사항을 확인하고 보존합니다.
3. `git fetch` 후 최신 `main`을 기준으로 작업합니다.
4. `package.json`, 관련 페이지, 서비스와 Firebase 규칙을 함께 확인합니다.
5. 현재 운영 모드가 데모인지 실제 Firebase인지 기능 플래그를 확인합니다.

변경할 때:

- 사용자 변경과 무관한 파일을 되돌리지 마세요.
- Firebase Hosting의 Vite `base: '/'`를 유지하세요.
- 브라우저에 비밀키를 넣지 마세요.
- Firestore 쿼리를 바꾸면 규칙과 인덱스를 함께 검토하세요.
- UI 변경은 디자인 시스템과 모바일·키보드 접근성을 확인하세요.
- 실제 AI 연동은 반드시 서버 측에서 구현하세요.

완료할 때:

1. 최소 `npm run build`를 실행합니다.
2. 데모 로그인에서 상담 담당자와 학생 화면을 확인합니다.
3. Firebase/환경변수 변경이 있으면 배포 설정과 문서를 함께 갱신합니다.
4. PR을 `main`에 병합하면 GitHub Actions가 Firebase Hosting에 자동 배포합니다.
5. Actions 실행 성공과 <https://careerfit-aiboost-a601a.web.app/>의 실제 렌더링을 확인합니다.
6. 배포 직후 이전 화면이 보이면 강력 새로고침 후 `/` 응답의 캐시 헤더와 `/assets/` 경로를 확인합니다.
