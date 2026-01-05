// Import error suppression first, before any React/RN imports
import "./suppressConsoleErrors";

import { registerRootComponent } from "expo";
import App from "@/App";

registerRootComponent(App);
