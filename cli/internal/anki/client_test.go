package anki

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFindCards(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Action string `json:"action"`
			Params struct {
				Query string `json:"query"`
			} `json:"params"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		if req.Action != "findCards" {
			t.Errorf("Action = %s, want findCards", req.Action)
		}

		resp := map[string]interface{}{
			"result": []int64{12345, 67890},
			"error":  nil,
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	cards, err := client.FindCards("deck:LeetCode")

	if err != nil {
		t.Fatalf("FindCards() error = %v", err)
	}
	if len(cards) != 2 {
		t.Errorf("FindCards() got %d cards, want 2", len(cards))
	}
	if cards[0] != 12345 {
		t.Errorf("First card = %d, want 12345", cards[0])
	}
}

func TestCardsInfo(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Action string `json:"action"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		if req.Action != "cardsInfo" {
			t.Errorf("Action = %s, want cardsInfo", req.Action)
		}

		// Mock response matching CardInfo struct
		resp := map[string]interface{}{
			"result": []map[string]interface{}{
				{
					"cardId":   12345,
					"question": "Two Sum",
					"answer":   "Solution...",
					"interval": 10,
					"reps":     5,
					"factor":   2500,
				},
			},
			"error": nil,
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	info, err := client.CardsInfo([]int64{12345})

	if err != nil {
		t.Fatalf("CardsInfo() error = %v", err)
	}
	if len(info) != 1 {
		t.Errorf("CardsInfo() got %d items, want 1", len(info))
	}
	if info[0].Interval != 10 {
		t.Errorf("Interval = %d, want 10", info[0].Interval)
	}
}

func TestError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]interface{}{
			"result": nil,
			"error":  "Some Anki error",
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	_, err := client.FindCards("query")

	if err == nil {
		t.Error("Expected error from Anki response")
	}
}
