# We Bible — English App Store screenshots

Seven English screenshots matching the approved Korean design. Upload the individual JPEG files in `screenshots`, in the order below.

| Order | File | Feature |
|---|---|---|
| 1 | `01-bible-reading.jpg` | Bible reading and favorite verses |
| 2 | `02-prayer.jpg` | Prayer requests and dated prayer entries |
| 3 | `03-memo.jpg` | Reflection notes linked to Scripture |
| 4 | `04-bible-grass.jpg` | Bible grass and recent reading history |
| 5 | `05-reading-plan.jpg` | Reading plans, progress, and chapter tracking |
| 6 | `06-community.jpg` | Community reading plans and shared progress |
| 7 | `07-member-info.jpg` | Member profiles, contact details, and custom fields |

## File specifications

- Each screenshot: **1242 × 2688 pixels**, portrait
- JPEG, RGB, sRGB IEC61966-2.1, no alpha/transparency
- Target: iPhone 6.5-inch App Store screenshot slot
- Apple specification: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- `preview.jpg`: contact sheet for review; upload the seven individual screenshots instead.
- `index.html`: offline gallery with links to the original images.
- `manifest.json`: dimensions, format, file size, and SHA-256 for each screenshot.

## How the screens were made

Existing React Native UI components were rendered on the web in an isolated local capture app with fictional English data. These are not direct native iPhone captures; fonts, icons, and system areas can differ on iOS. The device frame and marketing layout were composed in HTML/CSS.

Names, contact details, community data, prayers, notes, and reading history are fictional. No real account or production database was used. Prayer, memo, grass, plan, community, and member information use the existing pages. Bible reading reuses BibleHeader, BibleContent, and ChapterNav, displaying Psalm 23 in English (KJV).

The capture app uses the existing English localization. Two remaining hardcoded Korean labels (plan book/chapter totals and reading-history chapter suffixes) were translated in the temporary capture copy only. The Bible font scale and example plan title were adjusted to fit English text. Production app sources were not changed.

## Rebuilding

Edit `source/features.json` for marketing copy/colors, `source/gallery.html` for the composition, `source/prepare_capture.py` for sample data, and `source/capture.jsx` for the capture shell.

From the repository root:

```sh
python3 artifacts/app-store/iphone-6.5-en/source/prepare_capture.py
```

This creates `/private/tmp/we-bible-app-store-capture-en`. From that directory:

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx expo start --web --port 8088
```

In another terminal, from the repository root:

```sh
python3 -m http.server 8091 --bind 127.0.0.1 --directory artifacts/app-store/iphone-6.5-en
```

Set the browser viewport to 1242 × 2688 at DPR 1 and open `http://localhost:8091/source/gallery.html?feature=bible`. Feature values: `bible`, `prayer`, `memo`, `grass`, `plan`, `church`, `metadata`. Wait for the app, fonts, and icons to finish rendering before capturing.

For the community image, select the **Reading Plans** tab. For the plan image, scroll the app body down approximately 224 CSS pixels to show progress and completed/uncompleted chapters. Other screens use their initial view. The contact sheet uses `index.html` at 1440 × 1664.

The browser capture tool returns JPEG bytes; save with the `.jpg` extension.
