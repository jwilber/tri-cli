# tri-cli

A terminal-based interactive directory visualizer, like `tree` but with keyboard navgiation, shortcuts, and treemap visuals:

![tri demo in gif](/assets/readme.gif)

## Installation

```bash
npm install -g tri-cli
```

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

| Key   | Action                         |
| ----- | ------------------------------ |
| ↑ / ↓ | Navigate files and folders     |
| Enter | Expand or collapse a directory |
| t     | Toggle Treemap view            |
| Esc   | Clear typed shortcut           |
| q     | Quit                           |

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

Type `t` to open (and close) the treemap view, navigate with arrow keys, and press `q` to quit.

**License:**

MIT
