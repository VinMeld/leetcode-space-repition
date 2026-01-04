package tui

import (
	"bytes"
	"io"
	"os"
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
