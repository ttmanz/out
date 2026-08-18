module.exports = () => {
  const config = {
    name: "Find - Mee",
    slug: "find-mee",
    scheme: "outandaround",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    primaryColor: "#c8800a",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0d0a03"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.ttleisureland.findmee",
      buildNumber: "1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Find-Mee uses your location to show nearby members on the At Venue map and tag posts with your area.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Find-Mee uses your location to show nearby members on the At Venue map and tag posts with your area.",
        NSCameraUsageDescription: "Find-Mee uses your camera to take profile photos and post images.",
        NSPhotoLibraryUsageDescription: "Find-Mee accesses your photo library to upload profile photos and post images.",
        NSPhotoLibraryAddUsageDescription: "Find-Mee saves photos to your library.",
        NSMicrophoneUsageDescription: "Find-Mee may access your microphone for video features."
      }
    },
    android: {
      package: "com.ttleisureland.findmee",
      // Local dev/prebuild reads the git-ignored file straight off disk;
      // EAS Build injects the path via the GOOGLE_SERVICES_JSON file secret
      // instead, since the git-ignored file itself never reaches the builder.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      versionCode: 1,
      softwareKeyboardLayoutMode: "resize",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET"
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
        backgroundColor: "#0d0a03"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-web-browser",
      "expo-apple-authentication",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Find-Mee uses your location to show nearby members on the At Venue map and tag posts with your area."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Find-Mee accesses your photos to upload profile and post images.",
          cameraPermission: "Find-Mee uses your camera to take profile and post photos."
        }
      ],
      "@react-native-community/datetimepicker",
      "expo-video",
      [
        "expo-notifications",
        {
          color: "#c8800a",
          sounds: []
        }
      ]
    ],
    owner: "ttmanzs-team"
  };

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
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '02b0d6f0-c1a0-4746-a57b-3cfd8ed6a1dd' },
  };

  return { expo: config };
};
