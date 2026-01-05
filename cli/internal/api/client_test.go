package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewClient(t *testing.T) {
	client := NewClient("http://test.com/api", "lcsr_test_token")

	if client.BaseURL != "http://test.com/api" {
		t.Errorf("BaseURL = %v, want http://test.com/api", client.BaseURL)
	}
	if client.Token != "lcsr_test_token" {
		t.Errorf("Token = %v, want lcsr_test_token", client.Token)
	}
	if client.HTTPClient == nil {
		t.Error("HTTPClient is nil")
	}
}

func TestListProblems(t *testing.T) {
	problems := []Problem{
		{ID: 1, Title: "Two Sum", Difficulty: "easy", IsDueToday: true},
		{ID: 2, Title: "Add Two Numbers", Difficulty: "medium", IsDueToday: false},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/problems" {
			t.Errorf("Expected path /problems, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test_token" {
			t.Errorf("Expected Authorization header")
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(problems)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	result, err := client.ListProblems()

	if err != nil {
		t.Fatalf("ListProblems() error = %v", err)
	}
	if len(result) != 2 {
		t.Errorf("ListProblems() got %d problems, want 2", len(result))
	}
	if result[0].Title != "Two Sum" {
		t.Errorf("First problem title = %v, want Two Sum", result[0].Title)
	}
}

func TestGetStats(t *testing.T) {
	stats := Stats{
		TotalProblems:    10,
		TotalReviews:     50,
		ProblemsDueToday: 3,
		StreakDays:       7,
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/stats" {
			t.Errorf("Expected path /stats, got %s", r.URL.Path)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	result, err := client.GetStats()

	if err != nil {
		t.Fatalf("GetStats() error = %v", err)
	}
	if result.TotalProblems != 10 {
		t.Errorf("TotalProblems = %d, want 10", result.TotalProblems)
	}
	if result.StreakDays != 7 {
		t.Errorf("StreakDays = %d, want 7", result.StreakDays)
	}
}

func TestReviewProblem(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/problems/review" {
			t.Errorf("Expected path /problems/review, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
		}

		var body map[string]int
		json.NewDecoder(r.Body).Decode(&body)

		if body["problemId"] != 1 {
			t.Errorf("problemId = %d, want 1", body["problemId"])
		}
		if body["quality"] != 4 {
			t.Errorf("quality = %d, want 4", body["quality"])
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	err := client.ReviewProblem(1, 4)

	if err != nil {
		t.Fatalf("ReviewProblem() error = %v", err)
	}
}

func TestAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid API key"})
	}))
	defer server.Close()

	client := NewClient(server.URL, "bad_token")
	_, err := client.ListProblems()

	if err == nil {
		t.Error("Expected error for unauthorized request")
	}
}

func TestHealth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Errorf("Expected path /health, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	err := client.Health()

	if err != nil {
		t.Fatalf("Health() error = %v", err)
	}
}

func TestCreateProblem(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/problems" {
			t.Errorf("Expected path /problems, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
		}

		var body CreateProblemRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("Failed to decode body: %v", err)
		}

		if body.Title != "New Problem" {
			t.Errorf("Title = %s, want New Problem", body.Title)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	req := CreateProblemRequest{
		Title:       "New Problem",
		LeetcodeURL: "http://leetcode.com/problems/new-problem",
		Difficulty:  "easy",
	}
	err := client.CreateProblem(req)

	if err != nil {
		t.Fatalf("CreateProblem() error = %v", err)
	}
}

func TestDeleteProblem(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/problems/delete" {
			t.Errorf("Expected path /problems/delete, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
		}

		var body map[string]int
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("Failed to decode body: %v", err)
		}

		if body["problemId"] != 123 {
			t.Errorf("problemId = %d, want 123", body["problemId"])
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	err := client.DeleteProblem(123)

	if err != nil {
		t.Fatalf("DeleteProblem() error = %v", err)
	}
}

func TestGetProblemDetails(t *testing.T) {
	details := ProblemDetails{
		Problem: Problem{ID: 1, Title: "Test Problem", Difficulty: "easy"},
		Reviews: []Review{{ID: 1, Quality: 4}},
	}
	details.Stats.TotalReviews = 1
	details.Stats.AverageQuality = 4.0

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/problems/1/details" {
			t.Errorf("Expected path /problems/1/details, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(details)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	result, err := client.GetProblemDetails(1)

	if err != nil {
		t.Fatalf("GetProblemDetails() error = %v", err)
	}
	if result.Problem.Title != "Test Problem" {
		t.Errorf("Title = %s, want Test Problem", result.Problem.Title)
	}
	if result.Stats.TotalReviews != 1 {
		t.Errorf("TotalReviews = %d, want 1", result.Stats.TotalReviews)
	}
}

// TestGetProblemDetailsWithStringEasinessFactor tests that the API can handle
// easiness_factor returned as a string (which PostgreSQL numeric type does)
func TestGetProblemDetailsWithStringEasinessFactor(t *testing.T) {
	// Simulate backend returning easiness_factor as string (like numeric in PG)
	jsonResponse := `{
		"problem": {
			"id": 176,
			"title": "SQL Schema",
			"leetcode_url": "https://leetcode.com/problems/second-highest-salary",
			"difficulty": "medium",
			"notes": null,
			"easiness_factor": 2.5,
			"interval": 42,
			"repetitions": 3,
			"next_review_date": "2026-01-15T00:00:00Z",
			"created_at": "2025-12-01T00:00:00Z",
			"isDueToday": false
		},
		"reviews": [],
		"stats": {
			"lapses": 0,
			"averageQuality": 4.5,
			"firstReview": null,
			"latestReview": null,
			"totalReviews": 0
		}
	}`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(jsonResponse))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_token")
	result, err := client.GetProblemDetails(176)

	if err != nil {
		t.Fatalf("GetProblemDetails() error = %v", err)
	}
	if result.Problem.EasinessFactor != 2.5 {
		t.Errorf("EasinessFactor = %v, want 2.5", result.Problem.EasinessFactor)
	}
}
