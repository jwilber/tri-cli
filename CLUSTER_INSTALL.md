# Cluster Installation

`tri-cli` is easiest to install on a cluster as a user-space package under `~/.local`.

## Recommended

If the cluster already provides Node.js 16+:

```bash
curl -fsSL https://raw.githubusercontent.com/jwilber/tri-cli/main/install.sh | sh
```

That installs the published package into:

- `~/.local/lib/tri-cli`
- `~/.local/bin/tri`

If `~/.local/bin` is not already on your `PATH`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Pin a Version

```bash
curl -fsSL https://raw.githubusercontent.com/jwilber/tri-cli/main/install.sh | TRI_VERSION=0.0.56 sh
```

## NPM Fallback

If you prefer npm:

```bash
npm install -g --prefix "$HOME/.local" tri-cli
export PATH="$HOME/.local/bin:$PATH"
```

## Homebrew

Homebrew is a good secondary option for macOS and Linuxbrew environments:

```bash
brew install jwilber/tap/tri-cli
```

The formula should consume the same npm tarball that the installer uses, so releases stay aligned.

## Apt

Tagged releases include a Debian package that an administrator can download and
install directly:

```bash
sudo apt install ./tri-cli_<version>_all.deb
```

For a repository-backed `apt install tri-cli` setup, the package must also be
published to a signed APT repository. See [DEBIAN.md](DEBIAN.md). For most
clusters, prefer the installer script or Homebrew unless you need a
system-wide deployment.
