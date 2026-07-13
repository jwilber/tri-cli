#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
	printf 'Usage: %s <version> <sha256> [output]\n' "$0" >&2
	exit 1
fi

VERSION="$1"
SHA256="$2"
OUTPUT="${3:-Formula/tri-cli.rb}"

if [[ ! "$SHA256" =~ ^[a-fA-F0-9]{64}$ ]]; then
	printf 'SHA256 must be a 64-character hexadecimal value.\n' >&2
	exit 1
fi

mkdir -p "$(dirname -- "$OUTPUT")"
printf '%s\n' \
	'class TriCli < Formula' \
	'  desc "Interactive CLI directory tree visualizer with treemap view"' \
	'  homepage "https://github.com/jwilber/tri-cli"' \
	"  url \"https://registry.npmjs.org/tri-cli/-/tri-cli-${VERSION}.tgz\"" \
	"  sha256 \"$SHA256\"" \
	'  license "MIT"' \
	'' \
	'  depends_on "node"' \
	'' \
	'  def install' \
	'    system "npm", "install", *std_npm_args' \
	'    bin.install_symlink Dir["#{libexec}/bin/*"]' \
	'  end' \
	'' \
	'  test do' \
	'    system "#{bin}/tri", "--help"' \
	'  end' \
	'end' \
	> "$OUTPUT"
