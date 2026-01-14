/**
 * Web-specific entry point for ChefSpAIce
 * 
 * This file is automatically used by Expo/Metro when building for web platform.
 * It loads the simplified App.web.tsx which renders just the LandingScreen
 * instead of the full app navigation stack.
 */
import { registerRootComponent } from "expo";
import App from "./App.web";

registerRootComponent(App);
