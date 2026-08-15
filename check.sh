#!/usr/bin/env bash
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
cd "$(dirname "$0")"
npx expo prebuild --platform android --no-install >/dev/null 2>&1
grep -o 'versionCode [0-9]*' android/app/build.gradle
cd android
./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a --console=plain -q 2>&1 | tail -3
ls -la app/build/outputs/apk/release/app-release.apk
