import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rotisserieapp.whatsfordinner",
  appName: "What's for Dinner?",
  webDir: "dist",
  plugins: {
    SocialLogin: {
      // Only the Google native SDK is bundled — this app doesn't use Facebook/Apple/Twitter
      // sign-in, and the plugin can drop their native code from the build when disabled.
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
