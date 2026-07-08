package middleware

import "net/http"

type ProtectedChecker interface {
	IsProtected(userID int) (bool, error)
}

func BlockProtectedWrites(c ProtectedChecker, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			protected, err := c.IsProtected(UserID(r))
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
			if protected {
				http.Error(w, "demo account is read-only", 403)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}