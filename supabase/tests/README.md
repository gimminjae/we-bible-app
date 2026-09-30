# 공동체 회원 메타데이터 적용·검증 기록

검증일: 2026-09-09. 앱 구현과 로컬 SQL 검증을 완료했으며, 운영 Supabase 프로젝트에는 변경을 적용하지 않았습니다.

## 적용 방법

기존 DB는 이전 migration이 반영된 상태에서 [`202609080001_add_church_member_metadata.sql`](../migrations/202609080001_add_church_member_metadata.sql)을 적용한 뒤 앱을 배포합니다. 새 프로젝트는 [`fresh-db/README.md`](../fresh-db/README.md)의 순서로 구성합니다. 기존 DB에서 fresh-db SQL을 실행하지 않습니다.

추가 테이블은 `church_member_metadata_fields`(공동체의 항목 설정), `church_member_metadata`(공동체·회원별 JSONB 값)입니다. 기존 공동체와 이후 생성한 공동체 모두 기본 항목 다섯 개가 생성됩니다. 초기화 재실행 시 사용 여부·이름·선택지·복사 여부·권한 정책과 회원 값은 보존됩니다. 별도 앱 의존성 설치는 필요하지 않습니다.

권한 검사를 수행하는 함수는 `church_metadata_private`에 두고, `public`에는 인증 사용자용 `security invoker` RPC를 제공합니다. private 스키마를 Data API 노출 스키마에 추가할 필요가 없습니다. 테이블 직접 쓰기와 내부 보조 함수 호출은 차단합니다. 함수 권한과 고정 `search_path`는 [Supabase 함수 문서](https://supabase.com/docs/guides/database/functions)의 기준을 반영했습니다.

앱 진입점은 공동체 관리 메뉴 → **회원 정보 항목 관리**, 회원 메뉴 → **회원 정보**, 회원 탭 → **내 회원 정보 / 회원 정보로 검색**입니다. 필드 수정 정책 변경은 최고 관리자만 가능합니다. 부관리자는 항목을 관리할 수 있으며 새 항목은 관리자·부관리자와 본인 수정 정책으로 시작합니다.

## 재실행 명령

Node.js 22.18 이상에서 실행합니다. 아래 명령은 Supabase 접속 정보 없이 임시 PostgreSQL 엔진으로 SQL을 검증합니다. PGlite는 앱 의존성에 추가하지 않습니다.

```sh
npm install --prefix /private/tmp/we-bible-metadata-tests --no-audit --no-fund --ignore-scripts @electric-sql/pglite
PGLITE_MODULE=/private/tmp/we-bible-metadata-tests/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-church-metadata.mjs
node --test scripts/church-metadata-values.test.mjs
npx tsc --noEmit
npm run lint
EXPO_NO_DOTENV=1 npx expo export --platform all --output-dir /private/tmp/we-bible-metadata-export
```

DB 실행기는 현재 `schema.sql`의 메타데이터 도입 이전 부분과 기존 migration을 로드하고, 기존 공동체를 만든 후 새 migration을 적용합니다. 별도 DB 인스턴스에서는 fresh-db SQL도 처음부터 실행합니다. 인증 역할과 사용자 세션을 바꿔 검사하며 실제 계정·회원 정보를 읽거나 수정하지 않습니다.

## 실행 결과

| 검증 | 결과 |
| --- | --- |
| PostgreSQL DB 통합 검증 | 101개 assertion 통과. 기존 DB 업그레이드·재실행·신규 DB 구성 포함 |
| 입력·저장 규칙 단위 테스트 | 8개 통과 |
| TypeScript | `npx tsc --noEmit` 통과 |
| 새 화면·컴포넌트·도메인·API·훅·테스트 및 관련 유틸리티 ESLint | 통과 |
| 프로젝트 기본 lint | 기존 파일의 오류 21개·경고 26개로 실패. 추가한 파일에서는 오류 없음 |
| iOS·Android·Web 번들 | 세 플랫폼 모두 성공. Web 정적 경로 53개에 새 항목 관리·회원 정보 경로 포함 |

DB 검증은 기본값, 복사 설정, O/X 키·표시명 변경, 미사용 값 보존, 숫자 0·소수·범위·정밀도, 잘못된 날짜·이메일, 네 가지 수정 정책의 본인/타인 조합, 비회원·가입 대기·비로그인 차단, 조회·저장 응답의 비공개 필드 제거, 직접 쓰기·내부 함수 호출 금지, 버전 충돌, 다른 공동체 필드 거절, 검색 범위·부분 일치·특수문자·페이지 분리, 계정·회원·공동체 삭제를 확인합니다. RLS 활성화, 함수의 `security invoker/definer` 구분, `search_path`, 익명 실행 금지도 DB 카탈로그로 검사합니다.

검색용 회원 1,000명을 추가해 30명씩 서로 겹치지 않는 두 페이지를 확인했습니다. 공동체 범위의 JSONB 부분 검색 `EXPLAIN ANALYZE`는 PGlite에서 Bitmap Heap Scan, 약 1.3ms였습니다. 이는 단일 로컬 쿼리 관찰값이며 운영 RPC 전체 성능이나 네트워크 지연의 보장은 아닙니다.

입력 테스트는 전화번호 앞자리 0·국가번호·주소 줄바꿈 보존, O/X 표시명 복사, 숫자의 반올림·underflow 거절, 날짜 검증, 부분 이메일 검색, 변경 필드만 저장, 미사용·읽기 전용 값 보존과 비우기를 확인합니다. 네이티브 클립보드나 화면 터치를 자동 조작한 테스트는 아닙니다.

기본 lint 오류는 메모·읽기 계획·기도 편집, 기존 공동체 시트 등 변경하지 않은 파일의 `react-hooks/set-state-in-effect`, 기존 애니메이션의 `react-hooks/immutability` 등입니다. 기본 lint 대상 밖의 `contexts/auth-context.tsx`도 별도 검사했으며, 기존 효과의 `setDataUserId` 오류 1개는 유지됩니다. 이번 캐시 정리 코드에서 새 오류는 발생하지 않았습니다.

## 검증의 한계와 후속 확인

- 브라우저 조작 도구의 trusted worker가 삭제된 이전 버전 런타임을 참조해 시작하지 못했습니다. 실제 로그인 화면 조작·시각 검증은 수행하지 못했습니다.
- iOS·Android 실기기에서 키보드, 스크롤, 뒤로 가기 확인, 클립보드 성공·실패와 한국어·영어·다크 모드 전환을 확인해야 합니다. 번들 생성은 실기기 동작 검증을 대체하지 않습니다.
- PGlite는 단일 DB 연결입니다. 같은 버전으로 두 번 저장했을 때 두 번째 요청이 거절되는 것은 검증했지만, 여러 DB 연결에서 첫 저장·정책 변경·탈퇴가 실제로 겹치는 잠금 경합 테스트는 실행하지 못했습니다. 테스트용 Supabase/Postgres에서 추가 확인할 수 있습니다.
- 로컬 Supabase CLI와 연결된 프로젝트 도구가 없어 Supabase Security/Performance Advisor 자체는 실행하지 못했습니다. RLS·함수·권한에 대한 SQL 카탈로그 검사는 위 통합 테스트에서 수행했습니다.
- 화면에서 저장 실패는 성공으로 표시하지 않고, 권한·정의 변경 시 새 응답으로 재검증합니다. 여러 기기의 변경은 화면 재진입·앱 활성화·재조회 시 반영하며 Realtime 구독은 이번 구현에 포함하지 않습니다.

문제가 발견되면 앱의 신규 진입점 노출을 되돌리고 추가 테이블과 값은 보존할 수 있습니다. 운영 DB 적용 전에는 테스트용 프로젝트에서 위 실기기·동시성 확인을 마치는 것이 좋습니다.
