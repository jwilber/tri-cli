#!/usr/bin/env sh

set -eu

PACKAGE_NAME="tri-cli"
PREFIX="${PREFIX:-$HOME/.local}"
BIN_DIR="${BIN_DIR:-$PREFIX/bin}"
LIB_DIR="${LIB_DIR:-$PREFIX/lib/$PACKAGE_NAME}"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org}"
VERSION="${TRI_VERSION:-}"
TARBALL_URL="${TRI_TARBALL_URL:-}"

need_cmd() {
	if ! command -v "$1" >/dev/null 2>&1; then
		printf 'Missing required command: %s\n' "$1" >&2
		exit 1
	fi
}

fetch_to_file() {
	url="$1"
	output="$2"

	if command -v curl >/dev/null 2>&1; then
		curl -fsSL "$url" -o "$output"
		return
	fi

	if command -v wget >/dev/null 2>&1; then
		wget -qO "$output" "$url"
		return
	fi

	printf 'Missing required command: curl or wget\n' >&2
	exit 1
}

fetch_to_stdout() {
	url="$1"

	if command -v curl >/dev/null 2>&1; then
		curl -fsSL "$url"
		return
	fi

	if command -v wget >/dev/null 2>&1; then
		wget -qO- "$url"
		return
	fi

	printf 'Missing required command: curl or wget\n' >&2
	exit 1
}

need_cmd tar
need_cmd node

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 16 ]; then
	printf 'tri-cli requires Node.js 16 or newer. Found %s.\n' "$(node -v)" >&2
	exit 1
fi

if [ -z "$VERSION" ]; then
	VERSION="$(
		fetch_to_stdout "$NPM_REGISTRY/$PACKAGE_NAME/latest" |
			node -e "let data = ''; process.stdin.on('data', chunk => data += chunk); process.stdin.on('end', () => process.stdout.write(JSON.parse(data).version || ''));"
	)"
fi

if [ -z "$VERSION" ]; then
	printf 'Could not determine the latest %s version.\n' "$PACKAGE_NAME" >&2
	exit 1
fi

TMP_DIR="$(mktemp -d)"
ARCHIVE_PATH="$TMP_DIR/$PACKAGE_NAME-$VERSION.tgz"
STAGING_DIR="$TMP_DIR/$PACKAGE_NAME"
PACKAGE_URL="${TARBALL_URL:-$NPM_REGISTRY/$PACKAGE_NAME/-/$PACKAGE_NAME-$VERSION.tgz}"

cleanup() {
	rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

mkdir -p "$BIN_DIR" "$LIB_DIR"
fetch_to_file "$PACKAGE_URL" "$ARCHIVE_PATH"

mkdir -p "$STAGING_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$STAGING_DIR" --strip-components=1
rm -rf "$LIB_DIR"
mv "$STAGING_DIR" "$LIB_DIR"
chmod +x "$LIB_DIR/dist/cli.js"
ln -sfn "$LIB_DIR/dist/cli.js" "$BIN_DIR/tri"

printf 'Installed tri-cli %s to %s\n' "$VERSION" "$LIB_DIR"
printf 'Binary: %s/tri\n' "$BIN_DIR"

case ":$PATH:" in
	*":$BIN_DIR:"*) ;;
	*)
		printf 'Add %s to PATH if needed:\n' "$BIN_DIR"
		printf '  export PATH="%s:$PATH"\n' "$BIN_DIR"
		;;
esac
