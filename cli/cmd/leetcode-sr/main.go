package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"time"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
	"github.com/vinmeld/leetcode-sr-cli/internal/config"
	"github.com/vinmeld/leetcode-sr-cli/internal/tui"
)

const version = "2.1.0"

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
	case "import":
		if len(os.Args) < 3 {
			tui.PrintError("Usage: leetcode-sr import <source>")
			return
		}
		cmdImport(os.Args[2])
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
  login            Authenticate via browser
  logout           Clear stored credentials
  config           Show configuration
  config set-url   Set API URL
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

	return api.NewClient(cfg.APIURL, cfg.Token), nil
}

func cmdLogin() {
	cfg, err := config.Load()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to load config: %v", err))
		return
	}

	// Start local server to receive token
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to start local server: %v", err))
		return
	}
	port := listener.Addr().(*net.TCPAddr).Port

	tokenChan := make(chan string)
	server := &http.Server{
		ReadHeaderTimeout: 3 * time.Second,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Enable CORS for local development if needed, though browser navigation doesn't need it
			w.Header().Set("Access-Control-Allow-Origin", "*")

			token := r.URL.Query().Get("token")
			if token != "" {
				tokenChan <- token
				fmt.Fprintf(w, "<h1>Login Successful</h1><p>You can close this window and return to the terminal.</p>")
			} else {
				http.Error(w, "No token provided", http.StatusBadRequest)
			}
		}),
	}

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	// Construct login URL
	// Note: API URL might end with /api, we need to construct /api/auth/cli/login
	// Assuming APIURL is like http://localhost:3001/api
	loginURL := fmt.Sprintf("%s/auth/cli/login?port=%d", cfg.APIURL, port)

	fmt.Printf("Opening browser to login: %s\n", loginURL)
	fmt.Println("If browser doesn't open, please visit the URL manually.")

	// Open browser
	var cmd *exec.Cmd
	// Simple OS detection for open command
	if _, err := exec.LookPath("xdg-open"); err == nil {
		cmd = exec.Command("xdg-open", loginURL)
	} else if _, err := exec.LookPath("open"); err == nil {
		cmd = exec.Command("open", loginURL) // Mac
	} else {
		// Fallback or Windows (start)
		cmd = exec.Command("echo", "Please open the URL manually")
	}

	if cmd != nil {
		_ = cmd.Start()
	}

	// Wait for token
	token := <-tokenChan

	// Shutdown server
	_ = server.Shutdown(context.Background())

	cfg.Token = token
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

	cfg.Token = ""

	if err := config.Save(cfg); err != nil {
		tui.PrintError(fmt.Sprintf("Failed to save config: %v", err))
		return
	}

	tui.PrintSuccess("Logged out - Token cleared")
}

func cmdConfig() {
	cfg, err := config.Load()
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to load config: %v", err))
		return
	}

	if len(os.Args) > 2 && os.Args[2] == "set-url" {
		if len(os.Args) < 4 {
			tui.PrintError("Usage: leetcode-sr config set-url <url>")
			return
		}
		newURL := os.Args[3]
		cfg.APIURL = newURL
		if err := config.Save(cfg); err != nil {
			tui.PrintError(fmt.Sprintf("Failed to save config: %v", err))
			return
		}
		tui.PrintSuccess(fmt.Sprintf("API URL updated to: %s", newURL))
		return
	}

	fmt.Println("\nCurrent Configuration:")
	fmt.Printf("  API URL: %s\n", cfg.APIURL)

	if cfg.Token != "" {
		// Mask the token
		masked := cfg.Token[:10] + "..." + cfg.Token[len(cfg.Token)-5:]
		fmt.Printf("  Token:   %s\n", masked)
	} else {
		fmt.Println("  Token:   (not set)")
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
