# We Bible — iPhone 15 스크린샷

2026-10-21의 색상·아이콘 디자인과 **회원 · 성경읽기 계획 · 기도 · 팀 · 공동체 이야기** 통합 메뉴, 상세 화면의 아이콘 전용 수정·삭제 버튼을 반영한 한국어 이미지 7장입니다.

| 순서 | 파일 | 기능 |
|---|---|---|
| 1 | `01-bible-reading.jpg` | 성경 읽기 |
| 2 | `02-prayer.jpg` | 기도 |
| 3 | `03-memo.jpg` | 묵상 메모 |
| 4 | `04-bible-grass.jpg` | 성경 잔디 |
| 5 | `05-reading-plan.jpg` | 성경 읽기표 |
| 6 | `06-community.jpg` | 공동체 · 통합 메뉴와 함께 읽는 계획 |
| 7 | `07-member-info.jpg` | 공동체 회원 정보 |

## 규격과 제작 방식

- 기본형 iPhone 15: **1179 × 2556픽셀**, 세로. [Apple 기술 사양](https://support.apple.com/ko-kr/111831)
- JPEG, RGB, sRGB, 알파/투명 없음
- 앱 뷰포트: 393 × 852 CSS 픽셀. 59px 상단 시스템 영역, 34px 하단 홈 영역과 Dynamic Island 형태의 프레임을 반영했습니다.
- 현재 React Native 화면 컴포넌트를 가상의 예시 데이터로 웹 렌더링한 소개 이미지입니다. 실기기 캡처가 아니며 iOS와 글꼴·시스템 영역이 다를 수 있습니다.
- 실제 계정이나 운영 데이터베이스를 사용하지 않았습니다. Playwright와 로컬 헤드리스 Chrome으로 촬영했습니다.
- `screenshots/`의 7장이 원본입니다. `preview.jpg`는 전체 미리보기, `index.html`은 로컬 갤러리, `manifest.json`은 형식·파일 크기·SHA-256 검증 기록입니다.

## 재제작

`source/features.json`은 소개 문구와 강조색, `source/gallery.html`은 기기 프레임과 배치, `source/capture.jsx`는 촬영용 구성, `source/prepare_capture.py`는 가상 데이터를 관리합니다.

프로젝트 루트에서:

```sh
python3 artifacts/app-store/iphone-15-ko/source/prepare_capture.py
```

생성된 `/private/tmp/we-bible-iphone15-capture-ko`에서:

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx expo export --platform web --output-dir /private/tmp/we-bible-store-web-ko
python3 -m http.server 8088 --bind 127.0.0.1 --directory /private/tmp/we-bible-store-web-ko
```

별도 터미널에서 프로젝트 루트 기준:

```sh
python3 -m http.server 8096 --bind 127.0.0.1 --directory artifacts/app-store
```

`http://127.0.0.1:8096/iphone-15-ko/source/gallery.html?feature=bible`을 1179 × 2556, DPR 1로 엽니다. `feature` 값은 `bible`, `prayer`, `memo`, `grass`, `plan`, `church`, `metadata`입니다.

공동체 화면은 '성경읽기 계획' 메뉴를 선택합니다. 읽기표 화면은 진행도 카드가 본문 스크롤 영역 상단에서 16px 아래에 오도록 스크롤합니다. 촬영 전 예시 데이터와 폰트 로딩 완료, 2회의 animation frame을 기다리고 마우스를 기기 밖으로 이동합니다. 미리보기는 `index.html`을 1440 × 1668로 촬영합니다.

한국어·영어의 393px/320px 화면에서 다섯 메뉴의 한 줄 배치, 글자 넘침, 기존 네 메뉴 선택 상태 및 이야기 메뉴의 게시판 이동 경로를 확인했습니다. 촬영 환경은 라우터를 대체하므로 실제 인증·게시판 데이터 로딩 검증은 포함하지 않습니다.

수정·삭제 버튼은 연필·휴지통 아이콘만 표시하며 접근성 이름과 44 × 44px 터치 영역을 유지합니다. 기존 촬영본은 교체했고 6.5형 세트는 폐기했습니다.

묵상·기도·계획 상세 헤더는 앱과 동일한 컴포넌트로 렌더링합니다. 별도 줄 배치를 제거해 수정·삭제 버튼이 뒤로 가기와 같은 줄의 상단 우측에 고정됩니다. 한국어·영어의 393px/320px 화면에서 버튼 높이와 우측 여백을 확인했고, 촬영 시에도 정렬 좌표를 검사했습니다.
