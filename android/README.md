# Sirim for Android (APK)

This folder adds an **installable Android app** around the existing Sirim web UI.
The source files at the repository root are **not edited**:
`index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, and the icons.

## How it works

- The Gradle build copies the original web files directly into the APK.
- Android WebViewAssetLoader serves them from a local HTTPS-like origin; no hosting or login is required.
- Saved songs continue to use the original `localStorage` mechanism, now private to the Android app.
- A small native bridge handles **Backup** (save JSON through Android's file picker), **Restore** (select JSON), and **Print** (Android print/PDF).
- Google Fonts may require internet to download. The app and songs work offline with fallback fonts.
- No changes are made to the look, song logic, or original web source.

## Build

Requires Java 17 and an installed Android SDK with API 35.

```bash
gradle -p android :app:assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Alternatively, open the **Build Android APK** GitHub Actions workflow and download its `sirim-android-debug-apk` artifact. GitHub downloads the artifact as a ZIP containing the APK.

## Important: songs and future updates

Android's WebView data is **separate** from the browser/PWA data. If you used Sirim in the browser already, make a JSON backup there, then restore it once in the Android app.

Uninstalling the Android app clears locally saved songs, so keep JSON backups. The automated workflow builds a **debug-signed test APK**. GitHub-hosted runners generate a new debug signing key on each fresh runner, so future builds are *not guaranteed to install over an older debug APK without uninstalling*. For reliable updates without losing data, configure a persistent release signing keystore and keep its password private before distributing a production APK.

An Android APK is a regular installable Android application, but this approach deliberately preserves the web UI inside a native WebView instead of rewriting its screens in Java/Kotlin.
