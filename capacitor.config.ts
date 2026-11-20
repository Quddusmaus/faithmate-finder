import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

// Native wrapper for the iOS and Android apps. The web build in `dist/` is
// copied into the native projects by `npm run cap:sync`.
//
// appId is permanent once the app is in the App Store / Play Store.
const config: CapacitorConfig = {
  appId: 'app.unityhearts',
  appName: 'Uniting Hearts',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // index.html uses viewport-fit=cover; the app pads itself with
      // env(safe-area-inset-*) (see "Safe areas" in src/index.css).
      initialViewportFitValueHint: 'cover',
      // Dark status-bar text: the app's background is light.
      style: 'LIGHT',
    },
    Keyboard: {
      // iOS: shrink the WebView when the keyboard opens so the chat input
      // and other bottom-anchored controls stay visible above it.
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
