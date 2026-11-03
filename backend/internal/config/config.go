package config

import "os"

type Config struct {
	Port         string
	MongoURI     string
	MongoDB      string
	FrontendURL  string
	AppEnv       string
	AnalyticsURL string
	AnalyticsKey string
}

func Load() Config {
	analyticsKey := get("ANALYTICS_INTERNAL_KEY", "")
	if analyticsKey == "" {
		analyticsKey = get("ANALYTICS_KEY", "")
	}
	if analyticsKey == "" {
		analyticsKey = get("INTERNAL_KEY", "")
	}
	return Config{
		Port:         get("PORT", "8081"),
		MongoURI:     get("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:      get("MONGO_DB", "HKBP"),
		FrontendURL:  get("FRONTEND_URL", "http://localhost:5173"),
		AppEnv:       get("APP_ENV", "dev"),
		AnalyticsURL: get("ANALYTICS_URL", "http://127.0.0.1:8000"),
		AnalyticsKey: analyticsKey,
	}
}

func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
