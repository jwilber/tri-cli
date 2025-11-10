import React from 'react';
import { Text, Box } from 'ink';
import { hierarchy, treemap, treemapBinary } from 'd3-hierarchy';

// One Hunter color scheme
const oneHunter = {
  bg: '#282c34',
  bgAlt: '#21252b',
  text: '#abb2bf',
  textAlt: '#5c6370',
  red: '#e06c75',
  orange: '#d19a66',
  yellow: '#e5c07b',
  green: '#98c379',
  cyan: '#56b6c2',
  blue: '#61afef',
  purple: '#c678dd',
  magenta: '#c678dd',
};

// Expanded color palette for directories
const dirColors = [
  oneHunter.blue,
  oneHunter.cyan,
  oneHunter.green,
  oneHunter.yellow,
  oneHunter.orange,
  oneHunter.red,
  oneHunter.purple,
  oneHunter.magenta,
  '#4a9eff',
  '#7ec699',
  '#e8b339',
  '#ff7eb6',
];

// Function to format bytes to human readable
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get color based on file extension
const getFileColor = (filename) => {
  const ext = filename.match(/\.[^.]+$/)?.[0]?.toLowerCase();
  const colorMap = {
    '.js': oneHunter.yellow,
    '.jsx': oneHunter.yellow,
    '.ts': oneHunter.blue,
    '.tsx': oneHunter.blue,
    '.py': oneHunter.green,
    '.rb': oneHunter.red,
    '.json': oneHunter.purple,
    '.html': oneHunter.cyan,
    '.css': oneHunter.cyan,
    '.md': oneHunter.text,
    '.txt': oneHunter.textAlt,
    '.sh': oneHunter.green,
    '.yml': oneHunter.purple,
    '.yaml': oneHunter.purple,
    '.xml': oneHunter.orange,
    '.svg': oneHunter.cyan,
    '.png': oneHunter.blue,
    '.jpg': oneHunter.blue,
    '.gif': oneHunter.blue,
    '.pdf': oneHunter.red,
  };
  return colorMap[ext] || oneHunter.text;
};

// Simple hash function for consistent color assignment
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Assign colors to directory groups
const assignGroupColors = (root) => {
  const colorMap = new Map();
  
  if (root.children) {
    root.children.forEach((child) => {
      if (!child.data.isFile) {
        const colorIndex = hashString(child.data.name) % dirColors.length;
        colorMap.set(child.data.name, dirColors[colorIndex]);
      }
    });
  }
  
  root.descendants().forEach(node => {
    if (!node.data.isFile && node !== root) {
      let topAncestor = node;
      while (topAncestor.parent && topAncestor.parent !== root) {
        topAncestor = topAncestor.parent;
      }
      
      if (colorMap.has(topAncestor.data.name)) {
        node.groupColor = colorMap.get(topAncestor.data.name);
      } else {
        const colorIndex = hashString(node.data.name) % dirColors.length;
        node.groupColor = dirColors[colorIndex];
      }
    }
  });
  
  return colorMap;
};

export const TreeMapView = ({ selectedNode, stdout }) => {
  if (!selectedNode || !selectedNode.data) {
    return (
      <Box flexDirection="column">
        <Text bold color={oneHunter.red}>Error: Invalid node selected</Text>
        <Text dimColor color={oneHunter.textAlt}>Press 't' to go back to tree view</Text>
      </Box>
    );
  }
  
  const width = Math.min(stdout?.columns || 80, 120) - 4;
  const height = Math.min(stdout?.rows || 24, 40) - 8;
  
  // If it's a file, show just that file as a big rectangle
  if (selectedNode.data.isFile) {
    const color = getFileColor(selectedNode.data.name);
    const name = selectedNode.data.name;
    const sizeStr = selectedNode.data.size ? formatBytes(selectedNode.data.size) : '';
    
    const grid = Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({ char: ' ', color }))
    );
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isTop = y === 0;
        const isBottom = y === height - 1;
        const isLeft = x === 0;
        const isRight = x === width - 1;
        
        let char = ' ';
        
        if (isTop && isLeft) char = '┌';
        else if (isTop && isRight) char = '┐';
        else if (isBottom && isLeft) char = '└';
        else if (isBottom && isRight) char = '┘';
        else if (isTop || isBottom) char = '─';
        else if (isLeft || isRight) char = '│';
        else char = ' ';
        
        grid[y][x] = { char, color };
      }
    }
    
    const midY = Math.floor(height / 2);
    const nameX = Math.floor((width - name.length) / 2);
    
    if (midY >= 2 && midY < height - 2) {
      for (let i = 0; i < name.length && nameX + i < width - 2; i++) {
        if (nameX + i > 0) {
          grid[midY][nameX + i] = { char: name[i], color };
        }
      }
      
      if (sizeStr && midY + 2 < height - 2) {
        const sizeX = Math.floor((width - sizeStr.length) / 2);
        for (let i = 0; i < sizeStr.length && sizeX + i < width - 2; i++) {
          if (sizeX + i > 0) {
            grid[midY + 2][sizeX + i] = { char: sizeStr[i], color };
          }
        }
      }
    }
    
    const lines = grid.map((row, y) => {
      const segments = [];
      let currentColor = null;
      let currentText = '';
      
      row.forEach((cell) => {
        if (cell.color === currentColor) {
          currentText += cell.char;
        } else {
          if (currentText) {
            segments.push(<Text key={segments.length} color={currentColor}>{currentText}</Text>);
          }
          currentColor = cell.color;
          currentText = cell.char;
        }
      });
      
      if (currentText) {
        segments.push(<Text key={segments.length} color={currentColor}>{currentText}</Text>);
      }
      
      return <Box key={y}>{segments}</Box>;
    });
    
    return (
      <Box flexDirection="column">
        <Text bold color={oneHunter.cyan}>TreeMap View: {name} (File)</Text>
        <Text dimColor color={oneHunter.textAlt}>Press 't' to toggle back to tree view | Ctrl+C: Exit</Text>
        <Box borderStyle="single" borderColor={oneHunter.textAlt} flexDirection="column" marginTop={1}>
          {lines}
        </Box>
        <Text dimColor color={oneHunter.textAlt} marginTop={1}>
          File: {name} | Size: {sizeStr || 'Unknown'}
        </Text>
      </Box>
    );
  }
  
  // It's a directory - show treemap of its children
  if (!selectedNode.children || selectedNode.children.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color={oneHunter.cyan}>TreeMap View: {selectedNode.data.name} (Empty Directory)</Text>
        <Text dimColor color={oneHunter.textAlt}>Press 't' to toggle back to tree view | Ctrl+C: Exit</Text>
        <Box borderStyle="single" borderColor={oneHunter.textAlt} marginTop={1} padding={1}>
          <Text color={oneHunter.textAlt}>This directory is empty or collapsed.</Text>
        </Box>
      </Box>
    );
  }
  
  const root = hierarchy(selectedNode.data)
  .sum(d => d.value || 0)
  .sort((a, b) => (b.value || 0) - (a.value || 0));

assignGroupColors(root);

// Apply treemap layout
treemap()
  .tile(treemapBinary)
  .size([width, height])
  .paddingOuter(0.5)
  .paddingTop(0.5)
  .paddingInner(0.5)
  .round(true)
  (root);

// Only show direct children (first level)
const firstLevelNodes = root.children || [];

const grid = Array(height).fill(null).map(() => 
  Array(width).fill(null).map(() => ({ char: ' ', color: oneHunter.textAlt }))
);

// Draw each first-level child
firstLevelNodes.forEach((node) => {
  const x0 = Math.floor(node.x0);
  const y0 = Math.floor(node.y0);
  const x1 = Math.ceil(node.x1);
  const y1 = Math.ceil(node.y1);
  const isFile = node.data.isFile;
  
  const boxWidth = x1 - x0;
  const boxHeight = y1 - y0;
  
  if (boxWidth < 1 || boxHeight < 1) return;
  
  // Color based on type
  const color = isFile ? getFileColor(node.data.name) : (node.groupColor || oneHunter.blue);
  
  // Draw border
  for (let y = y0; y < y1 && y < height; y++) {
    for (let x = x0; x < x1 && x < width; x++) {
      const isTop = y === y0;
      const isBottom = y === y1 - 1;
      const isLeft = x === x0;
      const isRight = x === x1 - 1;
      
      // Only draw borders
      if (isTop || isBottom || isLeft || isRight) {
        let char = ' ';
        
        if (isTop && isLeft) char = '┌';
        else if (isTop && isRight) char = '┐';
        else if (isBottom && isLeft) char = '└';
        else if (isBottom && isRight) char = '┘';
        else if (isTop || isBottom) char = '─';
        else if (isLeft || isRight) char = '│';
        
        grid[y][x] = { char, color };
      }
    }
  }
  
  // Draw label if there's room
  const name = node.data.name;
  const sizeStr = node.value ? ` ${formatBytes(node.value)}` : '';
  
  if (boxWidth >= 8 && boxHeight >= 2) {
    const labelY = y0 + 1;
    const labelX = x0 + 1;
    const maxLength = boxWidth - 2;
    
    // Combine name and size
    let label = name + sizeStr;
    if (label.length > maxLength) {
      // Try just name
      if (name.length <= maxLength) {
        label = name;
      } else {
        label = name.slice(0, maxLength - 1) + '…';
      }
    }
    
    if (labelY >= 0 && labelY < height && labelY < y1) {
      for (let i = 0; i < label.length && labelX + i < x1 - 1 && labelX + i < width; i++) {
        grid[labelY][labelX + i] = { char: label[i], color };
      }
    }
  }
  else if (boxWidth >= 4 && boxHeight >= 2) {
    // Show abbreviated label
    const labelY = y0 + 1;
    const labelX = x0 + 1;
    const maxLength = boxWidth - 2;
    
    let label;
    if (isFile) {
      // Show extension for files
      const ext = name.match(/\.([^.]{1,3})$/)?.[1];
      label = ext || name.slice(0, maxLength);
    } else {
      // Show first few chars for directories
      label = name.slice(0, maxLength);
    }
    
    if (labelY >= 0 && labelY < height && label) {
      for (let i = 0; i < label.length && labelX + i < x1 - 1 && labelX + i < width; i++) {
        grid[labelY][labelX + i] = { char: label[i], color };
      }
    }
  }
  else if (boxWidth >= 2 && boxHeight >= 2) {
    // Just first character
    const centerY = Math.floor((y0 + y1) / 2);
    const centerX = Math.floor((x0 + x1) / 2);
    if (centerY >= 0 && centerY < height && centerX >= 0 && centerX < width) {
      grid[centerY][centerX] = { char: name[0] || '•', color };
    }
  }
  else if (boxWidth === 1 && boxHeight === 1) {
    // Tiny dot
    if (y0 >= 0 && y0 < height && x0 >= 0 && x0 < width) {
      grid[y0][x0] = { char: '·', color };
    }
  }
});

// Convert grid to Ink components
const lines = grid.map((row, y) => {
  const segments = [];
  let currentColor = null;
  let currentText = '';
  
  row.forEach((cell) => {
    if (cell.color === currentColor) {
      currentText += cell.char;
    } else {
      if (currentText) {
        segments.push(<Text key={segments.length} color={currentColor}>{currentText}</Text>);
      }
      currentColor = cell.color;
      currentText = cell.char;
    }
  });
  
  if (currentText) {
    segments.push(<Text key={segments.length} color={currentColor}>{currentText}</Text>);
  }
  
  return <Box key={y}>{segments}</Box>;
});

return (
  <Box flexDirection="column">
    <Text bold color={oneHunter.cyan}>
      TreeMap View: {selectedNode.data.name}
    </Text>
    <Text dimColor color={oneHunter.textAlt}>
      Press 't' to toggle back to tree view | ↑/↓: Navigate in tree | Ctrl+C: Exit
    </Text>
    <Box borderStyle="single" borderColor={oneHunter.textAlt} flexDirection="column" marginTop={1}>
      {lines}
    </Box>
    <Text dimColor color={oneHunter.textAlt} marginTop={1}>
      Showing {firstLevelNodes.length} items | Total: {formatBytes(root.value || 0)}
    </Text>
  </Box>
);
};