package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewClient(t *testing.T) {
	client := NewClient("http://test.com/api", "lcsr_test_key")

	if client.BaseURL != "http://test.com/api" {
		t.Errorf("BaseURL = %v, want http://test.com/api", client.BaseURL)
	}
	if client.APIKey != "lcsr_test_key" {
		t.Errorf("APIKey = %v, want lcsr_test_key", client.APIKey)
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
		if r.Header.Get("Authorization") != "Bearer test_key" {
			t.Errorf("Expected Authorization header")
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(problems)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_key")
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

	client := NewClient(server.URL, "test_key")
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

	client := NewClient(server.URL, "test_key")
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

	client := NewClient(server.URL, "bad_key")
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

	client := NewClient(server.URL, "test_key")
	err := client.Health()

	if err != nil {
		t.Fatalf("Health() error = %v", err)
	}
}
