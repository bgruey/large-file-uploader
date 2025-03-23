package app

import (
	"fmt"
	"net/http"

	"lfu-go/pkg/config"
	"lfu-go/server/app/handlers"
)

type App struct {
	config *config.Config
	static *handlers.Middleware
	token  *handlers.Middleware
	upload *handlers.Middleware
}

func NewServer() *App {
	ret := new(App)
	ret.config = config.NewConfig()

	ret.static = handlers.NewMiddleware(
		ret.config,
		handlers.NewStaticHandler(ret.config),
		"/",
	)

	ret.token = handlers.NewMiddleware(
		ret.config,
		handlers.NewTokenHandler(ret.config),
		"/token",
	)

	ret.upload = handlers.NewMiddleware(
		ret.config,
		handlers.NewUploadHandler(ret.config),
		"/upload",
	)

	return ret
}

func (a *App) Run() {
	a.config.Logger.Infof("Listening on :%d", a.config.Port)
	http.ListenAndServe(
		fmt.Sprintf(":%d", a.config.Port),
		a.config.ServerMux,
	)
}
