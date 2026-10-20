# 텍스트 입력과 키보드

입력 화면은 `KeyboardScrollView`를 사용합니다. iOS에서는 화면 헤더와 안전 영역의 실제 위치를 측정한 `KeyboardAvoidingLayout`이 키보드 위까지 화면을 줄입니다. 입력란에 포커스가 들어오거나 가용 높이가 바뀌면 입력란과 아래 작업 버튼 공간이 보이도록 스크롤합니다. Android에서는 운영체제의 창 크기 조정을 사용합니다.

- `CommunityShell`은 자체 `KeyboardAvoidingLayout`을 제공합니다. 댓글 `FlatList`는 `renderScrollComponent`에 `KeyboardScrollView`를 연결합니다. 가상 목록 안의 댓글 수정 폼과 목록 끝의 새 댓글 폼에 동일하게 적용됩니다.
- `BottomSheet`는 자체적으로 키보드와 겹치는 높이만큼 올라갑니다. 내부 `KeyboardScrollView`는 문맥을 통해 중복 회피를 생략합니다. 여기에 `automaticallyAdjustKeyboardInsets`를 추가하지 않습니다.
- 새 네이티브 `Modal`은 별도 화면입니다. 부모의 회피 문맥을 이어받으면 안 되므로, `KeyboardAvoidanceContext.Provider value={false}` 안에서 새 회피 레이아웃을 시작하거나 `BottomSheet`를 사용합니다.
- 긴 여러 줄 입력은 높이를 제한하고 내부 스크롤을 유지합니다. 하단 시트 안의 고정 최소 높이로 저장 버튼을 화면 밖에 밀어내지 않습니다.
- 웹 DOM 에디터는 본문 내부 스크롤과 네이티브 포커스 연결을 별도로 유지합니다. `KeyboardScrollView`는 React Native `TextInput`만 추적합니다.

## 확인 방법

```sh
npm run test:keyboard
npx tsc --noEmit
```

실제 iPhone에서는 아래 흐름을 확인합니다. 브라우저 화면 높이 축소와 좌표 계산 테스트는 iOS 키보드·IME 확인을 대체하지 않습니다.

1. 긴 게시글의 마지막 댓글 입력과 기존 댓글 수정에서 입력란·등록 버튼을 확인합니다.
2. 키보드를 연 채 다른 입력란으로 이동하고, 여러 줄의 한글을 입력한 후 저장합니다.
3. 묵상·공동체 기도 하단 시트에서 긴 본문을 입력하고 저장 버튼까지 스크롤합니다.
4. 이름·알림 시간·문의 설정 시트, 회원 정보·계획·기도 작성 화면을 확인합니다.
5. 키보드가 열린 상태에서 시트를 열거나 키보드를 닫고 다시 열어, 여백이 중복되거나 남지 않는지 확인합니다.
