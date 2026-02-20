package routes

import (
	"tirthankarkundu17/pandal-hopping-api/controllers"

	"github.com/gin-gonic/gin"
)

func PandalRoute(router *gin.Engine, pc *controllers.PandalController) {
	router.POST("/pandal", pc.CreatePandal())
	router.GET("/pandals", pc.GetAllPandals())
}
