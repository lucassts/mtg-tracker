#!/usr/bin/env bash
# Build para o emulador: x86_64. O APK de release normal é só ARM e não roda
# aqui — falha em carregar libreactnative.so, que parece bug do app e não é.
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
cd "$(dirname "$0")"
npx expo prebuild --platform android --no-install >/dev/null 2>&1
cd android
./gradlew assembleRelease -PreactNativeArchitectures=x86_64 --console=plain -q 2>&1 | tail -3
ls -la app/build/outputs/apk/release/app-release.apk
