package main

import (
	"fmt"
	"os"
	"strconv"

	"github.com/vinmeld/leetcode-sr-cli/internal/tui"
)

func cmdDetails() {
	if len(os.Args) < 3 {
		tui.PrintError("Usage: leetcode-sr details <problem_id>")
		return
	}

	problemID, err := strconv.Atoi(os.Args[2])
	if err != nil {
		tui.PrintError("Invalid problem ID")
		return
	}

	client, err := getClient()
	if err != nil {
		tui.PrintError(err.Error())
		return
	}

	details, err := client.GetProblemDetails(problemID)
	if err != nil {
		tui.PrintError(fmt.Sprintf("Failed to fetch details: %v", err))
		return
	}

	tui.PrintProblemDetails(details)
}
