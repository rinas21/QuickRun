package main

import "time"

type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"isActive"`
	IsOnline  bool      `json:"isOnline"`
	Latitude  *float64  `json:"latitude"`
	Longitude *float64  `json:"longitude"`
	CreatedAt time.Time `json:"createdAt"`
}

type Order struct {
	ID                int       `json:"id"`
	BuyerID           int       `json:"buyerId"`
	ItemDescription   string    `json:"itemDescription"`
	DeliveryAddress   string    `json:"deliveryAddress"`
	DeliveryLatitude  *float64  `json:"deliveryLatitude"`
	DeliveryLongitude *float64  `json:"deliveryLongitude"`
	Status            string    `json:"status"`
	Notes             *string   `json:"notes"`
	FinalPrice        *float64  `json:"finalPrice"`
	SelectedOfferID   *int      `json:"selectedOfferId"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type Offer struct {
	ID               int       `json:"id"`
	OrderID          int       `json:"orderId"`
	SellerID         int       `json:"sellerId"`
	Price            float64   `json:"price"`
	Available        bool      `json:"available"`
	EstimatedMinutes *int      `json:"estimatedMinutes"`
	Message          *string   `json:"message"`
	CreatedAt        time.Time `json:"createdAt"`
}

// OfferSeller embedded in OfferWithSeller
type OfferSeller struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
	IsActive bool   `json:"isActive"`
	IsOnline bool   `json:"isOnline"`
}

// OfferWithSeller is returned by GET /orders/:id/offers
type OfferWithSeller struct {
	ID               int         `json:"id"`
	OrderID          int         `json:"orderId"`
	SellerID         int         `json:"sellerId"`
	Price            float64     `json:"price"`
	Available        bool        `json:"available"`
	EstimatedMinutes *int        `json:"estimatedMinutes"`
	Message          *string     `json:"message"`
	CreatedAt        time.Time   `json:"createdAt"`
	Seller           OfferSeller `json:"seller"`
}

// MyOfferItem — used by GET /offers/mine (seller portal)
type MyOfferItem struct {
	OfferID          int       `json:"offerId"`
	OrderID          int       `json:"orderId"`
	Price            float64   `json:"price"`
	Available        bool      `json:"available"`
	EstimatedMinutes *int      `json:"estimatedMinutes"`
	Message          *string   `json:"message"`
	OfferCreatedAt   time.Time `json:"offerCreatedAt"`
	IsSelected       bool      `json:"isSelected"`
	// Order info
	ItemDescription string `json:"itemDescription"`
	DeliveryAddress string `json:"deliveryAddress"`
	OrderStatus     string `json:"orderStatus"`
}

type Delivery struct {
	ID              int        `json:"id"`
	OrderID         int        `json:"orderId"`
	DriverID        int        `json:"driverId"`
	OfferID         int        `json:"offerId"`
	Status          string     `json:"status"`
	DriverLatitude  *float64   `json:"driverLatitude"`
	DriverLongitude *float64   `json:"driverLongitude"`
	PickedUpAt      *time.Time `json:"pickedUpAt"`
	DeliveredAt     *time.Time `json:"deliveredAt"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type InventoryItem struct {
	ID          int       `json:"id"`
	SellerID    int       `json:"sellerId"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Description *string   `json:"description"`
	Price       float64   `json:"price"`
	Quantity    int       `json:"quantity"`
	Unit        string    `json:"unit"`
	IsAvailable bool      `json:"isAvailable"`
	ImageURL    *string   `json:"imageUrl"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type InventoryItemWithSeller struct {
	InventoryItem
	SellerName  string `json:"sellerName"`
	SellerPhone string `json:"sellerPhone"`
}

// Enriched delivery — returned by GET /api/deliveries and GET /api/deliveries/:id
type DeliveryDriver struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type DeliveryBuyer struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type DeliverySeller struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type DeliveryOrderInfo struct {
	ID                int           `json:"id"`
	ItemDescription   string        `json:"itemDescription"`
	DeliveryAddress   string        `json:"deliveryAddress"`
	DeliveryLatitude  *float64      `json:"deliveryLatitude"`
	DeliveryLongitude *float64      `json:"deliveryLongitude"`
	Buyer             DeliveryBuyer `json:"buyer"`
}

type DeliveryOfferInfo struct {
	ID     int            `json:"id"`
	Price  float64        `json:"price"`
	Seller DeliverySeller `json:"seller"`
}

type DeliveryDetail struct {
	ID              int               `json:"id"`
	OrderID         int               `json:"orderId"`
	DriverID        int               `json:"driverId"`
	OfferID         int               `json:"offerId"`
	Status          string            `json:"status"`
	DriverLatitude  *float64          `json:"driverLatitude"`
	DriverLongitude *float64          `json:"driverLongitude"`
	PickedUpAt      *time.Time        `json:"pickedUpAt"`
	DeliveredAt     *time.Time        `json:"deliveredAt"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
	Driver          DeliveryDriver    `json:"driver"`
	Order           DeliveryOrderInfo `json:"order"`
	Offer           DeliveryOfferInfo `json:"offer"`
}

// Enriched order — returned by GET /api/orders/:id
type OrderDeliveryRef struct {
	ID              int      `json:"id"`
	Status          string   `json:"status"`
	DriverLatitude  *float64 `json:"driverLatitude"`
	DriverLongitude *float64 `json:"driverLongitude"`
}

type OrderWithDelivery struct {
	Order
	Delivery *OrderDeliveryRef `json:"delivery"`
}

type Activity struct {
	ID          int       `json:"id"`
	Type        string    `json:"type"`
	OrderID     *int      `json:"orderId"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}
