package integration_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
	"github.com/vinmeld/leetcode-sr-cli/internal/config"
)

// TestServer sets up a mock API server for integration testing
type TestServer struct {
	server *httptest.Server
	mux    *http.ServeMux
}

// MockProblem represents a problem in the API response
type MockProblem struct {
	ID             int       `json:"id"`
	Title          string    `json:"title"`
	LeetcodeURL    string    `json:"leetcode_url"`
	Difficulty     string    `json:"difficulty"`
	Notes          string    `json:"notes"`
	NextReviewDate time.Time `json:"next_review_date"`
	Interval       int       `json:"interval"`
	Repetitions    int       `json:"repetitions"`
}

// NewTestServer creates and starts a new test server
func NewTestServer(t *testing.T) *TestServer {
	mux := http.NewServeMux()
	server := httptest.NewServer(mux)

	ts := &TestServer{
		server: server,
		mux:    mux,
	}

	// Default handlers
	ts.SetupDefaultHandlers()

	return ts
}

// Close shuts down the test server
func (ts *TestServer) Close() {
	ts.server.Close()
}

// URL returns the test server URL
func (ts *TestServer) URL() string {
	return ts.server.URL
}

// SetupDefaultHandlers configures standard API endpoints
func (ts *TestServer) SetupDefaultHandlers() {
	// Health check
	ts.mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// List problems
	ts.mux.HandleFunc("/api/problems", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" || auth == "Bearer " {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "No authorization header"})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		problems := []MockProblem{
			{
				ID:             1,
				Title:          "Two Sum",
				LeetcodeURL:    "https://leetcode.com/problems/two-sum",
				Difficulty:     "easy",
				NextReviewDate: time.Now(),
				Interval:       1,
				Repetitions:    0,
			},
			{
				ID:             2,
				Title:          "Add Two Numbers",
				LeetcodeURL:    "https://leetcode.com/problems/add-two-numbers",
				Difficulty:     "medium",
				NextReviewDate: time.Now().AddDate(0, 0, 3),
				Interval:       3,
				Repetitions:    1,
			},
		}
		json.NewEncoder(w).Encode(problems)
	})

	// Add problem
	ts.mux.HandleFunc("/api/problems/add", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if r.Header.Get("Authorization") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "No authorization header"})
			return
		}

		body, _ := io.ReadAll(r.Body)
		var req map[string]interface{}
		json.Unmarshal(body, &req)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"problem": map[string]interface{}{
				"id":    3,
				"title": req["title"],
			},
		})
	})

	// Review problem
	ts.mux.HandleFunc("/api/problems/review", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if r.Header.Get("Authorization") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"nextReview": map[string]interface{}{
				"interval":       6,
				"nextReviewDate": time.Now().AddDate(0, 0, 6),
			},
		})
	})

	// Stats
	ts.mux.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"totalProblems":    2,
			"problemsDueToday": 1,
			"totalReviews":     5,
			"streakDays":       3,
		})
	})
}

// CreateTestConfig creates a temporary config for testing
func CreateTestConfig(t *testing.T, apiURL, token string) (string, func()) {
	tmpDir, err := os.MkdirTemp("", "leetcode-sr-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	configDir := filepath.Join(tmpDir, "leetcode-sr")
	if err := os.MkdirAll(configDir, 0700); err != nil {
		t.Fatalf("Failed to create config dir: %v", err)
	}

	cfg := &config.Config{
		APIURL: apiURL,
		Token:  token,
	}

	configPath := filepath.Join(configDir, "config.json")
	data, _ := json.MarshalIndent(cfg, "", "  ")
	if err := os.WriteFile(configPath, data, 0600); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	cleanup := func() {
		os.RemoveAll(tmpDir)
	}

	return configPath, cleanup
}

// Integration Tests

func TestAPIClientListProblems(t *testing.T) {
	ts := NewTestServer(t)
	defer ts.Close()

	client := api.NewClient(ts.URL()+"/api", "test-token")
	problems, err := client.ListProblems()

	if err != nil {
		t.Fatalf("Failed to list problems: %v", err)
	}

	if len(problems) != 2 {
		t.Errorf("Expected 2 problems, got %d", len(problems))
	}

	if problems[0].Title != "Two Sum" {
		t.Errorf("Expected first problem to be 'Two Sum', got '%s'", problems[0].Title)
	}
}

func TestAPIClientHealth(t *testing.T) {
	ts := NewTestServer(t)
	defer ts.Close()

	client := api.NewClient(ts.URL()+"/api", "test-token")
	err := client.Health()

	if err != nil {
		t.Fatalf("Health check failed: %v", err)
	}
}

func TestAPIClientCreateProblem(t *testing.T) {
	ts := NewTestServer(t)
	defer ts.Close()

	client := api.NewClient(ts.URL()+"/api", "test-token")
	err := client.CreateProblem(api.CreateProblemRequest{
		Title:       "Test Problem",
		LeetcodeURL: "https://leetcode.com/problems/test",
		Difficulty:  "easy",
	})

	if err != nil {
		t.Fatalf("Failed to add problem: %v", err)
	}
}

func TestAPIClientReviewProblem(t *testing.T) {
	ts := NewTestServer(t)
	defer ts.Close()

	client := api.NewClient(ts.URL()+"/api", "test-token")
	err := client.ReviewProblem(1, 4)

	if err != nil {
		t.Fatalf("Failed to review problem: %v", err)
	}
}

func TestAPIClientGetStats(t *testing.T) {
	ts := NewTestServer(t)
	defer ts.Close()

	client := api.NewClient(ts.URL()+"/api", "test-token")
	stats, err := client.GetStats()

	if err != nil {
		t.Fatalf("Failed to get stats: %v", err)
	}

	if stats.TotalProblems != 2 {
		t.Errorf("Expected 2 total problems, got %d", stats.TotalProblems)
	}

	if stats.StreakDays != 3 {
		t.Errorf("Expected 3 streak days, got %d", stats.StreakDays)
	}
}

func TestServerErrorHandling(t *testing.T) {
	// Test with server that returns errors
	mux := http.NewServeMux()
	mux.HandleFunc("/api/problems", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := api.NewClient(server.URL+"/api", "test-token")
	_, err := client.ListProblems()

	if err == nil {
		t.Error("Expected error for server error, got nil")
	}
}

func TestInvalidJSONResponse(t *testing.T) {
	// Test with server that returns invalid JSON
	mux := http.NewServeMux()
	mux.HandleFunc("/api/problems", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "<html>Not JSON</html>")
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := api.NewClient(server.URL+"/api", "test-token")
	_, err := client.ListProblems()

	if err == nil {
		t.Error("Expected error for invalid JSON, got nil")
	}
}

func TestConnectionError(t *testing.T) {
	// Test with invalid server URL
	client := api.NewClient("http://localhost:99999/api", "test-token")
	_, err := client.ListProblems()

	if err == nil {
		t.Error("Expected connection error, got nil")
	}
}
