package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigDirCreation(t *testing.T) {
	// Create temp home directory
	tmpHome := t.TempDir()
	t.Setenv("HOME", tmpHome)

	cfg := &Config{
		APIURL: "http://test.example.com/api",
		APIKey: "lcsr_test_key",
	}

	err := Save(cfg)
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify file was created
	configFile := filepath.Join(tmpHome, ".leetcode-sr", "config.json")
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		t.Error("Config file was not created")
	}
}

func TestLoadDefaultConfig(t *testing.T) {
	// Create temp home directory with no config
	tmpHome := t.TempDir()
	t.Setenv("HOME", tmpHome)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIURL != DefaultAPIURL {
		t.Errorf("Load() APIURL = %v, want %v", cfg.APIURL, DefaultAPIURL)
	}

	if cfg.APIKey != "" {
		t.Errorf("Load() APIKey = %v, want empty", cfg.APIKey)
	}
}

func TestSaveAndLoad(t *testing.T) {
	tmpHome := t.TempDir()
	t.Setenv("HOME", tmpHome)

	original := &Config{
		APIURL: "http://custom.example.com/api",
		APIKey: "lcsr_custom_key_12345",
	}

	if err := Save(original); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	loaded, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if loaded.APIURL != original.APIURL {
		t.Errorf("APIURL = %v, want %v", loaded.APIURL, original.APIURL)
	}

	if loaded.APIKey != original.APIKey {
		t.Errorf("APIKey = %v, want %v", loaded.APIKey, original.APIKey)
	}
}

func TestIsConfigured(t *testing.T) {
	tests := []struct {
		name   string
		apiKey string
		want   bool
	}{
		{"empty key", "", false},
		{"with key", "lcsr_test", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{APIKey: tt.apiKey}
			if got := cfg.IsConfigured(); got != tt.want {
				t.Errorf("IsConfigured() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		config  *Config
		wantErr bool
	}{
		{"valid", &Config{APIURL: "http://test.com", APIKey: "key"}, false},
		{"no url", &Config{APIURL: "", APIKey: "key"}, true},
		{"no key", &Config{APIURL: "http://test.com", APIKey: ""}, true},
		{"empty", &Config{}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
