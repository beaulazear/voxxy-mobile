// App config runs before babel, so we can't use @env imports
const IS_DEV = process.env.APP_ENV === 'development' || process.env.NODE_ENV === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? "Voxxy" : "Voxxy",
    slug: "voxxy-mobile",
    description: "Connect with friends through shared activities. Organize dinners, meetings, and events with AI-powered recommendations and real-time coordination.",
    version: "1.2.16",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    privacy: "public",
    primaryColor: "#201925",
    category: "social-networking",
    scheme: "voxxy",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.beaulazear.voxxymobile",
      buildNumber: "17",
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSContactsUsageDescription: "Voxxy needs access to your contacts to help you find and invite friends to activities. Contact information is only used for sending invitations and is not stored on our servers. You can manage this permission in your device's Settings app.",
        NSPhotoLibraryUsageDescription: "Voxxy needs access to your photo library to let you choose a profile picture. Photos are only used for your profile and are not shared without your permission. You can change or remove your photo anytime.",
        NSCameraUsageDescription: "Voxxy needs access to your camera to let you take a profile picture. Photos are only used for your profile and are not shared without your permission. You can change or remove your photo anytime.",
        NSLocationWhenInUseUsageDescription: "Voxxy uses your location to recommend nearby restaurants, bars, and activities. Location data is shared with our AI recommendation service (OpenAI) to provide personalized suggestions based on your area. You can manage this permission in your device's Settings app.",
        UIBackgroundModes: ["remote-notification"]
      }
    },
    android: {
      package: "com.beaulazear.voxxymobile",
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "READ_CONTACTS",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "51d3ea24-e5e3-4902-b331-73b2a9987477"
      }
    },
    plugins: [
      "expo-font",
      "expo-notifications",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUseUsageDescription": "Voxxy uses your location to recommend nearby restaurants, bars, and activities. Location data is shared with our AI recommendation service (OpenAI) to provide personalized suggestions. You can disable this anytime in Settings.",
          "locationWhenInUseUsageDescription": "Voxxy uses your location to recommend nearby restaurants, bars, and activities. Location data is shared with our AI recommendation service (OpenAI) to provide personalized suggestions. You can disable this anytime in Settings."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you share them with your friends.",
          "cameraPermission": "The app accesses your camera to let you take photos for your profile."
        }
      ],
      "expo-dev-client"
    ],
    keywords: ["social", "activities", "events", "dining", "meetings", "friends"],
    githubUrl: "https://github.com/beaulazear/voxxy-mobile"
  }
};