const fs = require('fs');
const path = require('path');

// This config helper writes google-services.json at build time from an EAS secret.
// EAS exposes file secrets as base64-encoded environment variables.
// The secret name (GOOGLE_SERVICES_JSON) becomes an env var with base64 content.
module.exports = () => {
  const projectRoot = __dirname;
  const dest = path.join(projectRoot, 'google-services.json');

  console.log(`[app.config] projectRoot: ${projectRoot}`);
  console.log(`[app.config] destination: ${dest}`);
  console.log(`[app.config] GOOGLE_SERVICES_JSON env var present: ${Boolean(process.env.GOOGLE_SERVICES_JSON)}`);

  let fileCreated = false;

  // EAS file secrets are exposed as base64-encoded environment variables.
  // The env var name matches the secret name.
  if (process.env.GOOGLE_SERVICES_JSON) {
    const b64 = process.env.GOOGLE_SERVICES_JSON;
    console.log(`[app.config] GOOGLE_SERVICES_JSON env var length: ${b64.length}`);

    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      fs.writeFileSync(dest, json, { encoding: 'utf8' });
      console.log('[app.config] ✓ Wrote google-services.json from EAS env var (base64 decoded).');
      fileCreated = true;
    } catch (err) {
      console.error('[app.config] ✗ Failed to decode/write google-services.json:', err.message);
    }
  } else {
    console.warn('[app.config] ⚠ GOOGLE_SERVICES_JSON env var not found.');
  }

  if (!fileCreated) {
    console.warn('[app.config] ⚠ google-services.json was NOT created; build may fail.');
  }

  // Build the config object. This is the source of truth (no app.json).
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

  // Conditionally add googleServicesFile only if file was successfully created.
  if (fileCreated) {
    config.expo.android.googleServicesFile = './google-services.json';
    console.log('[app.config] googleServicesFile set in config.');
  } else {
    console.warn('[app.config] googleServicesFile NOT set; build will fail if needed.');
  }

  return config;
};
