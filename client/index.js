import { registerRootComponent } from "expo";
import { LogBox } from "react-native";

// Suppress warnings from third-party libraries using deprecated SafeAreaView
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
]);

import App from "@/App";

registerRootComponent(App);
