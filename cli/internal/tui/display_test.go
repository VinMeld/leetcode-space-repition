package tui

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
)

func TestDifficultyColor(t *testing.T) {
	tests := []struct {
		difficulty string
		want       string
	}{
		{"easy", Green},
		{"Easy", Green},
		{"EASY", Green},
		{"medium", Yellow},
		{"hard", Red},
		{"unknown", Gray},
		{"", Gray},
	}

	for _, tt := range tests {
		t.Run(tt.difficulty, func(t *testing.T) {
			got := DifficultyColor(tt.difficulty)
			if got != tt.want {
				t.Errorf("DifficultyColor(%q) = %q, want %q", tt.difficulty, got, tt.want)
			}
		})
	}
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		duration time.Duration
		want     string
	}{
		{30 * time.Second, "30s"},
		{5 * time.Minute, "5m"},
		{2 * time.Hour, "2h"},
		{48 * time.Hour, "2d"},
		{72 * time.Hour, "3d"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := FormatDuration(tt.duration)
			if got != tt.want {
				t.Errorf("FormatDuration(%v) = %q, want %q", tt.duration, got, tt.want)
			}
		})
	}
}

// captureOutput captures stdout for testing print functions
func captureOutput(f func()) string {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	f()

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	return buf.String()
}

func TestPrintSuccess(t *testing.T) {
	output := captureOutput(func() {
		PrintSuccess("test message")
	})
	if output == "" {
		t.Error("PrintSuccess produced no output")
	}
	if !bytes.Contains([]byte(output), []byte("test message")) {
		t.Errorf("PrintSuccess output = %q, want to contain 'test message'", output)
	}
}

func TestPrintError(t *testing.T) {
	output := captureOutput(func() {
		PrintError("error message")
	})
	if output == "" {
		t.Error("PrintError produced no output")
	}
	if !bytes.Contains([]byte(output), []byte("error message")) {
		t.Errorf("PrintError output = %q, want to contain 'error message'", output)
	}
}

func TestPrintInfo(t *testing.T) {
	output := captureOutput(func() {
		PrintInfo("info message")
	})
	if output == "" {
		t.Error("PrintInfo produced no output")
	}
	if !bytes.Contains([]byte(output), []byte("info message")) {
		t.Errorf("PrintInfo output = %q, want to contain 'info message'", output)
	}
}

func TestPrintProblemListEmpty(t *testing.T) {
	output := captureOutput(func() {
		PrintProblemList([]api.Problem{}, "Test Title", false)
	})
	if output == "" {
		t.Error("PrintProblemList produced no output for empty list")
	}
}

func TestPrintProblemListWithItems(t *testing.T) {
	problems := []api.Problem{
		{
			ID:             1,
			Title:          "Two Sum",
			Difficulty:     "easy",
			Interval:       1,
			IsDueToday:     true,
			NextReviewDate: time.Now(),
		},
		{
			ID:             2,
			Title:          "Add Two Numbers",
			Difficulty:     "medium",
			Interval:       3,
			IsDueToday:     false,
			NextReviewDate: time.Now().Add(24 * time.Hour),
		},
	}
	output := captureOutput(func() {
		PrintProblemList(problems, "Test List", true)
	})
	if output == "" {
		t.Error("PrintProblemList produced no output")
	}
	if !bytes.Contains([]byte(output), []byte("Two Sum")) {
		t.Errorf("PrintProblemList output = %q, want to contain 'Two Sum'", output)
	}
	if !bytes.Contains([]byte(output), []byte("Add Two Numbers")) {
		t.Errorf("PrintProblemList output = %q, want to contain 'Add Two Numbers'", output)
	}
}

func TestPrintProblem(t *testing.T) {
	problem := api.Problem{
		ID:         1,
		Title:      "Two Sum",
		Difficulty: "easy",
		Interval:   7,
		IsDueToday: true,
	}
	output := captureOutput(func() {
		PrintProblem(problem, true)
	})
	if output == "" {
		t.Error("PrintProblem produced no output")
	}
	if !bytes.Contains([]byte(output), []byte("Two Sum")) {
		t.Errorf("PrintProblem output = %q, want to contain 'Two Sum'", output)
	}
}

func TestPrintStats(t *testing.T) {
	stats := &api.Stats{
		TotalProblems:    10,
		TotalReviews:     50,
		ProblemsDueToday: 3,
		StreakDays:       7,
	}
	output := captureOutput(func() {
		PrintStats(stats)
	})
	if output == "" {
		t.Error("PrintStats produced no output")
	}
}

func TestPrintProblemHyperlink(t *testing.T) {
	// Save original TERM
	origTerm := os.Getenv("TERM")
	defer os.Setenv("TERM", origTerm)

	problem := api.Problem{
		ID:          1,
		Title:       "Test Problem",
		LeetcodeURL: "http://example.com",
		Difficulty:  "easy",
	}

	tests := []struct {
		name     string
		term     string
		wantLink string
	}{
		{
			name:     "Standard Terminal",
			term:     "xterm-256color",
			wantLink: "\x1b]8;;http://example.com\x1b\\Test Problem\x1b]8;;\x1b\\",
		},
		{
			name: "Tmux Terminal",
			term: "tmux-256color",
			// Expected: \x1bPtmux;\x1b\x1b]8;;http://example.com\x1b\x1b\\Test Problem\x1b\x1b]8;;\x1b\x1b\\\x1b\\
			// Note: Go string literals require escaping backslashes
			wantLink: "\x1bPtmux;\x1b\x1b]8;;http://example.com\x1b\x1b\\Test Problem\x1b\x1b]8;;\x1b\x1b\\\x1b\\",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("TERM", tt.term)
			output := captureOutput(func() {
				PrintProblem(problem, false)
			})

			if !strings.Contains(output, tt.wantLink) {
				t.Errorf("PrintProblem() output does not contain expected link for TERM=%s.\nGot: %q\nWant substring: %q", tt.term, output, tt.wantLink)
			}
		})
	}
}
