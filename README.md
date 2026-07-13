# tri-cli

A terminal-based interactive directory visualizer, like `tree` but with keyboard navigation, shortcuts, and treemap visuals:

![tri demo in gif](/assets/readme.gif)

## Installation

### try it without installing

```bash
npx tri-cli .
```

### via npm

```bash
npm install -g tri-cli
```

### on a cluster

If the cluster already has Node.js 16+ available:

```bash
curl -fsSL https://raw.githubusercontent.com/jwilber/tri-cli/main/install.sh | sh
```

This installs into `~/.local/bin` without requiring `sudo`. See [CLUSTER_INSTALL.md](CLUSTER_INSTALL.md) for the full flow.

### via Homebrew

```bash
brew install jwilber/tap/tri-cli
```

Or install directly from the formula file:

```bash
brew install Formula/tri-cli.rb
```

### Debian / Ubuntu

Each tagged release includes a `.deb` package. Download the matching
`tri-cli_<version>_all.deb` asset, then install it with apt:

```bash
sudo apt install ./tri-cli_<version>_all.deb
```

For a repository-backed `apt install tri-cli` setup, see
[DEBIAN.md](DEBIAN.md).

## Usage

```bash
tri [directory] [options]
```

### Examples

```bash
tri .                # visualize current directory
tri ../bionemo -L 2  # show 2 levels deep
tri --dir src        # specify directory with flag
tri --dir src  -ns   # create tree without dir/file size (faster, but no treemap)
```

### Interactive Controls

| Key   | Action                                 |
| ----- | -------------------------------------- |
| ↑ / ↓ | Navigate files and folders             |
| ←     | Collapse a folder or select its parent |
| →     | Expand a folder                        |
| Enter | Expand or collapse a directory         |
| t / m | Toggle Treemap view                    |
| Esc   | Clear typed shortcut                   |
| q     | Quit                                   |

### Options

| Option         | Description                                     |
| -------------- | ----------------------------------------------- |
| `--dir <path>` | Directory to visualize (optional if positional) |
| `-L <level>`   | Depth level to expand initially (default: 1)    |
| `-ns`          | Don't calculate sizes (faster, but no treemap)  |
| `-h, --help`   | Show help message                               |

**Example:**

```bash
tri ../bionemo -L 2
```

Type `t` or `m` to open (and close) the treemap view, navigate with arrow keys, and press `q` to quit.

## Releasing

See [RELEASING.md](RELEASING.md) for the npm, GitHub Release, Homebrew, and
Debian release flow.

**License:**

MIT
