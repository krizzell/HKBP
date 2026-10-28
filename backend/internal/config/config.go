package config

import "os"

type Config struct {
	Port        string
	MongoURI    string
	MongoDB     string
	FrontendURL string
	AppEnv      string
}

func Load() Config {
	return Config{
		Port:        get("PORT", "8081"),
		MongoURI:    get("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:     get("MONGO_DB", "HKBP"),
		FrontendURL: get("FRONTEND_URL", "http://localhost:5173"),
		AppEnv:      get("APP_ENV", "dev"),
	}
}

func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
