# We Bible — iPhone 6.5형 앱스토어 스크린샷

한국어 소개 이미지 7장입니다. `screenshots` 폴더의 JPEG 파일을 순서대로 사용하세요.

| 순서 | 파일 | 기능 |
|---|---|---|
| 1 | `01-bible-reading.jpg` | 성경 읽기 · 한글/영어 · 관심 구절 |
| 2 | `02-prayer.jpg` | 기도 제목과 날짜별 기도 기록 |
| 3 | `03-memo.jpg` | 성경 구절과 연결한 묵상 메모 |
| 4 | `04-bible-grass.jpg` | 성경 잔디와 최근 읽기 기록 |
| 5 | `05-reading-plan.jpg` | 성경 읽기표 · 진행률 · 장별 읽기 횟수 |
| 6 | `06-community.jpg` | 공동체 · 함께 읽는 계획과 진행률 |
| 7 | `07-member-info.jpg` | 회원 인사카드 · 연락처 · 사용자 정의 항목 |

## 파일 규격

- 모든 개별 이미지: **1242 × 2688픽셀**, 세로
- JPEG, RGB, sRGB IEC61966-2.1, 알파/투명 없음
- `preview.jpg`: 전체 구성을 확인하기 위한 미리보기. 업로드 대상은 개별 이미지 7장입니다.
- `index.html`: 각 원본을 열 수 있는 로컬 갤러리
- `manifest.json`: 파일 크기, 픽셀 크기, 형식, SHA-256 검증 기록
- Apple 공식 규격: https://developer.apple.com/kr/help/app-store-connect/reference/app-information/screenshot-specifications/

## 화면 제작 기준

앱의 기존 React Native 화면 컴포넌트를 별도 로컬 촬영 환경에서 예시 데이터로 웹 렌더링했습니다. 실제 iPhone에서 직접 캡처한 이미지는 아니며, 웹과 iOS의 글꼴·아이콘·시스템 영역은 차이가 있을 수 있습니다. 기기 프레임과 상단 홍보 문구는 HTML/CSS로 구성했습니다.

이름, 연락처, 공동체, 기도, 메모, 읽기 이력은 모두 촬영용 예시입니다. 실제 계정이나 운영 데이터베이스의 내용을 사용하지 않았습니다. 기도·메모·읽기표·공동체·회원 정보는 기존 페이지를, 성경 읽기는 기존 BibleHeader/BibleContent/ChapterNav를 재사용했습니다. 앱 화면의 제품 코드는 수정하지 않았습니다.

## 수정·재제작

`source/features.json`에서 문구와 강조색을, `source/gallery.html`에서 배치를 수정할 수 있습니다. 예시 데이터는 `source/prepare_capture.py`, 촬영용 화면 구성은 `source/capture.jsx`에 있습니다.

프로젝트 루트에서 아래 명령으로 촬영 전용 복사본을 만듭니다.

```sh
python3 artifacts/app-store/iphone-6.5-ko/source/prepare_capture.py
```

복사본은 `/private/tmp/we-bible-app-store-capture`에 생성됩니다. 해당 폴더에서 다음 명령을 실행합니다.

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx expo start --web --port 8088
```

별도 터미널에서 프로젝트 루트 기준으로 디자인 서버를 실행합니다.

```sh
python3 -m http.server 8091 --bind 127.0.0.1 --directory artifacts/app-store/iphone-6.5-ko
```

브라우저 뷰포트를 1242 × 2688로 설정하고 `http://localhost:8091/source/gallery.html?feature=bible`을 엽니다. `feature`는 `bible`, `prayer`, `memo`, `grass`, `plan`, `church`, `metadata` 중 하나입니다. 앱 화면과 아이콘 로딩이 끝난 뒤 캡처하세요.

공동체 이미지는 '성경읽기 계획' 탭을 선택했습니다. 읽기표 이미지는 본문을 약 224 CSS px 아래로 스크롤해 진행률과 완료·미완료 장을 함께 표시했습니다. 나머지는 처음 열린 상태입니다.

현재 브라우저 캡처 도구는 JPEG 바이트를 반환하므로 확장자를 `.jpg`로 저장합니다. 실제 파일 형식과 확장자가 일치해야 합니다.
