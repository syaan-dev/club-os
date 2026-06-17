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

  // Load base config from app.json and add googleServicesFile dynamically.
  // eslint-disable-next-line import/no-dynamic-require,global-require
  const config = require('./app.json');

  // Only set googleServicesFile if the file was successfully created.
  if (fileCreated) {
    if (!config.expo.android) {
      config.expo.android = {};
    }
    config.expo.android.googleServicesFile = './google-services.json';
    console.log('[app.config] googleServicesFile set in config.');
  } else {
    console.warn('[app.config] googleServicesFile NOT set; build will fail if needed.');
  }

  return config;
};
