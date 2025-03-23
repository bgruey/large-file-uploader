package config

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"lfu-go/pkg/logger"
)

type Config struct {
	Logger    *logger.Logger
	ServerMux *http.ServeMux

	Env        string
	Host       string
	Port       int
	UploadPath string

	ActiveTokens map[string]string
	Username     string
	Password     string
}

func NewConfig() *Config {
	var err error
	ret := new(Config)

	ret.ActiveTokens = make(map[string]string)
	ret.Username = os.Getenv("USERNAME")
	ret.Password = os.Getenv("PASSWORD")

	ret.Logger = logger.NewLogger(nil, nil)

	ret.ServerMux = http.NewServeMux()

	ret.Env = os.Getenv("ENV")
	ret.Host = os.Getenv("HOST")
	ret.Port, err = strconv.Atoi(os.Getenv("PORT"))
	if err != nil {
		panic(err)
	}

	ret.UploadPath = os.Getenv("UPLOAD_PATH")

	if ret.Env == "dev" {
		ret.Host = fmt.Sprintf("http://%s:%d", ret.Host, ret.Port)
	} else {
		ret.Host = fmt.Sprintf("https://%s", ret.Host)
	}

	return ret
}

// GenerateRandomToken generates a random token of a specified length.
func GenerateRandomToken(length int) (string, error) {
	randomBytes := make([]byte, length)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(randomBytes), nil
}

func getKey(filename string, fileVersion string) string {
	return fmt.Sprintf("%s-%s", fileVersion, filename)
}

func (c *Config) AddFile(filename string, fileVersion string) (string, error) {
	key := getKey(filename, fileVersion)

	token, err := GenerateRandomToken(len(key))
	if err != nil {
		return "", err
	}
	c.ActiveTokens[key] = token

	return token, nil
}

func (c *Config) DropFile(filename string, fileVersion string) error {
	key := getKey(filename, fileVersion)

	_, ok := c.ActiveTokens[key]
	if !ok {
		return fmt.Errorf("invalid key: %s", key)
	}

	delete(c.ActiveTokens, key)
	return nil
}

func (c *Config) CheckFile(filename string, fileVersion string, token string) bool {
	key := getKey(filename, fileVersion)

	myToken, ok := c.ActiveTokens[key]
	if !ok {
		return false
	}

	if token != myToken {
		return false
	}

	return true
}
