package handler

import (
	"net/http"

	"paypath/internal/middleware"
	"paypath/internal/services/ai/insights"
	"paypath/pkg/response"
)

type InsightsHandler struct {
	svc *insights.Service
}

func NewInsightsHandler(svc *insights.Service) InsightsHandler {
	return InsightsHandler{svc: svc}
}

func (h InsightsHandler) GetInsights(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Get(r.Context(), middleware.UserID(r))
	if err != nil {
		aiError(w, err)
		return
	}
	response.JSON(w, 200, out)
}
