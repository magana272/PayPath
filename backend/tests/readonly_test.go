package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"paypath/internal/middleware"
)

type stubChecker map[int]bool

func (s stubChecker) IsProtected(userID int) (bool, error) {
	return s[userID], nil
}

func TestBlockProtectedWrites(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
	})
	h := middleware.BlockProtectedWrites(stubChecker{1: true}, next)

	cases := []struct {
		name   string
		method string
		userID int
		want   int
	}{
		{"protected GET allowed", http.MethodGet, 1, 200},
		{"protected POST blocked", http.MethodPost, 1, 403},
		{"protected PUT blocked", http.MethodPut, 1, 403},
		{"protected DELETE blocked", http.MethodDelete, 1, 403},
		{"normal POST allowed", http.MethodPost, 2, 200},
		{"normal PUT allowed", http.MethodPut, 2, 200},
		{"normal DELETE allowed", http.MethodDelete, 2, 200},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, "/api/expenses", nil)
			req = req.WithContext(middleware.ContextWithUserID(req.Context(), tc.userID))
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("want %d, got %d", tc.want, rec.Code)
			}
		})
	}
}