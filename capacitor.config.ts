import type { CapacitorConfig } from '@capacitor/cli';

// Native wrapper for the iOS and Android apps. The web build in `dist/` is
// copied into the native projects by `npm run cap:sync`.
//
// appId is permanent once the app is in the App Store / Play Store.
const config: CapacitorConfig = {
  appId: 'app.unityhearts',
  appName: 'Uniting Hearts',
  webDir: 'dist',
};

export default config;
