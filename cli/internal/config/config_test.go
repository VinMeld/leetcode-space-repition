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
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(tmpHome, ".config"))

	cfg := &Config{
		APIURL: "http://test.example.com/api",
		Token:  "lcsr_test_token",
	}

	err := Save(cfg)
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify file was created
	configFile := filepath.Join(tmpHome, ".config", "leetcode-sr", "config.json")
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		t.Error("Config file was not created")
	}
}

func TestLoadDefaultConfig(t *testing.T) {
	// Create temp home directory with no config
	tmpHome := t.TempDir()
	t.Setenv("HOME", tmpHome)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(tmpHome, ".config"))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIURL != DefaultAPIURL {
		t.Errorf("Load() APIURL = %v, want %v", cfg.APIURL, DefaultAPIURL)
	}

	if cfg.Token != "" {
		t.Errorf("Load() Token = %v, want empty", cfg.Token)
	}
}

func TestSaveAndLoad(t *testing.T) {
	tmpHome := t.TempDir()
	t.Setenv("HOME", tmpHome)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(tmpHome, ".config"))

	original := &Config{
		APIURL: "http://custom.example.com/api",
		Token:  "lcsr_custom_token_12345",
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

	if loaded.Token != original.Token {
		t.Errorf("Token = %v, want %v", loaded.Token, original.Token)
	}
}

func TestIsConfigured(t *testing.T) {
	tests := []struct {
		name  string
		token string
		want  bool
	}{
		{"empty token", "", false},
		{"with token", "lcsr_test", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{Token: tt.token}
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
		{"valid", &Config{APIURL: "http://test.com", Token: "token"}, false},
		{"no url", &Config{APIURL: "", Token: "token"}, true},
		{"no token", &Config{APIURL: "http://test.com", Token: ""}, true},
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
