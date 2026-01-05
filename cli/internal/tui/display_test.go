package tui

import (
	"testing"
	"time"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
)

func TestPrintProblemDetails(t *testing.T) {
	// This test just ensures no panic occurs and covers the code paths
	// Capturing stdout is possible but for coverage we just need to run it

	now := time.Now()
	details := &api.ProblemDetails{
		Problem: api.Problem{
			ID:             1,
			Title:          "Test Problem",
			LeetcodeURL:    "http://example.com",
			Difficulty:     "Medium",
			CreatedAt:      now,
			Interval:       5,
			EasinessFactor: 2.5,
			NextReviewDate: now.Add(24 * time.Hour),
		},
		Reviews: []api.Review{
			{
				ID:         1,
				Quality:    4,
				ReviewedAt: now.Add(-24 * time.Hour),
			},
			{
				ID:         2,
				Quality:    2, // Lapse
				ReviewedAt: now.Add(-48 * time.Hour),
			},
		},
	}
	details.Stats.TotalReviews = 2
	details.Stats.Lapses = 1
	details.Stats.AverageQuality = 3.0
	details.Stats.FirstReview = &now
	details.Stats.LatestReview = &now

	PrintProblemDetails(details)
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		d    time.Duration
		want string
	}{
		{30 * time.Second, "30s"},
		{90 * time.Second, "1m"},
		{2 * time.Hour, "2h"},
		{25 * time.Hour, "1d"},
	}

	for _, tt := range tests {
		if got := FormatDuration(tt.d); got != tt.want {
			t.Errorf("FormatDuration(%v) = %v, want %v", tt.d, got, tt.want)
		}
	}
}

func TestDifficultyColor(t *testing.T) {
	if DifficultyColor("easy") != Green {
		t.Error("easy should be green")
	}
	if DifficultyColor("medium") != Yellow {
		t.Error("medium should be yellow")
	}
	if DifficultyColor("hard") != Red {
		t.Error("hard should be red")
	}
	if DifficultyColor("unknown") != Gray {
		t.Error("unknown should be gray")
	}
}

func TestPrintProblem(t *testing.T) {
	p := api.Problem{
		ID:             1,
		Title:          "Test",
		LeetcodeURL:    "http://example.com",
		Difficulty:     "Easy",
		IsDueToday:     true,
		Interval:       5,
		Repetitions:    3,
		NextReviewDate: time.Now(),
	}
	PrintProblem(p, true)
	PrintProblem(p, false)
}

func TestPrintProblemList(t *testing.T) {
	problems := []api.Problem{
		{ID: 1, Title: "P1", Difficulty: "Easy"},
		{ID: 2, Title: "P2", Difficulty: "Hard"},
	}
	PrintProblemList(problems, "Test List", true)
	PrintProblemList([]api.Problem{}, "Empty List", true)
}

func TestPrintStats(t *testing.T) {
	stats := &api.Stats{
		TotalProblems:    10,
		TotalReviews:     50,
		ProblemsDueToday: 2,
		StreakDays:       5,
	}
	stats.ProblemsByDifficulty.Easy = 5
	stats.ProblemsByDifficulty.Medium = 3
	stats.ProblemsByDifficulty.Hard = 2
	PrintStats(stats)
}

func TestPrintHelpers(t *testing.T) {
	PrintSuccess("Success")
	PrintError("Error")
	PrintInfo("Info")
}
