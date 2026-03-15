package routes

import (
	"tirthankarkundu17/pandal-hopping-api/internal/handlers"
	"tirthankarkundu17/pandal-hopping-api/internal/middleware"

	"github.com/gin-gonic/gin"
)

// UserRoute sets up authenticated user profile and location endpoints.
func UserRoute(router *gin.RouterGroup, handler *handlers.UserHandler) {
	userRoutes := router.Group("/users")
	userRoutes.Use(middleware.AuthMiddleware())
	{
		userRoutes.GET("/me", handler.GetProfile)
		userRoutes.PUT("/me/base-location", handler.UpdateBaseLocation)
	}
}
