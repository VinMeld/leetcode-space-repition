# LeetCode SR CLI

Command-line interface for LeetCode Spaced Repetition Tracker.

## Installation

### From Source
```bash
go install github.com/vinmeld/leetcode-sr-cli/cmd/leetcode-sr@latest
```

### Homebrew (macOS/Linux)
```bash
brew tap VinMeld/tap
brew install leetcode-sr
```

### Download Binary
Download from [Releases](https://github.com/VinMeld/leetcode-sr-cli/releases).

## Quick Start

1. Generate an API key from the webapp
2. Configure the CLI:
   ```bash
   leetcode-sr login
   # Enter API URL and paste your key
   ```

3. View problems due today:
   ```bash
   leetcode-sr list
   ```

## Commands

| Command | Description |
|---------|-------------|
| `login` | Configure API URL and key |
| `logout` | Clear stored credentials |
| `config` | Show current configuration |
| `list` / `due` | Show problems due today |
| `all` | Show all tracked problems |
| `stats` | Show statistics and streak |
| `review <id> <q>` | Rate a problem (0-5) |

## Examples

```bash
# View problems due for review
leetcode-sr list

# View all tracked problems
leetcode-sr all

# Rate problem #42 as "good" (4/5)
leetcode-sr review 42 4

# View stats and streak
leetcode-sr stats
```

## Quality Ratings

| Rating | Meaning |
|--------|---------|
| 0 | Complete blackout |
| 1 | Wrong answer |
| 2 | Hard to recall |
| 3 | Correct with difficulty |
| 4 | Correct, easy recall |
| 5 | Perfect, trivial |

## Development

```bash
# Run tests
go test -v ./...

# Run tests with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Lint
golangci-lint run

# Build
go build -o leetcode-sr ./cmd/leetcode-sr
```
