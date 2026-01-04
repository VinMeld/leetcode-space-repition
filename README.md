# LeetCode Spaced Repetition Tracker

Master LeetCode problems using the scientifically-proven SM-2 spaced repetition algorithm.

## Projects

This repository contains 3 sub-projects:

| Project | Description |
|---------|-------------|
| [webapp/](./webapp) | React web application + Express API |
| [extension/](./extension) | Chrome browser extension |
| [cli/](./cli) | Go command-line interface |

---

## Quick Start

### Web App
```bash
cd webapp
npm install
npm run dev
```

### Browser Extension
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `extension/` folder

### CLI
```bash
cd cli
go build -o leetcode-sr ./cmd/leetcode-sr
./leetcode-sr login
```

---

## Features

- **SM-2 Algorithm** - Optimized review intervals based on recall quality
- **Problem Tracking** - Store LeetCode/NeetCode problems with notes
- **Activity Heatmap** - GitHub-style 365-day visualization
- **Keyboard Shortcuts** - Alt+1 to add, Alt+2-5 to rate
- **CLI Access** - Review problems from terminal

## License

MIT