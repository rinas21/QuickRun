package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func main() {
	// Configure connection pool for production load handling
	config, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("cannot parse database URL: %v", err)
	}
	config.MinConns = 2
	config.MaxConns = 20
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	db, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}
	defer db.Close()

	// Verify connection
	if err := db.Ping(context.Background()); err != nil {
		log.Fatalf("database ping failed: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		secret = "quickrun-secret-key"
	}
	initAuth(secret)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())
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
	authGroup.PUT("/online", requireAuth, handleToggleOnlineStatus)

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
	offersGroup.GET("/mine", requireRole("seller"), handleMyOffers)
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

	log.Printf("QuickRun Go API starting on :%s (pool: min=2, max=20)", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
