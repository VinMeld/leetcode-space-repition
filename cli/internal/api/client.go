package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is the API client for the LeetCode SR API
type Client struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
}

// NewClient creates a new API client
func NewClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Problem represents a tracked problem
type Problem struct {
	ID             int        `json:"id"`
	OrderNum       int        `json:"order_num"`
	Title          string     `json:"title"`
	LeetcodeURL    string     `json:"leetcode_url"`
	Difficulty     string     `json:"difficulty"`
	Notes          *string    `json:"notes"`
	EasinessFactor float64    `json:"easiness_factor"`
	Interval       int        `json:"interval"`
	Repetitions    int        `json:"repetitions"`
	NextReviewDate time.Time  `json:"next_review_date"`
	LastReviewedAt *time.Time `json:"last_reviewed_at"`
	CreatedAt      time.Time  `json:"created_at"`
	IsDueToday     bool       `json:"isDueToday"`
}

// Stats represents statistics data
type Stats struct {
	TotalProblems        int            `json:"totalProblems"`
	TotalReviews         int            `json:"totalReviews"`
	ProblemsDueToday     int            `json:"problemsDueToday"`
	StreakDays           int            `json:"streakDays"`
	ReviewsByDate        map[string]int `json:"reviewsByDate"`
	ProblemsByDifficulty struct {
		Easy   int `json:"easy"`
		Medium int `json:"medium"`
		Hard   int `json:"hard"`
	} `json:"problemsByDifficulty"`
}

// request makes an HTTP request to the API
func (c *Client) request(method, endpoint string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequestWithContext(context.Background(), method, c.BaseURL+endpoint, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Token)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errResp struct {
			Error   string      `json:"error"`
			Details interface{} `json:"details"`
		}
		if err := json.Unmarshal(respBody, &errResp); err == nil && errResp.Error != "" {
			if errResp.Details != nil {
				return nil, fmt.Errorf("API error: %s - %v", errResp.Error, errResp.Details)
			}
			return nil, fmt.Errorf("API error: %s", errResp.Error)
		}
		return nil, fmt.Errorf("API error: HTTP %d", resp.StatusCode)
	}

	return respBody, nil
}

// ListProblems returns all tracked problems
func (c *Client) ListProblems() ([]Problem, error) {
	data, err := c.request("GET", "/problems", nil)
	if err != nil {
		return nil, err
	}

	var problems []Problem
	if err := json.Unmarshal(data, &problems); err != nil {
		return nil, fmt.Errorf("failed to parse problems: %w", err)
	}

	return problems, nil
}

// GetStats returns statistics
func (c *Client) GetStats() (*Stats, error) {
	data, err := c.request("GET", "/stats", nil)
	if err != nil {
		return nil, err
	}

	var stats Stats
	if err := json.Unmarshal(data, &stats); err != nil {
		return nil, fmt.Errorf("failed to parse stats: %w", err)
	}

	return &stats, nil
}

// ReviewProblem records a review for a problem
func (c *Client) ReviewProblem(problemID, quality int) error {
	body := map[string]int{
		"problemId": problemID,
		"quality":   quality,
	}

	_, err := c.request("POST", "/problems/review", body)
	return err
}

// CreateProblemRequest is the request body for creating a problem
type CreateProblemRequest struct {
	Title          string  `json:"title"`
	LeetcodeURL    string  `json:"leetcodeUrl"`
	Difficulty     string  `json:"difficulty"`
	Notes          string  `json:"notes,omitempty"`
	EasinessFactor float64 `json:"easinessFactor,omitempty"`
	Interval       int     `json:"interval,omitempty"`
	Repetitions    int     `json:"repetitions,omitempty"`
	NextReviewDate string  `json:"nextReviewDate,omitempty"` // ISO string
}

// CreateProblem adds a new problem
func (c *Client) CreateProblem(req CreateProblemRequest) error {
	_, err := c.request("POST", "/problems", req)
	return err
}

// DeleteProblem removes a problem
func (c *Client) DeleteProblem(problemID int) error {
	body := map[string]int{"problemId": problemID}
	_, err := c.request("POST", "/problems/delete", body)
	return err
}

// Health checks API connectivity
func (c *Client) Health() error {
	_, err := c.request("GET", "/health", nil)
	return err
}

// Review represents a historical review
type Review struct {
	ID         int       `json:"id"`
	ProblemID  int       `json:"problem_id"`
	Quality    int       `json:"quality"`
	ReviewedAt time.Time `json:"reviewed_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// ProblemDetails represents detailed problem information
type ProblemDetails struct {
	Problem Problem  `json:"problem"`
	Reviews []Review `json:"reviews"`
	Stats   struct {
		Lapses         int        `json:"lapses"`
		AverageQuality float64    `json:"averageQuality"`
		FirstReview    *time.Time `json:"firstReview"`
		LatestReview   *time.Time `json:"latestReview"`
		TotalReviews   int        `json:"totalReviews"`
	} `json:"stats"`
}

// GetProblemDetails returns detailed information for a problem
func (c *Client) GetProblemDetails(problemID int) (*ProblemDetails, error) {
	endpoint := fmt.Sprintf("/problems/%d/details", problemID)
	data, err := c.request("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	var details ProblemDetails
	if err := json.Unmarshal(data, &details); err != nil {
		return nil, fmt.Errorf("failed to parse details: %w", err)
	}

	return &details, nil
}
