# 공동체 커뮤니티 검증 기록

검증일: 2026-10-16. 대상: `develop`의 공동체 커뮤니티 추가 작업.

## 성경 기준 데이터 정적 전환 — 2026-10-20

- 성경 책/절 기준 테이블 및 93,306개 절 번호를 적재하는 시드를 제거했습니다. 앱은 기존 정적 JSON을 `domain/community/bible-reference.ts`에서 읽으며 구절 선택용 DB 요청이 없습니다.
- 서버의 장·절 검증과 정렬은 같은 JSON에서 생성한 불변 함수로 전환했습니다. 묵상·읽기 범위 행에는 `CHECK` 제약을 두고, 회원 권한·복합 외래 키·읽기 범위 잠금을 유지했습니다. 이전 앱의 `verse_ids` RPC도 호환됩니다.
- 입력/정적 데이터 테스트 **8개**, TypeScript 및 변경 파일 ESLint, `git diff --check`가 통과했습니다.
- PGlite DB 검증은 **새 마이그레이션 설치 98개**, **이전 시드 방식에서 업그레이드 98개** assertion이 각각 통과했습니다. 3개 번역본의 3,567장 전체 절 목록 일치, 잘못된 장/절 거절, 기준 테이블 제거, 기존 세 번역본 묵상의 보존·수정, 없는 절 번호를 생성하지 않는 동작을 확인했습니다.
- 운영 Supabase DB에는 적용하지 않았습니다. 실제 앱 화면·실기기·배포 번들·Supabase Advisor는 이번 리팩터링에서 실행하지 않았습니다. 아래 이전 검증 기록과 구분합니다.

재실행:

```sh
npm run test:community
node scripts/generate-community-bible-sql.mjs --check
PGLITE_MODULE=/private/tmp/we-bible-community-tools/node_modules/@electric-sql/pglite/dist/index.js npm run test:community:db

# 커밋에 보존된 이전 SQL에서 시작하는 업그레이드 검증
git show 3a27a93176e4668dcb3e902ba83b792f416edb9d:supabase/migrations/20261016041414_add_church_community.sql > /private/tmp/we-bible-community-before-static.sql
PGLITE_MODULE=/private/tmp/we-bible-community-tools/node_modules/@electric-sql/pglite/dist/index.js COMMUNITY_BASELINE_MIGRATION=/private/tmp/we-bible-community-before-static.sql npm run test:community:db
```

PGlite가 없다면 [DB 테스트 안내](../supabase/tests/README.md)의 임시 설치 절차를 따르고 `PGLITE_MODULE`을 해당 경로로 지정합니다. 배포 시 기존 커뮤니티 SQL이 적용된 DB에는 `20261020040857_use_static_community_bible_catalog.sql`만 추가 적용합니다.

## 개역한글판 기준 적용

- 새 묵상 댓글의 구절 선택·본문 조회·저장 번역본을 개역한글판(`ko-krv`)으로 통일했습니다. 화면에 번역본을 표시하고, 기존 다른 번역본의 묵상은 조회·수정 시 저장된 번역본을 유지합니다.
- 로컬에 보관된 개역한글판 원본 1,189장·31,102개 절 ID를 구절 목록과 다시 대조했습니다. 모든 장의 SHA-256·실제 절 번호가 일치하고 본문이 비어 있지 않음을 확인했습니다. 인쇄본 전체와의 대조나 원격 원본 전체 재다운로드는 수행하지 않았습니다.
- 변경 후 앱 전체 TypeScript 검사, 변경 파일 ESLint, 기존 커뮤니티 테스트 5개가 통과했습니다. 아래 전체 번들·DB·브라우저 검증은 최초 구현 시의 기록이며, 이번 번역본 선택 UI 변경 후에는 다시 실행하지 않았습니다.

## 통과한 검증

| 영역 | 결과 | 범위 |
|---|---|---|
| 커뮤니티 DB 통합 | 72 assertions 통과 | 실제 PostgreSQL 엔진인 PGlite에 기존 스키마/마이그레이션과 새 마이그레이션을 적용 |
| 기존 회원 메타정보 DB 회귀 | 101 assertions 통과 | 기존 권한·설정·검색·기본 필드 기능 |
| 커뮤니티 입력/목록 | 5 tests 통과 | 태그, 범위 병합·장 수 검증, 이미지 참조, 3,567장 구절 목록 |
| 기존 메타정보 입력 | 8 tests 통과 | 기존 입력/저장 변환 |
| 파일 검증 | 3 Deno tests 통과 | 크기·허용 형식·실제 시그니처·한글 UTF-8·활성 마크업 거부 |
| TypeScript | 통과 | 앱 전체 `tsc --noEmit` |
| 새 앱 코드 ESLint | 오류/경고 없음 | 커뮤니티 화면·컴포넌트·도메인·hooks·lib |
| Edge Functions | 타입 검사 및 Deno lint 통과 | 사용자 인증/첨부 및 정리 함수 |
| 배포 번들 | iOS·Android·Web 모두 통과 | `EXPO_NO_DOTENV=1 expo export --platform all`, DOM 에디터 번들 포함 |
| 변경 파일 공백 검사 | 통과 | `git diff --check` |

DB 테스트는 비회원·가입 대기자·다른 공동체·다른 작성자의 접근, 관리자 수정 금지/삭제 허용, 중복 하트, 멱등 저장/내용 충돌/삭제 후 재요청, 오래된 수정 버전, 읽기 범위 병합 및 잠금, 실제 번역본 구절 FK, 묵상 하위 행 제약, 첨부 소유권·미완료 첨부·쿼터·만료·정리 큐를 확인합니다. 정리 작업 완료와 새 삭제 요청이 겹쳐도 최신 작업이 사라지지 않도록 generation 조건을 검증했습니다.

## 브라우저에서 확인한 에디터 동작

기존 루트 화면과 분리한 임시 검증 화면에서 실제 커뮤니티 에디터 컴포넌트를 사용했습니다. 업로드 완료는 가짜 이미지 URL을 주입하는 fixture이며 실제 S3 업로드를 확인한 것은 아닙니다. 검증용 화면/엔트리는 작업 후 삭제하여 앱에 포함하지 않았습니다.

- 한글 문장 중간에 이미지 placeholder 삽입
- 업로드 중 이미지 뒤에 계속 입력해 `문단 → 이미지 → 문단` 순서 유지
- 업로드 URL 교체 후 본문·텍스트 유지
- 이미지 위로 이동, 삭제, 삭제 되돌리기
- 번호 목록 작성과 실제 Tiptap JSON을 DB validator가 수용하는지 확인
- 저장 JSON에 URL 없이 `attachmentId`만 저장되는지 확인
- 저장 버튼에서 최신 에디터 문서를 읽는 동작
- 확인 당시 에디터 콘솔 오류 없음

발견 후 수정한 문제: 이미지 삽입 후 atom node가 선택된 채 남아 다음 입력이 이미지를 대체하던 동작을 수정했습니다. Tiptap 번호 목록의 기본 `type: null` 속성도 서버 검증과 맞췄습니다.

## 아직 확인하지 못한 범위와 기존 제한

- 실제 S3 버킷/IAM/CORS 및 Supabase 함수 배포·비밀값 설정은 수행하지 않았습니다. 현재 로컬 환경에 커뮤니티 전용 서버 설정이 없습니다. [배포 안내](community.md)의 절차가 필요합니다.
- 운영 DB에 마이그레이션을 적용하지 않았습니다. 실제 로그인 계정으로 `앱 → Edge Function → S3 → DB → 화면` 전체 흐름은 미검증입니다.
- 실제 iOS/Android 기기의 키보드·한국어 IME 조합·사진 권한·HEIC 변환·업로드 중 백그라운드 전환은 미검증입니다. 번들 성공은 실기기 확인을 대체하지 않습니다.
- Expo 웹 개발 서버의 루트 앱은 기존 `expo-sqlite/web/worker.ts`의 `Worker chunk not found` 오류로 열리지 않았습니다. 이번 기능과 분리된 기존 제한이며, 전체 앱 브라우저 검증을 완료했다고 표시하지 않습니다. 배포용 전체 export는 성공했습니다.
- 전체 `npm run lint`는 변경 전과 같은 **21 errors / 26 warnings**로 실패합니다. 기존 React hook 관련 오류 등이 남아 있으며 이번에 추가한 앱 코드는 별도 lint를 통과했습니다.

## 배포 후 확인할 흐름

1. 테스트 공동체의 회원 A가 태그·본문 중간 이미지·파일을 포함한 글을 작성하고 회원 B가 조회합니다.
2. A/B가 글·댓글 하트를 반복해서 설정/취소해 수량과 새로고침 결과를 대조합니다.
3. 함께 성경읽기 글에 여러 장/구간을 설정하고 B가 여러 장의 구절과 묵상을 저장합니다. 범위 변경이 차단되는지 확인합니다.
4. 비회원/다른 공동체/탈퇴한 회원에게 신규 RPC와 다운로드 URL 발급이 차단되는지 확인합니다. 이미 발급된 URL은 최대 5분 유효합니다.
5. 저장하지 않은 업로드·삭제한 글·계정 삭제의 파일이 정리되고, S3 삭제 오류 후 다음 작업에서 재시도되는지 확인합니다.
