package setting

import (
	"bufio"
	"os"
	"strings"
	"time"
)

const (
	defaultHTTPAddr          = ":8000"
	defaultEnv               = "development"
	defaultShutdownTimeout   = 10 * time.Second
	defaultReadHeaderTimeout = 5 * time.Second
)

type Config struct {
	Environment       string
	HTTPAddr          string
	JWTSecret         string
	MongoURI          string
	FrontendURL       string
	ShutdownTimeout   time.Duration
	ReadHeaderTimeout time.Duration
}

func init() {
	loadDotEnv(".env")
	loadDotEnv("../../.env")
}

func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		v = strings.Trim(v, `"'`)
		os.Setenv(k, v)
	}
}

func Load() Config {
	return Config{
		Environment:       getEnv("ENV", defaultEnv),
		HTTPAddr:          httpAddr(),
		JWTSecret:         getEnv("JWT_SECRET", "paypath-dev-secret"),
		MongoURI:          getEnv("MONGODB_URI", ""),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:5173"),
		ShutdownTimeout:   getDurationEnv("SHUTDOWN_TIMEOUT", defaultShutdownTimeout),
		ReadHeaderTimeout: getDurationEnv("READ_HEADER_TIMEOUT", defaultReadHeaderTimeout),
	}
}

func httpAddr() string {
	if v := os.Getenv("HTTP_ADDR"); v != "" {
		return v
	}
	if p := os.Getenv("PORT"); p != "" {
		return ":" + p
	}
	return defaultHTTPAddr
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
