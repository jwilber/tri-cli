# tri-cli

A terminal-based interactive directory visualizer, like `tree` but with keyboard navigation, shortcuts, colors, and [treemap](https://en.wikipedia.org/wiki/Treemapping) visuals:

![tri demo in gif](/assets/readme.gif)


## Installation

### Global Installation (Recommended)

It's recommended to install globally:

```bash
npm install -g tri-cli
```

After global installation, you can run `tri` directly from anywhere:

```bash
tri .
```

### Local Installation

If you don't want to install globally, you can install locally and then run anywhere with `npx`:

```bash
npm install tri-cli
```

For local installations, use `npx` to run the command:

```bash
npx tri .
```

Or add it to your `package.json` scripts:

```json
{
  "scripts": {
    "tree": "tri"
  }
}
```

Then run with `npm run tree`.

## Usage

```bash
tri [directory] [options]
```

### Examples

```bash
tri .                # visualize current directory
tri ../bionemo -L 2  # show 2 levels deep
tri --dir src        # specify directory with flag
tri src -s           # preload all sizes (enables immediate treemap)
tri --dir src -c     # start with all directories collapsed
```

### Interactive Controls

| Key           | Action                                    |
| ------------- | ----------------------------------------- |
| ↑ / ↓         | Navigate files and folders                |
| Enter         | Expand or collapse a directory            |
| [a-z]/[0-9]   | Type shortcut to jump to item             |
| d             | Calculate and display sizes recursively   |
| l             | Show last modified dates (ls -l style)    |
| m             | Toggle treemap view                       |
| Esc           | Clear typed shortcut                      |
| q             | Quit                                      |

### Command Line Options

| Option           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `[directory]`    | Directory to visualize (default: current dir)    |
| `-L <level>`     | Maximum depth to load initially (default: 1)     |
| `-s, --size`     | Preload all file/directory sizes                 |
| `-c, --collapse` | Start with all directories collapsed             |
| `-h, --help`     | Show help message                                |

## Features

### Tree View
- **Keyboard shortcuts**: Each item gets a shortcut label - just type it to jump there instantly
- **Tree-style lines**: Visual hierarchy with Unicode box-drawing characters (├─, ╰─, │)
- **Color coding**: Different colors for different file types
- **Lazy loading**: Only loads directory contents when you expand them (fast for large directories)
- **Size calculation**: Press `d` on any item to calculate disk usage recursively
- **Date display**: Press `l` to show last modified dates in `ls -l` format

### Treemap View
- Press `m` to visualize the selected directory as a treemap
- Visual representation of file/directory sizes
- Hierarchical rectangles sized proportionally to disk usage
- Color-coded by file type or directory group

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/jwilber/tri-cli.git
cd tri-cli
npm install
```

Build and link for local development:

```bash
npm run build
npm link
```

Now you can run `tri` from anywhere and it will use your local development version.

## License

MIT

## Author

Jared Wilber