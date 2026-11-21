# App icon and splash sources

These four images are the sources for the native app icons and launch
screens. `npm run cap:assets` turns them into every size Android and iOS need
(files under `android/app/src/main/res/` and `ios/App/App/Assets.xcassets/`).

| File | Size | Used for |
| --- | --- | --- |
| `icon-only.png` | 1024×1024, no transparency | iOS app icon, older Android launchers |
| `icon-foreground.png` | 1024×1024, transparent | Android adaptive icon, front layer (the hearts) |
| `icon-background.png` | 1024×1024 | Android adaptive icon, back layer (the teal gradient) |
| `splash.png` | 2732×2732 | Launch screen: rounded icon on the app's cream background (`#faf8f4`) |

They were made from the existing web logo `public/pwa-512x512.png`: the teal
gradient was rebuilt at full size, the two hearts were cut out and enlarged,
and the shadow under them was redrawn. The baked-in rounded square and pale
border of the web logo were dropped, because iOS and Android cut their own
icon shape and a second rounded square inside it looks wrong.

The web logo is only 512 px, so the hearts are upscaled about 2×. If a larger
original of the logo exists (1024 px or more, ideally with the hearts on a
transparent background), replace these files and run `npm run cap:assets`.

Notes on `npm run cap:assets`:

- It runs `@capacitor/assets` through `npx`, so it is not a project
  dependency (it pulls in the native `sharp` image library).
- It also reformats `android/app/src/main/AndroidManifest.xml` (whitespace
  only). Discard that change: `git checkout android/app/src/main/AndroidManifest.xml`.
- Android 12 and newer ignore the splash images and show the adaptive icon on
  `splash_background` (`android/app/src/main/res/values/splash.xml`).
