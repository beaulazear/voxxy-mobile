export default {
  expo: {
    name: "Voxxy",
    slug: "voxxy-mobile",
    description: "Connect with friends through shared activities. Organize dinners, meetings, and events with AI-powered recommendations and real-time coordination.",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    privacy: "public",
    primaryColor: "#201925",
    category: "social-networking",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.beaulazear.voxxymobile",
      buildNumber: "1.1.2",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSContactsUsageDescription: "This app needs access to contacts to help you find friends who are already using Voxxy."
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
        "READ_CONTACTS"
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
          "locationAlwaysAndWhenInUseUsageDescription": "Allow $(PRODUCT_NAME) to use your location to find nearby restaurants."
        }
      ]
    ],
    keywords: ["social", "activities", "events", "dining", "meetings", "friends"],
    githubUrl: "https://github.com/beaulazear/voxxy-mobile"
  }
};