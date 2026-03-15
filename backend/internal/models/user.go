package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GeoJSONPoint represents a GeoJSON Point for MongoDB 2dsphere indexing.
// Coordinates are stored as [longitude, latitude] per GeoJSON spec.
type GeoJSONPoint struct {
	Type        string    `json:"type" bson:"type"`
	Coordinates []float64 `json:"coordinates" bson:"coordinates"`
}

func NewGeoJSONPoint(lng, lat float64) *GeoJSONPoint {
	return &GeoJSONPoint{
		Type:        "Point",
		Coordinates: []float64{lng, lat},
	}
}

type User struct {
	ID           primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Name         string             `json:"name" bson:"name"`
	Email        string             `json:"email" bson:"email"`
	Password     string             `json:"-" bson:"password"`
	BaseLocation *GeoJSONPoint      `json:"baseLocation,omitempty" bson:"baseLocation,omitempty"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// UpdateBaseLocationRequest is the payload for PUT /users/me/base-location
type UpdateBaseLocationRequest struct {
	Latitude  float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude float64 `json:"longitude" binding:"required,min=-180,max=180"`
}
