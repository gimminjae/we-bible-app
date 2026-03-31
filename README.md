# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## TODO

- ~~성경읽기~~
- ~~관심~~
- ~~메모~~
- ~~화이트/다크 모드~~
- 테마
- ~~i18n~~
- ~~성경 언어버전 선택~~
- ~~성경복사~~
- ~~기도목록~~
- ~~성경읽기표~~
- ~~성경 목표세워 읽기~~
- ~~성경 잔디~~
- ~~소셜 로그인(kakao, google)~~
- ~~sqlite 파일 데이터 동기화~~
- ~~닉네임 변경~~
- ~~비밀번호 변경~~
- 성경 인물 탐구 기능
- 비밀번호 재설정
- 푯대말씀 기능 (알림)
- 개발자에게 한마디, 1:1문의 (firebase)
- 광고 넣기
- 성경 잔디 테마 바꾸기
- 성경 이력 채우기

## Challenge TODO
- 공동체(교회) 기능
- 공동체 초대
- 공동체 인원 확장 및 결제
- 성경 읽기표 공동 목표 기능 - 성경 함께 읽기


## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. (Optional) Enable account login with Supabase

   Create a `.env` file at project root:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

   If these values are not set, the app still works normally without login.

4. (Optional) Enable Supabase social OAuth

   - In Supabase Dashboard: `Authentication > Providers > Google` and/or `Kakao` enable provider.
   - Add redirect URL using app scheme:
     - `webibleapp://auth/callback`
   - In Google Cloud OAuth, register the Supabase callback URL and client credentials.
   - In Kakao Developers, register the Supabase callback URL as the Redirect URI.
   - Because native social auth uses the app scheme callback, test it in a development build or a release build, not Expo Go.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
