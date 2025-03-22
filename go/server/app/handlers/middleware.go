package handlers

import (
	"net/http"

	"lfu-go/pkg/config"
)

type Middleware struct {
	config  *config.Config
	handler http.Handler
}

func NewMiddleware(config *config.Config, wrapMe http.Handler, route string) *Middleware {
	ret := new(Middleware)

	ret.config = config
	ret.config.ServerMux.Handle(route, ret)

	ret.handler = wrapMe
	return ret
}

func (m *Middleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	m.handler.ServeHTTP(w, r)
}
