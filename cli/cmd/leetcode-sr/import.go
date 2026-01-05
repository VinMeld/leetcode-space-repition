package main

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/vinmeld/leetcode-sr-cli/internal/anki"
	"github.com/vinmeld/leetcode-sr-cli/internal/api"
	"github.com/vinmeld/leetcode-sr-cli/internal/tui"
)

func cmdImport(source string) {
	if source != "anki" {
		tui.PrintError("Only 'anki' source is supported currently")
		return
	}

	tui.PrintInfo("Connecting to Anki...")
	ankiClient := anki.NewClient("") // Use default localhost:8765

	// Find cards in LeetCode deck
	// Try "deck:LeetCode" first, if empty try generic
	ids, err := ankiClient.FindCards("deck:LeetCode")
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to find cards: %v", err))
		tui.PrintInfo("Make sure Anki is running and AnkiConnect is installed.")
		return
	}

	if len(ids) == 0 {
		tui.PrintInfo("No cards found in 'LeetCode' deck. Trying all cards with 'leetcode' tag...")
		ids, err = ankiClient.FindCards("tag:leetcode")
		if err != nil {
			tui.PrintError(fmt.Sprintf("Failed to find cards: %v", err))
			return
		}
	}

	if len(ids) == 0 {
		tui.PrintInfo("No cards found. Please ensure you have a deck named 'LeetCode' or cards tagged 'leetcode'.")
		return
	}

	tui.PrintInfo(fmt.Sprintf("Found %d cards. Fetching details...", len(ids)))
	cards, err := ankiClient.CardsInfo(ids)
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to fetch card details: %v", err))
		return
	}

	apiClient, err := getClient()
	if err != nil {
		tui.PrintError(err.Error())
		return
	}

	successCount := 0
	skipCount := 0
	failCount := 0

	urlRegex := regexp.MustCompile(`https://leetcode\.com/problems/[a-zA-Z0-9-]+`)

	for _, card := range cards {
		title := getField(card, "Title", "Front", "Question")
		content := getField(card, "Back", "Answer", "Notes", "Extra")

		// Try to find URL in fields or content
		url := getField(card, "URL", "Source", "Link")
		if url == "" {
			// Search in content
			match := urlRegex.FindString(content)
			if match != "" {
				url = match
			}
		}

		if title == "" || url == "" {

			failCount++
			continue
		}

		// Clean up title (remove HTML)
		title = stripHTML(title)

		req := api.CreateProblemRequest{
			Title:       title,
			LeetcodeURL: url,
			Difficulty:  "medium", // Default, maybe try to parse from tags?
			Notes:       stripHTML(content),
		}

		// Check tags for difficulty
		for _, tag := range card.Tags {
			lower := strings.ToLower(tag)
			if lower == "easy" || lower == "medium" || lower == "hard" {
				req.Difficulty = lower
				break
			}
		}

		err := apiClient.CreateProblem(req)
		if err != nil {
			if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "409") {
				skipCount++
			} else {
				fmt.Printf("Failed to import '%s': %v\n", title, err)
				failCount++
			}
		} else {
			successCount++
			fmt.Printf("Imported: %s\n", title)
		}
	}

	tui.PrintSuccess(fmt.Sprintf("Import complete: %d imported, %d skipped, %d failed", successCount, skipCount, failCount))
}

func getField(card anki.CardInfo, names ...string) string {
	for _, name := range names {
		if field, ok := card.Fields[name]; ok && field.Value != "" {
			return field.Value
		}
	}
	// Case insensitive fallback
	for _, name := range names {
		for k, v := range card.Fields {
			if strings.EqualFold(k, name) && v.Value != "" {
				return v.Value
			}
		}
	}
	return ""
}

func stripHTML(input string) string {
	// Simple regex to strip tags
	re := regexp.MustCompile(`<[^>]*>`)
	return re.ReplaceAllString(input, "")
}
