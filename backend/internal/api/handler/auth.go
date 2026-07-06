package handler

import (
	"errors"
	"net/http"

	"paypath/internal/services/auth"
	"paypath/pkg/response"
)

type AuthHandler struct {
	svc *auth.Service
}

func NewAuthHandler(svc *auth.Service) AuthHandler {
	return AuthHandler{svc: svc}
}

func (h AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req auth.RegisterRequest
	if err := response.Decode(r, &req); err != nil {
		http.Error(w, "invalid request body", 400)
		return
	}
	token, err := h.svc.Register(req)
	if err != nil {
		http.Error(w, err.Error(), authStatus(err))
		return
	}
	response.JSON(w, 201, auth.AuthResponse{Token: token})
}

func (h AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req auth.LoginRequest
	if err := response.Decode(r, &req); err != nil {
		http.Error(w, "invalid request body", 400)
		return
	}
	token, err := h.svc.Login(req)
	if err != nil {
		http.Error(w, err.Error(), authStatus(err))
		return
	}
	response.JSON(w, 200, auth.AuthResponse{Token: token})
}

func (h AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Logout(auth.BearerToken(r.Header.Get("Authorization"))); err != nil {
		http.Error(w, err.Error(), authStatus(err))
		return
	}
	response.JSON(w, 200, map[string]interface{}{})
}

func (h AuthHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(auth.BearerToken(r.Header.Get("Authorization"))); err != nil {
		http.Error(w, err.Error(), authStatus(err))
		return
	}
	response.JSON(w, 200, map[string]interface{}{})
}

func (h AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, err := h.svc.Me(auth.BearerToken(r.Header.Get("Authorization")))
	if err != nil {
		http.Error(w, err.Error(), authStatus(err))
		return
	}
	response.JSON(w, 200, user)
}

func authStatus(err error) int {
	switch {
	case errors.Is(err, auth.ErrMissingFields):
		return 400
	case errors.Is(err, auth.ErrEmailTaken):
		return 409
	case errors.Is(err, auth.ErrUserNotFound):
		return 404
	case errors.Is(err, auth.ErrMissingToken),
		errors.Is(err, auth.ErrInvalidToken),
		errors.Is(err, auth.ErrTokenRevoked),
		errors.Is(err, auth.ErrInvalidCredentials):
		return 401
	case errors.Is(err, auth.ErrProtectedAccount):
		return 403
	default:
		return 500
	}
}
