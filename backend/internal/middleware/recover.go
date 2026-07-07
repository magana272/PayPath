package middleware

import (
	"net/http"

	"paypath/pkg/logger"
)

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				logger.Log.Error().Interface("panic", rec).Str("path", r.URL.Path).Msg("recovered from panic")
				http.Error(w, "internal server error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
