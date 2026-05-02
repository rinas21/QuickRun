package main

import (
        "context"
        "errors"
        "strconv"

        "github.com/gin-gonic/gin"
        pgx "github.com/jackc/pgx/v5"
)

const offerCols = `id, order_id, seller_id, price, available, estimated_minutes, message, created_at`

func scanOffer(row pgx.CollectableRow) (Offer, error) {
        var o Offer
        err := row.Scan(&o.ID, &o.OrderID, &o.SellerID, &o.Price,
                &o.Available, &o.EstimatedMinutes, &o.Message, &o.CreatedAt)
        return o, err
}

// GET /api/orders/:orderId/offers — enriched with seller info, returns array
func handleListOffers(c *gin.Context) {
        orderID, err := strconv.Atoi(c.Param("orderId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid order ID"})
                return
        }
        rows, err := db.Query(context.Background(), `
                SELECT o.id, o.order_id, o.seller_id, o.price, o.available, o.estimated_minutes, o.message, o.created_at,
                       u.id, u.name, u.email, u.phone, u.role, u.is_active, u.is_online
                FROM offers o
                JOIN users u ON u.id = o.seller_id
                WHERE o.order_id = $1 ORDER BY o.price ASC`, orderID)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        defer rows.Close()

        var offers []OfferWithSeller
        for rows.Next() {
                var o OfferWithSeller
                err := rows.Scan(
                        &o.ID, &o.OrderID, &o.SellerID, &o.Price, &o.Available, &o.EstimatedMinutes, &o.Message, &o.CreatedAt,
                        &o.Seller.ID, &o.Seller.Name, &o.Seller.Email, &o.Seller.Phone, &o.Seller.Role, &o.Seller.IsActive, &o.Seller.IsOnline,
                )
                if err != nil {
                        continue
                }
                offers = append(offers, o)
        }
        if offers == nil {
                offers = []OfferWithSeller{}
        }
        c.JSON(200, offers)
}

// GET /api/offers/mine — seller's submitted offers with order context
func handleMyOffers(c *gin.Context) {
        user := c.MustGet("user").(User)
        rows, err := db.Query(context.Background(), `
                SELECT of.id, of.order_id, of.seller_id, of.price, of.available, of.estimated_minutes, of.message, of.created_at,
                       o.item_description, o.delivery_address, o.status,
                       COALESCE(o.selected_offer_id = of.id, false) as is_selected
                FROM offers of
                JOIN orders o ON o.id = of.order_id
                WHERE of.seller_id = $1
                ORDER BY of.created_at DESC LIMIT 50`, user.ID)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        defer rows.Close()

        var items []MyOfferItem
        for rows.Next() {
                var m MyOfferItem
                var sellerID int // discard — seller is the current user
                err := rows.Scan(
                        &m.OfferID, &m.OrderID, &sellerID, &m.Price, &m.Available, &m.EstimatedMinutes, &m.Message, &m.OfferCreatedAt,
                        &m.ItemDescription, &m.DeliveryAddress, &m.OrderStatus, &m.IsSelected,
                )
                if err != nil {
                        continue
                }
                items = append(items, m)
        }
        if items == nil {
                items = []MyOfferItem{}
        }
        c.JSON(200, gin.H{"offers": items})
}

func handleCreateOffer(c *gin.Context) {
        user := c.MustGet("user").(User)
        orderID, err := strconv.Atoi(c.Param("orderId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid order ID"})
                return
        }

        var body struct {
                Price            float64 `json:"price"`
                Available        bool    `json:"available"`
                EstimatedMinutes *int    `json:"estimatedMinutes"`
                Message          *string `json:"message"`
        }
        if err := c.ShouldBindJSON(&body); err != nil {
                c.JSON(400, gin.H{"error": "Invalid input"})
                return
        }
        if body.Price <= 0 {
                c.JSON(400, gin.H{"error": "Price must be greater than 0"})
                return
        }

        // Check order exists and is collecting_offers
        var status string
        err = db.QueryRow(context.Background(),
                "SELECT status FROM orders WHERE id = $1", orderID).Scan(&status)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Order not found"})
                return
        }
        if status != "collecting_offers" {
                c.JSON(400, gin.H{"error": "Order is not accepting offers"})
                return
        }

        // Check seller hasn't already submitted an offer
        var existingCount int
        db.QueryRow(context.Background(),
                "SELECT COUNT(*) FROM offers WHERE order_id = $1 AND seller_id = $2", orderID, user.ID).Scan(&existingCount)
        if existingCount > 0 {
                c.JSON(400, gin.H{"error": "You have already submitted an offer for this order"})
                return
        }

        var offer Offer
        err = db.QueryRow(context.Background(),
                `INSERT INTO offers (order_id, seller_id, price, available, estimated_minutes, message)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING `+offerCols,
                orderID, user.ID, body.Price, body.Available, body.EstimatedMinutes, body.Message,
        ).Scan(&offer.ID, &offer.OrderID, &offer.SellerID, &offer.Price,
                &offer.Available, &offer.EstimatedMinutes, &offer.Message, &offer.CreatedAt)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }

        db.Exec(context.Background(),
                "INSERT INTO activity (type, order_id, description) VALUES ('offer_submitted', $1, $2)",
                orderID, "New offer submitted",
        )

        c.JSON(201, offer)
}

func handleSelectOffer(c *gin.Context) {
        user := c.MustGet("user").(User)
        offerID, err := strconv.Atoi(c.Param("offerId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid offer ID"})
                return
        }

        ctx := context.Background()

        // Get the offer
        var offer Offer
        err = db.QueryRow(ctx,
                "SELECT "+offerCols+" FROM offers WHERE id = $1", offerID,
        ).Scan(&offer.ID, &offer.OrderID, &offer.SellerID, &offer.Price,
                &offer.Available, &offer.EstimatedMinutes, &offer.Message, &offer.CreatedAt)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Offer not found"})
                return
        }

        // Get the order and validate ownership
        var buyerID int
        var orderStatus string
        err = db.QueryRow(ctx,
                "SELECT buyer_id, status FROM orders WHERE id = $1", offer.OrderID,
        ).Scan(&buyerID, &orderStatus)
        if err != nil {
                c.JSON(404, gin.H{"error": "Order not found"})
                return
        }
        if user.Role != "admin" && buyerID != user.ID {
                c.JSON(403, gin.H{"error": "Forbidden"})
                return
        }
        if orderStatus != "collecting_offers" {
                c.JSON(400, gin.H{"error": "Order is not in the offer selection stage"})
                return
        }

        // Find an available driver — prefer online, fall back to any active driver
        var driverID int
        err = db.QueryRow(ctx,
                `SELECT id FROM users WHERE role = 'driver' AND is_active = true AND is_online = true
                 AND id NOT IN (SELECT driver_id FROM deliveries WHERE status NOT IN ('delivered', 'failed'))
                 ORDER BY RANDOM() LIMIT 1`).Scan(&driverID)
        if errors.Is(err, pgx.ErrNoRows) {
                // Try any online driver
                err = db.QueryRow(ctx,
                        `SELECT id FROM users WHERE role = 'driver' AND is_active = true AND is_online = true
                         ORDER BY RANDOM() LIMIT 1`).Scan(&driverID)
                if errors.Is(err, pgx.ErrNoRows) {
                        // Try any active driver
                        err = db.QueryRow(ctx,
                                `SELECT id FROM users WHERE role = 'driver' AND is_active = true
                                 ORDER BY RANDOM() LIMIT 1`).Scan(&driverID)
                        if err != nil {
                                c.JSON(503, gin.H{"error": "No drivers available right now. Please try again shortly."})
                                return
                        }
                }
        }

        // Create delivery record
        var delivery Delivery
        err = db.QueryRow(ctx,
                `INSERT INTO deliveries (order_id, driver_id, offer_id, status)
                 VALUES ($1, $2, $3, 'heading_to_seller')
                 RETURNING id, order_id, driver_id, offer_id, status, driver_latitude, driver_longitude, picked_up_at, delivered_at, created_at, updated_at`,
                offer.OrderID, driverID, offerID,
        ).Scan(&delivery.ID, &delivery.OrderID, &delivery.DriverID, &delivery.OfferID,
                &delivery.Status, &delivery.DriverLatitude, &delivery.DriverLongitude,
                &delivery.PickedUpAt, &delivery.DeliveredAt, &delivery.CreatedAt, &delivery.UpdatedAt)
        if err != nil {
                c.JSON(500, gin.H{"error": "Failed to create delivery"})
                return
        }

        // Update order status
        _, err = db.Exec(ctx,
                `UPDATE orders SET status = 'driver_assigned', selected_offer_id = $1, final_price = $2, updated_at = NOW()
                 WHERE id = $3`,
                offerID, offer.Price, offer.OrderID)
        if err != nil {
                c.JSON(500, gin.H{"error": "Failed to update order"})
                return
        }

        db.Exec(ctx,
                "INSERT INTO activity (type, order_id, description) VALUES ('driver_assigned', $1, 'Driver assigned for delivery')",
                offer.OrderID,
        )

        c.JSON(200, gin.H{"message": "Offer selected, driver assigned", "delivery": delivery, "driverId": driverID})
}

