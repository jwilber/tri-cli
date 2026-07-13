#!/usr/bin/env bash
# Update the Homebrew formula from an already-published npm tarball.

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-$(node -p "require('$ROOT_DIR/package.json').version")}"
FORMULA_PATH="${FORMULA_PATH:-$ROOT_DIR/Formula/tri-cli.rb}"
NPM_URL="https://registry.npmjs.org/tri-cli/-/tri-cli-${VERSION}.tgz"

echo "Fetching package from npm..."
if ! curl -fsI "$NPM_URL" >/dev/null; then
  echo "Error: Version $VERSION not found on npm"
  echo "Make sure to run 'npm publish' first"
  exit 1
fi

echo "Calculating SHA256..."
if command -v sha256sum >/dev/null 2>&1; then
  SHA256=$(curl -fsSL "$NPM_URL" | sha256sum | awk '{print $1}')
else
  SHA256=$(curl -fsSL "$NPM_URL" | shasum -a 256 | awk '{print $1}')
fi

echo "Updating formula..."
"$ROOT_DIR/scripts/render-formula.sh" "$VERSION" "$SHA256" "$FORMULA_PATH"

echo "✓ Formula updated successfully!"
echo ""
echo "Version: $VERSION"
echo "SHA256: $SHA256"
echo ""
echo "Next steps:"
echo "1. Test the formula: brew install --build-from-source $FORMULA_PATH"
echo "2. Commit changes: git add $FORMULA_PATH && git commit -m 'Update to v$VERSION'"
echo "3. If using a tap, push to your homebrew-tap repository"
