const fs = require('fs');
const path = require('path');

// This config helper copies google-services.json at build time. EAS Build
// stores file secrets at $EAS_BUILD_SENSITIVE_DIR/secrets/<secret-name>.
// This function runs before config plugins, so copying the file here makes it
// available to the Android config plugin that expects ./google-services.json.
module.exports = () => {
  const projectRoot = __dirname;
  const dest = path.join(projectRoot, 'google-services.json');

  // Try EAS file secret first (recommended for EAS Build).
  const sensitiveDir = process.env.EAS_BUILD_SENSITIVE_DIR;
  const easFileSecret = sensitiveDir
    ? path.join(sensitiveDir, 'secrets', 'GOOGLE_SERVICES_JSON')
    : null;

  if (easFileSecret && fs.existsSync(easFileSecret)) {
    try {
      fs.copyFileSync(easFileSecret, dest);
      console.log('Copied google-services.json from EAS file secret.');
    } catch (err) {
      console.warn('Failed to copy google-services.json from EAS file secret:', err.message || err);
    }
  } else if (process.env.GOOGLE_SERVICES_JSON_B64 || process.env.GOOGLE_SERVICES_JSON_BASE64) {
    // Fallback: base64 env var (for local testing or alternative CI).
    const b64 = process.env.GOOGLE_SERVICES_JSON_B64 || process.env.GOOGLE_SERVICES_JSON_BASE64;
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      fs.writeFileSync(dest, json, { encoding: 'utf8' });
      console.log('Wrote google-services.json from base64 environment variable.');
    } catch (err) {
      console.warn('Failed to write google-services.json from env:', err.message || err);
    }
  } else {
    console.log('No google-services.json source found (no EAS secret or env var set).');
  }

  // Return the existing app.json so the rest of Expo's config flow is unchanged.
  // eslint-disable-next-line import/no-dynamic-require,global-require
  return require('./app.json');
};
