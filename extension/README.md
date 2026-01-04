# LeetCode SR Browser Extension

Chrome extension for adding LeetCode and NeetCode problems to your spaced repetition tracker.

## Features

- **Alt+1** - Add current problem to tracker
- **Alt+2** - Rate problem 0 (blackout)
- **Alt+3** - Rate problem 3 (hard)
- **Alt+4** - Rate problem 4 (good)
- **Alt+5** - Rate problem 5 (perfect)

## Installation

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension` folder

## Setup

1. Click the extension icon in Chrome toolbar
2. Enter your API URL (default: `http://localhost:3001/api`)
3. Paste your API key (generate one from the webapp)
4. Click **Save Settings**
5. Click **Test Connection** to verify

## Usage

1. Navigate to any LeetCode or NeetCode problem page
2. Press **Alt+1** to add the problem
3. After solving, press **Alt+3/4/5** to rate your recall

## Customizing Shortcuts

Visit `chrome://extensions/shortcuts` to change the default key bindings.

## Supported Sites

- leetcode.com/problems/*
- neetcode.io/problems/*
