import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitstats.tracker',
  appName: 'FitStats',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
