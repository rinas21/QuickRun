package main

import (
	"context"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func main() {
	var err error
	db, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}
	defer db.Close()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		secret = "quickrun-secret-key"
	}
	initAuth(secret)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")

	api.GET("/healthz", handleHealth)

	// Auth
	authGroup := api.Group("/auth")
	authGroup.POST("/register", handleRegister)
	authGroup.POST("/login", handleLogin)
	authGroup.POST("/logout", requireAuth, handleLogout)
	authGroup.GET("/me", requireAuth, handleMe)

	// Orders
	orders := api.Group("/orders", requireAuth)
	orders.GET("", handleListOrders)
	orders.POST("", requireRole("buyer", "admin"), handleCreateOrder)
	orders.GET("/:orderId", handleGetOrder)
	orders.POST("/:orderId/cancel", handleCancelOrder)
	orders.GET("/:orderId/offers", handleListOffers)
	orders.POST("/:orderId/offers", requireRole("seller", "admin"), handleCreateOffer)

	// Offers
	offersGroup := api.Group("/offers", requireAuth)
	offersGroup.POST("/:offerId/select", requireRole("buyer", "admin"), handleSelectOffer)

	// Deliveries
	deliveries := api.Group("/deliveries", requireAuth)
	deliveries.GET("", handleListDeliveries)
	deliveries.GET("/:deliveryId", handleGetDelivery)
	deliveries.PATCH("/:deliveryId/status", requireRole("driver", "admin"), handleUpdateDeliveryStatus)
	deliveries.PATCH("/:deliveryId/location", requireRole("driver", "admin"), handleUpdateDriverLocation)

	// Users
	users := api.Group("/users", requireAuth)
	users.GET("", requireRole("admin"), handleListUsers)
	users.PATCH("/:userId/status", requireRole("admin"), handleUpdateUserStatus)
	users.GET("/drivers/available", handleListAvailableDrivers)

	// Dashboard
	dash := api.Group("/dashboard", requireAuth)
	dash.GET("/stats", handleDashboardStats)
	dash.GET("/activity", handleDashboardActivity)
	dash.GET("/order-status-breakdown", handleOrderStatusBreakdown)

	// Inventory / Marketplace
	inv := api.Group("/inventory", requireAuth)
	inv.GET("", handleListInventory)
	inv.GET("/mine", requireRole("seller"), handleMyInventory)
	inv.POST("", requireRole("seller"), handleCreateInventoryItem)
	inv.PUT("/:itemId", requireRole("seller"), handleUpdateInventoryItem)
	inv.DELETE("/:itemId", requireRole("seller"), handleDeleteInventoryItem)

	log.Printf("QuickRun Go API server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
