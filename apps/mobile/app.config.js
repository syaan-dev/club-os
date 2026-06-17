const fs = require('fs');
const path = require('path');

// This config helper writes google-services.json at build time from an EAS secret.
// EAS injects file secrets as base64-encoded environment variables.
// We decode and write the file so the Android config plugin can find it.
module.exports = () => {
  const projectRoot = __dirname;
  const dest = path.join(projectRoot, 'google-services.json');

  console.log('[app.config] Setting up google-services.json...');

  // Try to write google-services.json from EAS secret (base64 encoded)
  if (process.env.GOOGLE_SERVICES_JSON_V1) {
    try {
      const b64 = process.env.GOOGLE_SERVICES_JSON_V1;
      const json = Buffer.from(b64, 'base64').toString('utf8');

      // Validate JSON before writing
      JSON.parse(json);

      fs.writeFileSync(dest, json, { encoding: 'utf8' });
      console.log('[app.config] ✓ google-services.json written');
    } catch (err) {
      console.error('[app.config] ✗ Failed to write google-services.json:', err.message);
    }
  }

  // Build the config object.
  const config = {
    expo: {
      name: 'Club OS',
      slug: 'club-os',
      version: '1.0.0',
      scheme: 'clubos',
      orientation: 'portrait',
      userInterfaceStyle: 'light',
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.syaan.clubos',
      },
      android: {
        package: 'com.syaan.clubos',
        versionCode: 1,
        adaptiveIcon: {
          backgroundColor: '#ffffff',
        },
        // Use the file if it was created, otherwise fallback to local path
        googleServicesFile: './google-services.json',
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
