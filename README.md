# LeetCode Spaced Repetition Tracker

[![Go Report Card](https://goreportcard.com/badge/github.com/VinMeld/leetcode-space-repition)](https://goreportcard.com/report/github.com/VinMeld/leetcode-space-repition)
[![CI Status](https://github.com/VinMeld/leetcode-space-repition/actions/workflows/ci.yml/badge.svg)](https://github.com/VinMeld/leetcode-space-repition/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Master LeetCode problems using the scientifically-proven SM-2 spaced repetition algorithm. This tool helps you efficiently review problems you've solved to ensure long-term retention.

---

## 📖 The "Why" (User Story)

Meet **Alice**. Alice is preparing for technical interviews. She solves 5 LeetCode problems a day. After a month, she realizes she has forgotten the optimal solution for the problems she solved in week 1. She tries to review them, but reviewing *everything* is overwhelming.

Enter **LeetCode SR**.

1.  Alice solves "Two Sum". She adds it to LeetCode SR.
2.  The next day, the CLI tells her: `Due Today: [Two Sum]`.
3.  She reviews the problem. It was easy, so she rates it **5/5**.
4.  The algorithm schedules the next review for **4 days later**.
5.  A week later, she struggles with "LRU Cache". She rates it **2/5**.
6.  The algorithm schedules it for **tomorrow**.

Alice no longer wastes time reviewing what she already knows, nor does she forget the hard problems. She walks into her interview confident and ready.

---

## 🚀 Installation

### Arch Linux (AUR)
You can install the binary package from the AUR using `yay`:
```bash
yay -S leetcode-sr-bin
```

### macOS (Homebrew)
Install via our custom tap:
```bash
brew tap vinmeld/tap
brew install leetcode-sr
```

### Manual Download
Download the latest binary for your OS from the [Releases](https://github.com/VinMeld/leetcode-space-repition/releases) page.

### From Source (Go)
If you have Go installed:
```bash
go install github.com/vinmeld/leetcode-space-repition/cli/cmd/leetcode-sr@latest
```

---

## 💻 CLI Usage

The Command Line Interface is the fastest way to interact with your spaced repetition queue.

### Commands
```text
LeetCode Spaced Repetition CLI

Usage:
  leetcode-sr <command> [arguments]

Commands:
  login            Authenticate via browser
  logout           Clear stored credentials
  config           Show configuration
  config set-url   Set API URL
  list, due        Show problems due today
  all              Show all tracked problems
  stats            Show statistics
  review <id> <q>  Rate a problem (quality 0-5)
  details <id>     Show detailed problem info
  import <source>  Import problems from source (e.g. anki)
  version          Show version
  help             Show this help
```

### Examples
**1. Login to your account:**
```bash
leetcode-sr login
```

**2. See what's due today:**
```bash
leetcode-sr list
```

**3. Review a problem:**
After solving problem #42, rate your recall quality (0-5):
```bash
leetcode-sr review 42 5
```
*   `0`: Blackout (Complete memory failure)
*   `3`: Pass (Hard, but remembered)
*   `5`: Perfect (Instant recall)

**4. View your progress:**
```bash
leetcode-sr stats
```

---

## 🌐 Web App Setup

The web application provides a beautiful dashboard, heatmap, and management interface.

### Prerequisites
*   Docker & Docker Compose
*   Node.js 18+ (for local dev)

### Quick Start (Docker)
1.  Clone the repo.
2.  Copy the example environment file:
    ```bash
    cp webapp/.env.example webapp/.env
    ```
3.  Start the services:
    ```bash
    cd webapp
    docker-compose up -d
    ```
4.  Visit `http://localhost:5173`.

### Environment Variables
Check `webapp/.env.example` for all available configuration options. Key variables include:
*   `DATABASE_URL`: PostgreSQL connection string.
*   `JWT_SECRET`: Secret for signing auth tokens.
*   `PORT`: API server port (default 3000).

---

## 🧩 Code Overview

This repository is a monorepo containing three main components:

### 1. `cli/` (Go)
The command-line interface tool.
*   **`cmd/`**: Entry points for the application. `main.go` handles command routing.
*   **`internal/api/`**: HTTP client for communicating with the backend.
*   **`internal/tui/`**: Terminal UI logic (colors, tables, formatting).
*   **`internal/anki/`**: Integration with AnkiConnect for importing cards.

### 2. `webapp/` (TypeScript/React/Express)
The full-stack web application.
*   **`src/client/`**: React frontend using Vite, TailwindCSS, and React Query.
*   **`src/server/`**: Express.js backend API.
*   **`src/lib/sm2.ts`**: Implementation of the SuperMemo-2 algorithm.
*   **`prisma/`**: Database schema and migrations (if using Prisma, otherwise Kysely/Postgres setup).

### 3. `extension/` (JavaScript)
Chrome extension to integrate directly into the LeetCode website.
*   Adds "Add to SR" buttons to problem pages.
*   Syncs with the webapp API.

---

## 📄 License

MIT © [Vinay Meld](https://github.com/VinMeld)