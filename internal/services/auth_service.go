package services

import (
	"context"
	"errors"
	"os"
	"time"

	"tirthankarkundu17/pandal-hopping-api/internal/models"
	"tirthankarkundu17/pandal-hopping-api/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(ctx context.Context, req models.RegisterRequest) (*models.User, error)
	Login(ctx context.Context, req models.LoginRequest) (string, string, int64, error)
}

type authService struct {
	userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authService{userRepo: userRepo}
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "supersecretkey"
	}
	return []byte(secret)
}

func (s *authService) Register(ctx context.Context, req models.RegisterRequest) (*models.User, error) {
	existingUser, _ := s.userRepo.FindByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, errors.New("email already in use")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.userRepo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *authService) Login(ctx context.Context, req models.LoginRequest) (string, string, int64, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return "", "", 0, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return "", "", 0, errors.New("invalid email or password")
	}

	// Access Token: 1 hour expiry
	accessTokenExp := time.Now().Add(time.Hour * 1)
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID.Hex(),
		"exp": accessTokenExp.Unix(),
	})

	accessTokenString, err := accessToken.SignedString(getJWTSecret())
	if err != nil {
		return "", "", 0, err
	}

	// Refresh Token: 7 days expiry
	refreshTokenExp := time.Now().Add(time.Hour * 24 * 7)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID.Hex(),
		"exp": refreshTokenExp.Unix(),
	})

	refreshTokenString, err := refreshToken.SignedString(getJWTSecret())
	if err != nil {
		return "", "", 0, err
	}

	expiresIn := int64(time.Until(accessTokenExp).Seconds())

	return accessTokenString, refreshTokenString, expiresIn, nil
}
