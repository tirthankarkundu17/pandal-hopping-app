package services

import (
	"context"
	"errors"

	"tirthankarkundu17/pandal-hopping-api/internal/models"
	"tirthankarkundu17/pandal-hopping-api/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserService interface {
	GetProfile(ctx context.Context, userID string) (*models.User, error)
	UpdateBaseLocation(ctx context.Context, userID string, lat, lng float64) (*models.User, error)
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{userRepo: userRepo}
}

func (s *userService) GetProfile(ctx context.Context, userID string) (*models.User, error) {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}
	return s.userRepo.FindByID(ctx, id)
}

func (s *userService) UpdateBaseLocation(ctx context.Context, userID string, lat, lng float64) (*models.User, error) {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	point := models.NewGeoJSONPoint(lng, lat)
	return s.userRepo.UpdateBaseLocation(ctx, id, point)
}
