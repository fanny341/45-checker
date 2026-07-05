#!/bin/bash
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEYSTORE="$PROJECT_DIR/keystore/gp45.keystore"
KEY_ALIAS="gp45"
KEY_PASS="android"
OUTPUT_DIR="$PROJECT_DIR/output"
TEMPLATE="$PROJECT_DIR/template/template.apk"
VERSION="${1:-1.0.0}"
VERSION_CODE="${2:-1}"

# Generate timestamp for versioned filename
BUILD_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Find Android SDK build tools
if [ -z "$ANDROID_HOME" ]; then
  ANDROID_HOME="$HOME/Android/Sdk"
fi
BUILD_TOOLS="$ANDROID_HOME/build-tools"
if [ -d "$BUILD_TOOLS" ]; then
  LATEST=$(ls -1 "$BUILD_TOOLS" | sort -V | tail -1)
  export PATH="$BUILD_TOOLS/$LATEST:$PATH"
fi

# Also check common paths
if ! command -v zipalign &>/dev/null; then
  for dir in /usr/local/lib/android/sdk/build-tools/* /opt/android-sdk/build-tools/*; do
    if [ -d "$dir" ]; then
      export PATH="$dir:$PATH"
      break
    fi
  done
fi

mkdir -p "$OUTPUT_DIR" "$PROJECT_DIR/template"

if [ ! -f "$KEYSTORE" ]; then
    echo "=== Generating keystore ==="
    keytool -genkey -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass "$KEY_PASS" -keypass "$KEY_PASS" \
        -dname "CN=GP45, O=GP45, C=ID" 2>&1
fi

echo "=== GP45 Build v$VERSION (Build: $BUILD_TIMESTAMP) ==="

BUILD_DIR="$OUTPUT_DIR/build_$$"
mkdir -p "$BUILD_DIR"
unzip -o "$TEMPLATE" -d "$BUILD_DIR" > /dev/null 2>&1
rm -rf "$BUILD_DIR/META-INF"

# Replace assets
rm -rf "$BUILD_DIR/assets"
cp -r "$PROJECT_DIR/assets" "$BUILD_DIR/assets"

# Clean up any backup files
find "$BUILD_DIR/assets" -name "*.bak" -o -name "*~" | xargs rm -f 2>/dev/null || true

cd "$BUILD_DIR"
zip -r -0 -X "$OUTPUT_DIR/gp45_unsigned.apk" . > /dev/null 2>&1
cd "$PROJECT_DIR"

zipalign -f -v 4 "$OUTPUT_DIR/gp45_unsigned.apk" "$OUTPUT_DIR/gp45_aligned.apk" 2>&1 | tail -3

# Generate versioned APK filename: GP45_v1.1.0_20260705_031602.apk
FINAL_APK="$OUTPUT_DIR/GP45_v${VERSION}_${BUILD_TIMESTAMP}.apk"

apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KEY_PASS" \
    --ks-key-alias "$KEY_ALIAS" \
    --v1-signing-enabled true \
    --v2-signing-enabled true \
    --v3-signing-enabled true \
    --out "$FINAL_APK" \
    "$OUTPUT_DIR/gp45_aligned.apk" 2>&1

apksigner verify --verbose "$FINAL_APK" 2>&1 | grep -E "Verif|v1|v2|v3"

# Also create a simple versioned copy (without timestamp) for easy reference
SIMPLE_APK="$OUTPUT_DIR/GP45_v${VERSION}.apk"
cp "$FINAL_APK" "$SIMPLE_APK"

# Copy to shared Download if available
MOBILE_OUTFILE="/sdcard/Download/GP45_v${VERSION}_${BUILD_TIMESTAMP}.apk"
cp "$FINAL_APK" "$MOBILE_OUTFILE" 2>/dev/null || echo "Note: /sdcard/Download not available (CI build)"

# Create a versions.txt log
echo "[$(date)] Built: GP45 v$VERSION (Code: $VERSION_CODE) - $FINAL_APK" >> "$OUTPUT_DIR/versions.txt"

rm -rf "$BUILD_DIR"
rm -f "$OUTPUT_DIR/gp45_unsigned.apk" "$OUTPUT_DIR/gp45_aligned.apk"

echo ""
echo "=== BUILD COMPLETE ==="
echo "📦 Timestamped APK: $FINAL_APK"
echo "📦 Simple version:  $SIMPLE_APK"
echo ""
ls -lah "$FINAL_APK" "$SIMPLE_APK"
echo ""
echo "All builds stored in: $OUTPUT_DIR"
ls -lah "$OUTPUT_DIR"/GP45_v*.apk 2>/dev/null | tail -10
