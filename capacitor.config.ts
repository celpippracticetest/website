import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.celpippracticetest.app',
  appName: 'CELPIP Practice Test',
  webDir: 'public', // Just needs to point to an existing directory
  server: {
    // Point to your live Vercel deployment
    url: 'https://celpippracticetest.com',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F4F7FF',
      showSpinner: true,
      spinnerColor: '#3B82F6',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#3B82F6',
    },
  },
};

export default config;