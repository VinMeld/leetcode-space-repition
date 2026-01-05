package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/vinmeld/leetcode-sr-cli/internal/anki"
	"github.com/vinmeld/leetcode-sr-cli/internal/api"
)

func TestStripHTML(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"<p>Hello</p>", "Hello"},
		{"<b>Bold</b>", "Bold"},
		{"No tags", "No tags"},
		{"<div><br></div>", ""},
		{"<a href='foo'>Link</a>", "Link"},
	}

	for _, tt := range tests {
		if got := stripHTML(tt.input); got != tt.want {
			t.Errorf("stripHTML(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestGetField(t *testing.T) {
	card := anki.CardInfo{
		Fields: map[string]struct {
			Value string `json:"value"`
		}{
			"Front": {Value: "Question"},
			"Back":  {Value: "Answer"},
			"Extra": {Value: ""},
		},
	}

	if got := getField(card, "Front"); got != "Question" {
		t.Errorf("getField(Front) = %q, want Question", got)
	}
	if got := getField(card, "Back"); got != "Answer" {
		t.Errorf("getField(Back) = %q, want Answer", got)
	}
	if got := getField(card, "Extra", "Back"); got != "Answer" {
		t.Errorf("getField(Extra, Back) = %q, want Answer", got)
	}
	if got := getField(card, "NonExistent"); got != "" {
		t.Errorf("getField(NonExistent) = %q, want empty", got)
	}
	// Case insensitive
	if got := getField(card, "front"); got != "Question" {
		t.Errorf("getField(front) = %q, want Question", got)
	}
}

func TestCmdImport(t *testing.T) {
	// Mock Anki Server
	ankiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Action string `json:"action"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		if req.Action == "findCards" {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"result": []int64{1},
				"error":  nil,
			})
		} else if req.Action == "cardsInfo" {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"result": []map[string]interface{}{
					{
						"noteId": 1,
						"fields": map[string]interface{}{
							"Front":  map[string]string{"value": "Two Sum"},
							"Back":   map[string]string{"value": "Solution..."},
							"Source": map[string]string{"value": "https://leetcode.com/problems/two-sum"},
						},
						"interval": 10,
						"reps":     5,
						"factor":   2500,
					},
				},
				"error": nil,
			})
		}
	}))
	defer ankiServer.Close()

	// Mock API Server
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/problems" && r.Method == "POST" {
			json.NewEncoder(w).Encode(map[string]bool{"success": true})
		}
	}))
	defer apiServer.Close()

	// Mock functions
	oldAnkiNew := ankiNewClientFunc
	ankiNewClientFunc = func(url string) *anki.Client {
		return anki.NewClient(ankiServer.URL)
	}
	defer func() { ankiNewClientFunc = oldAnkiNew }()

	oldGetClient := getClientFunc
	getClientFunc = func() (*api.Client, error) {
		return api.NewClient(apiServer.URL, "token"), nil
	}
	defer func() { getClientFunc = oldGetClient }()

	cmdImport("anki")
}
