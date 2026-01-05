package anki

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const DefaultURL = "http://localhost:8765"

type Client struct {
	URL        string
	HTTPClient *http.Client
}

func NewClient(url string) *Client {
	if url == "" {
		url = DefaultURL
	}
	return &Client{
		URL: url,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type request struct {
	Action  string      `json:"action"`
	Version int         `json:"version"`
	Params  interface{} `json:"params,omitempty"`
}

type response struct {
	Result interface{} `json:"result"`
	Error  *string     `json:"error"`
}

func (c *Client) invoke(action string, params interface{}, result interface{}) error {
	reqBody := request{
		Action:  action,
		Version: 6,
		Params:  params,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(context.Background(), "POST", c.URL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request to AnkiConnect: %w", err)
	}
	defer resp.Body.Close()

	var apiResp response
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if apiResp.Error != nil {
		return fmt.Errorf("anki error: %s", *apiResp.Error)
	}

	// Re-marshal result to decode into specific type
	// This is a bit inefficient but simple
	resultData, err := json.Marshal(apiResp.Result)
	if err != nil {
		return fmt.Errorf("failed to marshal result: %w", err)
	}

	if err := json.Unmarshal(resultData, result); err != nil {
		return fmt.Errorf("failed to unmarshal result: %w", err)
	}

	return nil
}

type CardInfo struct {
	ID     int64 `json:"noteId"`
	Fields map[string]struct {
		Value string `json:"value"`
	} `json:"fields"`
	Tags []string `json:"tags"`
}

func (c *Client) FindCards(query string) ([]int64, error) {
	var ids []int64
	err := c.invoke("findNotes", map[string]string{"query": query}, &ids)
	return ids, err
}

func (c *Client) CardsInfo(ids []int64) ([]CardInfo, error) {
	var cards []CardInfo
	err := c.invoke("notesInfo", map[string][]int64{"notes": ids}, &cards)
	return cards, err
}
