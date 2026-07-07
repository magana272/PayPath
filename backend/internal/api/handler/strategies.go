package handler

import (
	"errors"
	"net/http"

	"paypath/internal/clients"
	"paypath/internal/middleware"
	"paypath/internal/services/ai/strategies"
	"paypath/pkg/response"
)

type StrategiesHandler struct {
	svc *strategies.Service
}

func NewStrategiesHandler(svc *strategies.Service) StrategiesHandler {
	return StrategiesHandler{svc: svc}
}

func aiError(w http.ResponseWriter, err error) {
	if errors.Is(err, clients.ErrNoAPIKey) {
		http.Error(w, "AI is not configured", http.StatusServiceUnavailable)
		return
	}
	http.Error(w, err.Error(), http.StatusBadGateway)
}

func (h StrategiesHandler) Status(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, 200, map[string]bool{"configured": clients.Configured()})
}

func (h StrategiesHandler) DebtPayoffStrategy(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.DebtPayoff(r.Context(), middleware.UserID(r))
	if err != nil {
		aiError(w, err)
		return
	}
	response.JSON(w, 200, out)
}

func (h StrategiesHandler) SavingsPlan(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.SavingsPlan(r.Context(), middleware.UserID(r))
	if err != nil {
		aiError(w, err)
		return
	}
	response.JSON(w, 200, out)
}

func (h StrategiesHandler) ExpenseAudit(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.ExpenseAudit(r.Context(), middleware.UserID(r))
	if err != nil {
		aiError(w, err)
		return
	}
	response.JSON(w, 200, out)
}

func (h StrategiesHandler) IncomeBoost(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.IncomeBoost(r.Context(), middleware.UserID(r))
	if err != nil {
		aiError(w, err)
		return
	}
	response.JSON(w, 200, out)
}
