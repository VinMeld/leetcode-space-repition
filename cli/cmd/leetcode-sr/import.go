package main

import (
	"fmt"
	"regexp"
	"strings"
	"time"

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

		// Map Anki stats to SM-2
		if card.Factor > 0 {
			req.EasinessFactor = float64(card.Factor) / 1000.0
		} else {
			req.EasinessFactor = 2.5
		}

		req.Interval = card.Interval
		req.Repetitions = card.Reps

		// Calculate NextReviewDate
		// Anki "due" is sometimes epoch, sometimes days relative to creation?
		// But usually for review cards it's an integer representing days?
		// Actually, let's assume "Interval" is days from last review.
		// And we want to set NextReviewDate = Now + Interval (roughly).
		// Or if we can trust "Due", we need to know what it means.
		// AnkiConnect docs say "due": due date (as integer).
		// If it's a large number, it's epoch? If small, it's days?
		// Let's rely on Interval for now: NextReview = Now + Interval days.
		// Wait, if it's already due, Interval might be old.
		// But for import, we probably want to preserve the schedule.
		// If we just reviewed it yesterday and interval is 10 days, next review is in 9 days.
		// We don't have "LastReviewedAt" easily from cardsInfo (maybe in fields?).
		// Let's just set NextReviewDate = Now + Interval days. This resets the clock but preserves the interval.
		// Better than nothing.
		// Ideally we'd use "Due" but interpreting it is tricky without more context.
		// Actually, if we assume the user is syncing *current* state:
		// If "Due" > Now (epoch), use that.
		// If "Due" < Now, it's due.
		// Let's try to interpret "Due".
		// If Due > 1000000000, it's epoch.
		// If Due < 1000000000, it might be days since collection creation?
		// Let's stick to: NextReviewDate = time.Now().Add(time.Duration(card.Interval) * 24 * time.Hour)
		// This effectively "reviews" the card today and sets the next review based on current interval.
		// This is safe.
		nextReview := time.Now().Add(time.Duration(card.Interval) * 24 * time.Hour)
		req.NextReviewDate = nextReview.Format(time.RFC3339)

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
