import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.desiredlabs.app',
  appName: 'Desired Labs',
  webDir: 'dist',
  // Option B: the native shell loads the LIVE web app, so web/feature updates
  // reach installed apps instantly (no rebuild). webDir/dist stays as the build
  // target for `cap sync` and as an offline fallback. Rebuild only for native
  // shell changes (icon, plugins, SDK bumps).
  server: {
    // Open straight into the client portal (redirects to /app/login when signed
    // out) — the mobile app's primary audience is business owners; EAs/CPAs work
    // on desktop. Loads the live SPA, so web updates reach the app instantly.
    url: 'https://desiredlabs.ai/app',
    cleartext: false,
  },
};

export default config;
