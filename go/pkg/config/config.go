package config

import (
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
}

func NewConfig() *Config {
	var err error
	ret := new(Config)

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
