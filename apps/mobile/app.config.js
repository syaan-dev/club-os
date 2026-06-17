// This config resolves the google-services.json path at build time.
// For EAS file-type secrets, EAS decodes the file and writes it to disk,
// then exposes the env var as the PATH to that file (not base64 content).
// Locally, we fall back to the file in the project root.
module.exports = () => {
  // EAS sets this env var to the path of the decoded secret file.
  // Locally it is unset, so we use the local file path.
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || './google-services.json';

  console.log(`[app.config] googleServicesFile: ${googleServicesFile}`);

  // Build the config object.
  const config = {
    expo: {
      name: 'Club OS',
      slug: 'club-os',
      version: '1.0.0',
      scheme: 'clubos',
      orientation: 'portrait',
      userInterfaceStyle: 'light',
      icon: './assets/icon.png',
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.syaan.clubos',
      },
      android: {
        package: 'com.syaan.clubos',
        versionCode: 1,
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        googleServicesFile,
      },
      web: {
        bundler: 'metro',
        output: 'single',
      },
      plugins: [
        'expo-asset',
        'expo-router',
        [
          'expo-splash-screen',
          {
            image: './assets/splash-icon.png',
            imageWidth: 200,
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
          },
        ],
        [
          'expo-notifications',
          {
            color: '#3a6ff7',
          },
        ],
      ],
      experiments: {
        typedRoutes: true,
      },
      extra: {
        eas: {
          projectId: '36b467e0-4867-4cd9-b2fb-57d0e7b599a1',
        },
        router: {},
      },
      owner: 'syaan.dev',
    },
  };

  return config;
};
