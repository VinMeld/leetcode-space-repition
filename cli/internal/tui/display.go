package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
)

// Colors for terminal output
const (
	Reset  = "\033[0m"
	Bold   = "\033[1m"
	Red    = "\033[31m"
	Green  = "\033[32m"
	Yellow = "\033[33m"
	Blue   = "\033[34m"
	Cyan   = "\033[36m"
	Gray   = "\033[90m"
)

// DifficultyColor returns the color for a difficulty level
func DifficultyColor(difficulty string) string {
	switch strings.ToLower(difficulty) {
	case "easy":
		return Green
	case "medium":
		return Yellow
	case "hard":
		return Red
	default:
		return Gray
	}
}

// PrintProblem displays a problem in a formatted way
func PrintProblem(p api.Problem, showURL bool) {
	dueStatus := ""
	if p.IsDueToday {
		dueStatus = fmt.Sprintf("%s[DUE]%s ", Red+Bold, Reset)
	}

	diffColor := DifficultyColor(p.Difficulty)

	fmt.Printf("%s%s#%d%s %s%s%s %s[%s%s%s]%s\n",
		dueStatus,
		Gray, p.ID, Reset,
		Bold, p.Title, Reset,
		Gray, diffColor, p.Difficulty, Gray, Reset,
	)

	if showURL {
		fmt.Printf("    %s%s%s\n", Cyan, p.LeetcodeURL, Reset)
	}

	if p.Interval > 0 {
		nextReview := p.NextReviewDate.Format("Jan 2")
		fmt.Printf("    %sInterval: %dd | Next: %s | Reps: %d%s\n",
			Gray, p.Interval, nextReview, p.Repetitions, Reset)
	}
}

// PrintProblemList displays a list of problems
func PrintProblemList(problems []api.Problem, title string, showAll bool) {
	if len(problems) == 0 {
		fmt.Printf("\n%s✓%s %s\n", Green, Reset, title)
		fmt.Printf("  %sNo problems found%s\n\n", Gray, Reset)
		return
	}

	fmt.Printf("\n%s%s%s (%d)\n", Bold, title, Reset, len(problems))
	fmt.Println(strings.Repeat("─", 50))

	for _, p := range problems {
		PrintProblem(p, showAll)
	}
	fmt.Println()
}

// PrintStats displays statistics
func PrintStats(stats *api.Stats) {
	fmt.Printf("\n%s📊 Statistics%s\n", Bold, Reset)
	fmt.Println(strings.Repeat("─", 50))

	fmt.Printf("  %s🔥 Streak:%s        %s%d days%s\n",
		Gray, Reset, Yellow+Bold, stats.StreakDays, Reset)
	fmt.Printf("  %s⏰ Due Today:%s     %s%d problems%s\n",
		Gray, Reset, Red+Bold, stats.ProblemsDueToday, Reset)
	fmt.Printf("  %s📚 Total:%s         %d problems\n",
		Gray, Reset, stats.TotalProblems)
	fmt.Printf("  %s✅ Reviews:%s       %d total\n",
		Gray, Reset, stats.TotalReviews)

	fmt.Printf("\n  %sDifficulty Breakdown:%s\n", Bold, Reset)
	fmt.Printf("    %s●%s Easy:   %d\n", Green, Reset, stats.ProblemsByDifficulty.Easy)
	fmt.Printf("    %s●%s Medium: %d\n", Yellow, Reset, stats.ProblemsByDifficulty.Medium)
	fmt.Printf("    %s●%s Hard:   %d\n", Red, Reset, stats.ProblemsByDifficulty.Hard)
	fmt.Println()
}

// PrintSuccess prints a success message
func PrintSuccess(message string) {
	fmt.Printf("%s✓%s %s\n", Green, Reset, message)
}

// PrintError prints an error message
func PrintError(message string) {
	fmt.Printf("%s✗%s %s\n", Red, Reset, message)
}

// PrintInfo prints an info message
func PrintInfo(message string) {
	fmt.Printf("%sℹ%s %s\n", Blue, Reset, message)
}

// FormatDuration formats a duration in a human-readable way
func FormatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	return fmt.Sprintf("%dd", int(d.Hours()/24))
}
