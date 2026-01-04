package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

// Config holds the CLI configuration
type Config struct {
	APIURL string `json:"api_url"`
	APIKey string `json:"api_key"`
}

// DefaultAPIURL is the default API server URL
const DefaultAPIURL = "http://localhost:3001/api"

// configDir returns the config directory path
func configDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".leetcode-sr"), nil
}

// configPath returns the config file path
func configPath() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

// Load reads the configuration from disk
func Load() (*Config, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Return default config if file doesn't exist
			return &Config{APIURL: DefaultAPIURL}, nil
		}
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	if cfg.APIURL == "" {
		cfg.APIURL = DefaultAPIURL
	}

	return &cfg, nil
}

// Save writes the configuration to disk
func Save(cfg *Config) error {
	dir, err := configDir()
	if err != nil {
		return err
	}

	// Create config directory if it doesn't exist
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	path, err := configPath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0600)
}

// IsConfigured returns true if API key is set
func (c *Config) IsConfigured() bool {
	return c.APIKey != ""
}

// Validate checks if the config is valid
func (c *Config) Validate() error {
	if c.APIURL == "" {
		return errors.New("API URL is not configured")
	}
	if c.APIKey == "" {
		return errors.New("API key is not configured. Run 'leetcode-sr login' first")
	}
	return nil
}
