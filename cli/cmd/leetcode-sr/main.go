package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
	"github.com/vinmeld/leetcode-sr-cli/internal/config"
	"github.com/vinmeld/leetcode-sr-cli/internal/tui"
)

const version = "1.0.0"

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "login":
		cmdLogin()
	case "logout":
		cmdLogout()
	case "config":
		cmdConfig()
	case "list", "due":
		cmdList(true) // Show due only
	case "all":
		cmdList(false) // Show all
	case "stats":
		cmdStats()
	case "review":
		cmdReview()
	case "version", "-v", "--version":
		fmt.Printf("leetcode-sr version %s\n", version)
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Print(`
LeetCode Spaced Repetition CLI

Usage:
  leetcode-sr <command> [arguments]

Commands:
  login            Authenticate with API key
  logout           Clear stored credentials
  config           Show/update configuration
  list, due        Show problems due today
  all              Show all tracked problems
  stats            Show statistics
  review <id> <q>  Rate a problem (quality 0-5)
  version          Show version
  help             Show this help

Examples:
  leetcode-sr login
  leetcode-sr list
  leetcode-sr review 42 4
  leetcode-sr stats
`)
}

func getClient() (*api.Client, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return api.NewClient(cfg.APIURL, cfg.APIKey), nil
}

func cmdLogin() {
	cfg, err := config.Load()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to load config: %v", err))
		return
	}

	reader := bufio.NewReader(os.Stdin)

	// Prompt for API URL
	fmt.Printf("API URL [%s]: ", cfg.APIURL)
	urlInput, _ := reader.ReadString('\n')
	urlInput = strings.TrimSpace(urlInput)
	if urlInput != "" {
		cfg.APIURL = urlInput
	}

	// Prompt for API Key
	fmt.Print("API Key: ")
	keyInput, _ := reader.ReadString('\n')
	keyInput = strings.TrimSpace(keyInput)
	if keyInput == "" {
		tui.PrintError("API key is required")
		return
	}
	cfg.APIKey = keyInput

	// Test the connection
	client := api.NewClient(cfg.APIURL, cfg.APIKey)
	if err := client.Health(); err != nil {
		tui.PrintError(fmt.Sprintf("Connection failed: %v", err))
		return
	}

	// Save config
	if err := config.Save(cfg); err != nil {
		tui.PrintError(fmt.Sprintf("Failed to save config: %v", err))
		return
	}

	tui.PrintSuccess("Logged in successfully!")
}

func cmdLogout() {
	cfg, err := config.Load()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to load config: %v", err))
		return
	}

	cfg.APIKey = ""

	if err := config.Save(cfg); err != nil {
		tui.PrintError(fmt.Sprintf("Failed to save config: %v", err))
		return
	}

	tui.PrintSuccess("Logged out - API key cleared")
}

func cmdConfig() {
	cfg, err := config.Load()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to load config: %v", err))
		return
	}

	fmt.Println("\nCurrent Configuration:")
	fmt.Printf("  API URL: %s\n", cfg.APIURL)

	if cfg.APIKey != "" {
		// Mask the API key
		masked := cfg.APIKey[:8] + strings.Repeat("*", len(cfg.APIKey)-8)
		fmt.Printf("  API Key: %s\n", masked)
	} else {
		fmt.Println("  API Key: (not set)")
	}
	fmt.Println()
}

func cmdList(dueOnly bool) {
	client, err := getClient()
	if err != nil {
		tui.PrintError(err.Error())
		return
	}

	problems, err := client.ListProblems()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to fetch problems: %v", err))
		return
	}

	if dueOnly {
		var dueProblems []api.Problem
		for _, p := range problems {
			if p.IsDueToday {
				dueProblems = append(dueProblems, p)
			}
		}
		tui.PrintProblemList(dueProblems, "Problems Due Today", false)
	} else {
		tui.PrintProblemList(problems, "All Problems", true)
	}
}

func cmdStats() {
	client, err := getClient()
	if err != nil {
		tui.PrintError(err.Error())
		return
	}

	stats, err := client.GetStats()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to fetch stats: %v", err))
		return
	}

	tui.PrintStats(stats)
}

func cmdReview() {
	if len(os.Args) < 4 {
		tui.PrintError("Usage: leetcode-sr review <problem_id> <quality>")
		tui.PrintInfo("Quality: 0 (blackout) to 5 (perfect)")
		return
	}

	problemID, err := strconv.Atoi(os.Args[2])
	if err != nil {
		tui.PrintError("Invalid problem ID")
		return
	}

	quality, err := strconv.Atoi(os.Args[3])
	if err != nil || quality < 0 || quality > 5 {
		tui.PrintError("Quality must be 0-5")
		return
	}

	client, err := getClient()
	if err != nil {
		tui.PrintError(err.Error())
		return
	}

	if err := client.ReviewProblem(problemID, quality); err != nil {
		tui.PrintError(fmt.Sprintf("Failed to record review: %v", err))
		return
	}

	qualityDesc := []string{"blackout", "wrong", "hard", "good", "easy", "perfect"}
	tui.PrintSuccess(fmt.Sprintf("Reviewed problem #%d as '%s' (%d/5)",
		problemID, qualityDesc[quality], quality))
}
