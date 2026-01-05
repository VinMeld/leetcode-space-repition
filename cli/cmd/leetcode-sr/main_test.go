package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/vinmeld/leetcode-sr-cli/internal/api"
)

func TestPrintUsage(t *testing.T) {
	printUsage()
}

func TestCmdList(t *testing.T) {
	// Mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		problems := []api.Problem{
			{ID: 1, Title: "Test", IsDueToday: true},
		}
		json.NewEncoder(w).Encode(problems)
	}))
	defer server.Close()

	// Mock getClientFunc
	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(server.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	cmdList(true)
	cmdList(false)
}

func TestCmdStats(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		stats := api.Stats{TotalProblems: 10}
		json.NewEncoder(w).Encode(stats)
	}))
	defer server.Close()

	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(server.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	cmdStats()
}

func TestCmdReview(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}))
	defer server.Close()

	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(server.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	// Mock args
	oldArgs := os.Args
	os.Args = []string{"cmd", "review", "1", "4"}
	defer func() { os.Args = oldArgs }()

	cmdReview()
}

func TestCmdDetails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		details := api.ProblemDetails{
			Problem: api.Problem{ID: 1, Title: "Test"},
		}
		json.NewEncoder(w).Encode(details)
	}))
	defer server.Close()

	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(server.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	oldArgs := os.Args
	os.Args = []string{"cmd", "details", "1"}
	defer func() { os.Args = oldArgs }()

	cmdDetails()
}

func TestCmdListError(t *testing.T) {
	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return nil, os.ErrNotExist
	}
	defer func() { getClientFunc = oldGetClient }()

	cmdList(true)
}

func TestCmdStatsError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(server.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	cmdStats()
}

func TestCmdReviewError(t *testing.T) {
	// Invalid ID
	oldArgs := os.Args
	os.Args = []string{"cmd", "review", "abc", "4"}
	defer func() { os.Args = oldArgs }()
	cmdReview()

	// Invalid Quality
	os.Args = []string{"cmd", "review", "1", "6"}
	cmdReview()

	// API Error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(server.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	os.Args = []string{"cmd", "review", "1", "4"}
	cmdReview()
}
