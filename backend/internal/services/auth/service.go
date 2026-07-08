package auth

import (
	"errors"
	"strings"
	"time"

	"paypath/internal/services/reporting"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const ProtectedEmail = "user@email.com"

var (
	ErrMissingFields      = errors.New("email, password, and name are required")
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrMissingToken       = errors.New("missing token")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenRevoked       = errors.New("token revoked")
	ErrUserNotFound       = errors.New("user not found")
	ErrProtectedAccount   = errors.New("this account cannot be deleted")
)

type Claims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

type ScenarioWarmer interface {
	Scenarios(userID int) ([]reporting.Scenario, error)
}

type Service struct {
	repo      Repository
	jwtSecret []byte
	warmer    ScenarioWarmer
}

func NewService(repo Repository, jwtSecret string, warmer ScenarioWarmer) *Service {
	return &Service{repo: repo, jwtSecret: []byte(jwtSecret), warmer: warmer}
}

func (s *Service) Register(req RegisterRequest) (string, error) {
	if req.Email == "" || req.Password == "" || req.Name == "" {
		return "", ErrMissingFields
	}
	existing, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return "", err
	}
	if existing != nil {
		return "", ErrEmailTaken
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	id, err := s.repo.CreateUser(req.Email, string(hash), req.Name)
	if err != nil {
		return "", err
	}
	return s.generateToken(int(id))
}

func (s *Service) Login(req LoginRequest) (string, error) {
	if req.Email == "" || req.Password == "" {
		return "", ErrMissingFields
	}
	user, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return "", ErrInvalidCredentials
	}
	token, err := s.generateToken(user.ID)
	if err != nil {
		return "", err
	}
	if s.warmer != nil {
		go s.warmer.Scenarios(user.ID)
	}
	return token, nil
}

func (s *Service) Logout(token string) error {
	if token == "" {
		return ErrMissingToken
	}
	return s.repo.RevokeToken(token)
}

func (s *Service) Delete(token string) error {
	if token == "" {
		return ErrMissingToken
	}
	revoked, err := s.repo.IsTokenRevoked(token)
	if err != nil {
		return err
	}
	if revoked {
		return ErrTokenRevoked
	}
	claims, err := s.parseToken(token)
	if err != nil {
		return ErrInvalidToken
	}
	user, err := s.repo.GetUserByID(claims.UserID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}
	if user.Email == ProtectedEmail {
		return ErrProtectedAccount
	}
	found, err := s.repo.DeleteUser(claims.UserID)
	if err != nil {
		return err
	}
	if !found {
		return ErrUserNotFound
	}
	s.repo.RevokeToken(token)
	return nil
}

func (s *Service) Me(token string) (*User, error) {
	if token == "" {
		return nil, ErrMissingToken
	}
	revoked, err := s.repo.IsTokenRevoked(token)
	if err != nil {
		return nil, err
	}
	if revoked {
		return nil, ErrTokenRevoked
	}
	claims, err := s.parseToken(token)
	if err != nil {
		return nil, ErrInvalidToken
	}
	user, err := s.repo.GetUserByID(claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *Service) IsProtected(userID int) (bool, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return false, err
	}
	return user != nil && user.Email == ProtectedEmail, nil
}

func (s *Service) Authenticate(token string) (int, error) {
	claims, err := s.parseToken(token)
	if err != nil {
		return 0, ErrInvalidToken
	}
	revoked, err := s.repo.IsTokenRevoked(token)
	if err != nil {
		return 0, err
	}
	if revoked {
		return 0, ErrTokenRevoked
	}
	return claims.UserID, nil
}

func (s *Service) generateToken(userID int) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *Service) parseToken(raw string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	return token.Claims.(*Claims), nil
}

func BearerToken(authHeader string) string {
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(authHeader, "Bearer ")
}
