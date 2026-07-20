# Security policy

## Reporting a vulnerability

보안 문제에는 개인정보, 인증 우회, Firestore 규칙 오류, 노출된 자격 증명과 공급망 문제가 포함됩니다. 공개 이슈에 민감한 재현 정보나 비밀값을 게시하지 말고 저장소 관리자에게 비공개 채널로 전달해 주세요.

## Deployment checklist

- 실제 운영에서는 Firebase Authentication과 Firestore 동기화를 함께 검증한 후 활성화합니다.
- Firebase 인증을 활성화한 배포에서 데모 로그인이 필요할 때만 `VITE_DEMO_MODE_ENABLED=true`를 명시합니다.
- Firebase 웹 API 키는 클라이언트 식별자이지만 Google Cloud에서 허용 도메인과 API를 제한하고, App Check 및 예산 알림을 설정합니다.
- 서비스 계정 키, 개인 키, 토큰과 비밀번호는 `VITE_` 변수나 Git 이력에 저장하지 않습니다.
- `firestore.rules`와 인덱스를 애플리케이션 배포 전에 별도로 검증하고 배포합니다.
- GitHub에서 비밀 검사, 푸시 보호, Dependabot 경고와 기본 브랜치 보호를 활성화합니다.

## Supported versions

현재 기본 브랜치의 최신 배포만 보안 업데이트 대상입니다.
