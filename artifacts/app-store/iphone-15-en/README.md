# We Bible — iPhone 15 screenshots

Seven English images reflecting the refreshed colors and icons and the unified **Members · Reading Plans · Prayers · Teams · Stories** menu, plus icon-only edit/delete actions on detail pages, on October 21, 2026.

| Order | File | Feature |
|---|---|---|
| 1 | `01-bible-reading.jpg` | Bible reading |
| 2 | `02-prayer.jpg` | Prayer |
| 3 | `03-memo.jpg` | Memos |
| 4 | `04-bible-grass.jpg` | Bible grass |
| 5 | `05-reading-plan.jpg` | Reading plans |
| 6 | `06-community.jpg` | Community · unified menus and shared plans |
| 7 | `07-member-info.jpg` | Member information |

## Format and rendering

- Base iPhone 15: **1179 × 2556 pixels**, portrait. [Apple technical specifications](https://support.apple.com/en-ie/111831)
- JPEG, RGB, sRGB, no alpha/transparency
- App viewport: 393 × 852 CSS pixels, with a 59px top system area, a 34px home area, and a Dynamic Island style frame.
- These are promotional images of current React Native components rendered on the web using fictional sample data, captured with Playwright and local headless Chrome. They are not physical-device captures; native iOS fonts and system areas may differ.
- No real account or production database was used. The isolated English fixture translates the existing reading-plan chapter summary and grass chapter suffix.
- Use the seven originals in `screenshots/`. `preview.jpg` is a contact sheet, `index.html` is the gallery, and `manifest.json` records dimensions, format, file size, and SHA-256.

## Reproduce

`source/features.json` controls copy and accents, `source/gallery.html` controls the frame and composition, `source/capture.jsx` composes the app, and `source/prepare_capture.py` prepares fictional fixtures.

From the repository root:

```sh
python3 artifacts/app-store/iphone-15-en/source/prepare_capture.py
```

From `/private/tmp/we-bible-iphone15-capture-en`:

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx expo export --platform web --output-dir /private/tmp/we-bible-store-web-en
python3 -m http.server 8089 --bind 127.0.0.1 --directory /private/tmp/we-bible-store-web-en
```

In another terminal, from the repository root:

```sh
python3 -m http.server 8096 --bind 127.0.0.1 --directory artifacts/app-store
```

Open `http://127.0.0.1:8096/iphone-15-en/source/gallery.html?feature=bible` at 1179 × 2556, DPR 1. Features: `bible`, `prayer`, `memo`, `grass`, `plan`, `church`, `metadata`.

Select Reading Plans for the community shot. For the individual plan, scroll its content container until the progress card is 16px below its top. Wait for sample data, fonts, and two animation frames, then move the pointer outside the phone before capture. Capture `index.html` at 1440 × 1668 for the contact sheet.

Korean and English menus were checked at widths of 393px and 320px: five adjacent buttons, no label overflow, four existing selections, and the Stories route destination. The isolated router is stubbed, so this does not verify production authentication or board data loading.

Edit/delete actions display only pencil/trash icons while retaining accessible names and 44 × 44px touch targets. Previous captures have been replaced and the old 6.5-inch sets discarded.

Memo, prayer, and plan detail headers render the same components as the app. Edit/delete actions stay at the top right on the same row as Back. Alignment was checked at 393px/320px in Korean and English, and button coordinates were checked again during capture.
