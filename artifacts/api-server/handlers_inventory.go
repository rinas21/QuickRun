package main

import (
        "context"
        "errors"
        "strconv"

        "github.com/gin-gonic/gin"
        pgx "github.com/jackc/pgx/v5"
)

const invCols = `id, seller_id, name, category, description, price, quantity, unit, is_available, image_url, created_at, updated_at`

func scanInventoryItem(row pgx.CollectableRow) (InventoryItem, error) {
        var item InventoryItem
        err := row.Scan(&item.ID, &item.SellerID, &item.Name, &item.Category,
                &item.Description, &item.Price, &item.Quantity, &item.Unit,
                &item.IsAvailable, &item.ImageURL, &item.CreatedAt, &item.UpdatedAt)
        return item, err
}

// GET /api/inventory — browse all available items (for buyers)
func handleListInventory(c *gin.Context) {
        ctx := context.Background()
        category := c.Query("category")
        search := c.Query("search")

        query := `
                SELECT i.id, i.seller_id, i.name, i.category, i.description,
                       i.price, i.quantity, i.unit, i.is_available, i.image_url,
                       i.created_at, i.updated_at,
                       u.name AS seller_name, u.phone AS seller_phone
                FROM inventory i
                JOIN users u ON u.id = i.seller_id
                WHERE i.is_available = true`
        args := []interface{}{}
        argIdx := 1

        if category != "" {
                query += " AND i.category = $" + strconv.Itoa(argIdx)
                args = append(args, category)
                argIdx++
        }
        if search != "" {
                query += " AND (i.name ILIKE $" + strconv.Itoa(argIdx) + " OR i.description ILIKE $" + strconv.Itoa(argIdx) + ")"
                args = append(args, "%"+search+"%")
                argIdx++
        }
        query += " ORDER BY i.name ASC LIMIT 100"

        rows, err := db.Query(ctx, query, args...)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        defer rows.Close()

        var items []InventoryItemWithSeller
        for rows.Next() {
                var item InventoryItemWithSeller
                err := rows.Scan(
                        &item.ID, &item.SellerID, &item.Name, &item.Category,
                        &item.Description, &item.Price, &item.Quantity, &item.Unit,
                        &item.IsAvailable, &item.ImageURL, &item.CreatedAt, &item.UpdatedAt,
                        &item.SellerName, &item.SellerPhone,
                )
                if err != nil {
                        continue
                }
                items = append(items, item)
        }
        if items == nil {
                items = []InventoryItemWithSeller{}
        }
        c.JSON(200, gin.H{"items": items, "total": len(items)})
}

// GET /api/inventory/mine — seller's own inventory
func handleMyInventory(c *gin.Context) {
        user := c.MustGet("user").(User)
        rows, err := db.Query(context.Background(),
                "SELECT "+invCols+" FROM inventory WHERE seller_id = $1 ORDER BY name ASC", user.ID)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        items, err := pgx.CollectRows(rows, scanInventoryItem)
        if err != nil {
                c.JSON(500, gin.H{"error": "Scan error"})
                return
        }
        if items == nil {
                items = []InventoryItem{}
        }
        c.JSON(200, gin.H{"items": items, "total": len(items)})
}

// POST /api/inventory — create item
func handleCreateInventoryItem(c *gin.Context) {
        user := c.MustGet("user").(User)
        var body struct {
                Name        string  `json:"name" binding:"required"`
                Category    string  `json:"category"`
                Description *string `json:"description"`
                Price       float64 `json:"price" binding:"required"`
                Quantity    int     `json:"quantity"`
                Unit        string  `json:"unit"`
                IsAvailable bool    `json:"isAvailable"`
                ImageURL    *string `json:"imageUrl"`
        }
        if err := c.ShouldBindJSON(&body); err != nil {
                c.JSON(400, gin.H{"error": "Invalid input"})
                return
        }
        if body.Category == "" {
                body.Category = "general"
        }
        if body.Unit == "" {
                body.Unit = "pcs"
        }

        var item InventoryItem
        err := db.QueryRow(context.Background(),
                `INSERT INTO inventory (seller_id, name, category, description, price, quantity, unit, is_available, image_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING `+invCols,
                user.ID, body.Name, body.Category, body.Description, body.Price,
                body.Quantity, body.Unit, body.IsAvailable, body.ImageURL,
        ).Scan(&item.ID, &item.SellerID, &item.Name, &item.Category,
                &item.Description, &item.Price, &item.Quantity, &item.Unit,
                &item.IsAvailable, &item.ImageURL, &item.CreatedAt, &item.UpdatedAt)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        c.JSON(201, item)
}

// PUT /api/inventory/:itemId — update item
func handleUpdateInventoryItem(c *gin.Context) {
        user := c.MustGet("user").(User)
        itemID, err := strconv.Atoi(c.Param("itemId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid item ID"})
                return
        }

        // Check ownership
        var sellerID int
        err = db.QueryRow(context.Background(),
                "SELECT seller_id FROM inventory WHERE id = $1", itemID).Scan(&sellerID)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Item not found"})
                return
        }
        if sellerID != user.ID {
                c.JSON(403, gin.H{"error": "Forbidden"})
                return
        }

        var body struct {
                Name        *string  `json:"name"`
                Category    *string  `json:"category"`
                Description *string  `json:"description"`
                Price       *float64 `json:"price"`
                Quantity    *int     `json:"quantity"`
                Unit        *string  `json:"unit"`
                IsAvailable *bool    `json:"isAvailable"`
                ImageURL    *string  `json:"imageUrl"`
        }
        if err := c.ShouldBindJSON(&body); err != nil {
                c.JSON(400, gin.H{"error": "Invalid input"})
                return
        }

        ctx := context.Background()

        // Build update query dynamically
        setClauses := ""
        args := []interface{}{}
        idx := 1

        if body.Name != nil {
                setClauses += ", name = $" + strconv.Itoa(idx)
                args = append(args, *body.Name)
                idx++
        }
        if body.Category != nil {
                setClauses += ", category = $" + strconv.Itoa(idx)
                args = append(args, *body.Category)
                idx++
        }
        if body.Description != nil {
                setClauses += ", description = $" + strconv.Itoa(idx)
                args = append(args, *body.Description)
                idx++
        }
        if body.Price != nil {
                setClauses += ", price = $" + strconv.Itoa(idx)
                args = append(args, *body.Price)
                idx++
        }
        if body.Quantity != nil {
                setClauses += ", quantity = $" + strconv.Itoa(idx)
                args = append(args, *body.Quantity)
                idx++
        }
        if body.Unit != nil {
                setClauses += ", unit = $" + strconv.Itoa(idx)
                args = append(args, *body.Unit)
                idx++
        }
        if body.IsAvailable != nil {
                setClauses += ", is_available = $" + strconv.Itoa(idx)
                args = append(args, *body.IsAvailable)
                idx++
        }
        if body.ImageURL != nil {
                setClauses += ", image_url = $" + strconv.Itoa(idx)
                args = append(args, *body.ImageURL)
                idx++
        }

        if setClauses == "" {
                c.JSON(400, gin.H{"error": "No fields to update"})
                return
        }

        args = append(args, itemID)
        query := "UPDATE inventory SET updated_at = NOW()" + setClauses + " WHERE id = $" + strconv.Itoa(idx) + " RETURNING " + invCols

        var item InventoryItem
        err = db.QueryRow(ctx, query, args...).Scan(
                &item.ID, &item.SellerID, &item.Name, &item.Category,
                &item.Description, &item.Price, &item.Quantity, &item.Unit,
                &item.IsAvailable, &item.ImageURL, &item.CreatedAt, &item.UpdatedAt)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        c.JSON(200, item)
}

// DELETE /api/inventory/:itemId — delete item
func handleDeleteInventoryItem(c *gin.Context) {
        user := c.MustGet("user").(User)
        itemID, err := strconv.Atoi(c.Param("itemId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid item ID"})
                return
        }

        var sellerID int
        err = db.QueryRow(context.Background(),
                "SELECT seller_id FROM inventory WHERE id = $1", itemID).Scan(&sellerID)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Item not found"})
                return
        }
        if sellerID != user.ID {
                c.JSON(403, gin.H{"error": "Forbidden"})
                return
        }

        db.Exec(context.Background(), "DELETE FROM inventory WHERE id = $1", itemID)
        c.JSON(200, gin.H{"message": "Item deleted"})
}
