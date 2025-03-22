package handlers

import (
	"net/http"
	"os"
	"strings"
	"time"

	"lfu-go/pkg/config"
	"lfu-go/pkg/html"
	"lfu-go/pkg/responses"
)

type Static struct {
	config *config.Config
}

type pageData struct {
	Timestamp int64
	Host      string
}

func NewStaticHandler(config *config.Config) *Static {
	ret := new(Static)

	ret.config = config

	return ret
}

func (s *Static) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		responses.RespondWithError(w, http.StatusBadRequest, "GET only.")
		return
	}
	if strings.HasSuffix(r.URL.Path, "info") || r.URL.Path == "/" {
		data := pageData{
			Timestamp: time.Now().Unix(),
			Host:      s.config.Host,
		}
		msg, err := html.SendTemplate(w, "main.html", data)
		if err != nil {
			s.config.Logger.Errorf("failed to render %s: %v", msg, err)
		}
	} else {
		s.ParseURI(w, r)
	}

}

func (s *Static) ParseURI(w http.ResponseWriter, r *http.Request) {
	data, err := os.ReadFile("/server/" + r.URL.Path)
	if err != nil {
		s.config.Logger.Infof("404 (%s): %s", err, r.URL.Path)
		responses.RespondWithError(w, http.StatusNotFound, "not found")
	}
	if strings.HasSuffix(r.URL.Path, ".js") {
		w.Header().Set("Content-Type", "text/javascript")
	} else {
		w.Header().Set("Content-Type", "text/css")
	}
	w.Write(data)
}
