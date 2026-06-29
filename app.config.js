const appJson = require('./app.json');

module.exports = () => {
  const config = { ...appJson.expo };

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  config.ios = {
    ...config.ios,
    config: { googleMapsApiKey: mapsKey },
  };

  config.android = {
    ...config.android,
    config: { googleMaps: { apiKey: mapsKey } },
  };

  config.extra = {
    ...config.extra,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId ?? '' },
  };

  return config;
};
