import { ExpoConfig, ConfigContext } from "expo/config";
import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const existingPlugins = (appJson.expo.plugins || []) as any[];

  const plugins = existingPlugins.map((plugin) => {
    if (plugin === "@sentry/react-native/expo") {
      return [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ];
    }
    return plugin;
  });

  return {
    ...appJson.expo,
    plugins,
  } as ExpoConfig;
};
