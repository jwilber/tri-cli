#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
TARBALL="${1:-}"
OUTPUT="${2:-}"

need_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		printf 'Missing required command: %s\n' "$1" >&2
		exit 1
	fi
}

need_command dpkg-deb
need_command node
need_command tar

if [[ -z "$TARBALL" ]]; then
	mkdir -p "$RELEASE_DIR"
	(
		cd "$ROOT_DIR"
		npm pack --pack-destination release
	)
	TARBALL="$(find "$RELEASE_DIR" -maxdepth 1 -name 'tri-cli-*.tgz' -print -quit)"
fi

if [[ -z "$TARBALL" || ! -f "$TARBALL" ]]; then
	printf 'Could not find an npm package tarball. Pass one as the first argument.\n' >&2
	exit 1
fi

STAGING_DIR="$(mktemp -d)"
cleanup() {
	rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

PACKAGE_DIR="$STAGING_DIR/tri-cli"
install -d "$PACKAGE_DIR/DEBIAN" "$PACKAGE_DIR/usr/bin" "$PACKAGE_DIR/usr/lib/tri-cli"
tar --extract --gzip --file "$TARBALL" --strip-components=1 --directory "$PACKAGE_DIR/usr/lib/tri-cli"

VERSION="$(node -p "require(process.argv[1]).version" "$PACKAGE_DIR/usr/lib/tri-cli/package.json")"
DEBIAN_VERSION="${VERSION/-/\~}"
OUTPUT="${OUTPUT:-$RELEASE_DIR/tri-cli_${DEBIAN_VERSION}_all.deb}"
mkdir -p "$(dirname -- "$OUTPUT")"

printf '%s\n' \
	'Package: tri-cli' \
	"Version: $DEBIAN_VERSION" \
	'Section: utils' \
	'Priority: optional' \
	'Architecture: all' \
	'Maintainer: Jared Wilber <jwilber@nvidia.com>' \
	'Depends: nodejs (>= 16)' \
	'Description: Interactive terminal directory tree and treemap visualizer' \
	' tri-cli provides an interactive terminal view of a directory tree,' \
	' including size-aware treemap rendering.' \
	> "$PACKAGE_DIR/DEBIAN/control"

ln -s ../lib/tri-cli/dist/cli.js "$PACKAGE_DIR/usr/bin/tri"
chmod 0755 "$PACKAGE_DIR/usr/lib/tri-cli/dist/cli.js"

if [[ -f "$PACKAGE_DIR/usr/lib/tri-cli/README.md" ]]; then
	install -d "$PACKAGE_DIR/usr/share/doc/tri-cli"
	cp "$PACKAGE_DIR/usr/lib/tri-cli/README.md" "$PACKAGE_DIR/usr/share/doc/tri-cli/README.md"
fi

if [[ -f "$PACKAGE_DIR/usr/lib/tri-cli/LICENSE" ]]; then
	install -d "$PACKAGE_DIR/usr/share/doc/tri-cli"
	cp "$PACKAGE_DIR/usr/lib/tri-cli/LICENSE" "$PACKAGE_DIR/usr/share/doc/tri-cli/copyright"
fi

dpkg-deb --build --root-owner-group "$PACKAGE_DIR" "$OUTPUT"
printf 'Created %s\n' "$OUTPUT"
