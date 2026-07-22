# Security policy

## Reporting a vulnerability

보안 문제에는 개인정보, 인증 우회, Firestore 규칙 오류, 노출된 자격 증명과 공급망 문제가 포함됩니다. 공개 이슈에 민감한 재현 정보나 비밀값을 게시하지 말고 저장소 관리자에게 비공개 채널로 전달해 주세요.

## Deployment checklist

- 실제 운영에서는 Firebase Authentication과 Firestore 동기화를 함께 검증한 후 활성화합니다.
- 운영 배포는 `VITE_DEMO_MODE_ENABLED=false`를 강제합니다. 데모 역할 선택은 로컬 팀 개발에서 가상 데이터로만 사용합니다.
- Firebase 웹 API 키는 클라이언트 식별자이지만 Google Cloud에서 허용 도메인과 API를 제한하고, App Check 및 예산 알림을 설정합니다.
- 서비스 계정 키, 개인 키, 토큰과 비밀번호는 `VITE_` 변수나 Git 이력에 저장하지 않습니다.
- `firestore.rules`와 인덱스를 애플리케이션 배포 전에 별도로 검증하고 배포합니다.
- 상담 원문 메모는 `consultationNotes`에 분리하고 학생 계정에 읽기 권한을 부여하지 않습니다. 학생은 `studentVisible=true`인 요약만 조회합니다.
- Firestore에서 역할·담당 학생·문서 소유자를 검증하고, 문자열 크기와 상태값을 서버 규칙에서도 제한합니다.
- 비활성화된 `users` 프로필은 커스텀 클레임이 남아 있어도 업무 문서에 접근할 수 없습니다.
- GitHub에서 비밀 검사, 푸시 보호, Dependabot 경고와 기본 브랜치 보호를 활성화합니다.

## Supported versions

현재 기본 브랜치의 최신 배포만 보안 업데이트 대상입니다.
