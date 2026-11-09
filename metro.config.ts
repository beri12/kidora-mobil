/// <reference types="node" />
/**
 * Metro config for Kidora mobile (Expo SDK 58).
 *
 * Metro bundles the code; it does NOT decide which folder holds the routes.
 * Expo CLI does that, and it is pinned in app.json:
 *   ["expo-router", { "root": "./src/app" }]
 * so routes always come from src/app, even if an old `app/` folder is lying around.
 * "Unmatched Route" on launch was fixed in src/app/index.tsx (a "/" screen that exists
 * whether you are signed in or not). After changing routes or this file, restart with:
 *   npx expo start --clear
 *
 * This file is TypeScript with type-only syntax so Node (22.18+, or 20/22 with
 * --experimental-strip-types) can load it without a build step.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultConfig } from 'expo/metro-config';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const config = getDefaultConfig(projectRoot);

// The Expo defaults already cover what the app uses: .ttf fonts (Baloo 2,
// Nunito), .png/.wav assets, TypeScript, and the src/app route tree.
// Add project-specific Metro settings below this line.

export default config;
