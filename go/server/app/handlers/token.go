package handlers

import (
	"net/http"

	"lfu-go/pkg/config"
	"lfu-go/pkg/parse"
	"lfu-go/pkg/responses"
)

type TokenHandler struct {
	config *config.Config
}

func NewTokenHandler(config *config.Config) *TokenHandler {
	ret := new(TokenHandler)

	ret.config = config

	return ret
}

type TokenRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	FileName    string `json:"file_name"`
	FileVersion string `json:"file_version"`
}

type TokenResponse struct {
	Token       string `json:"token"`
	FileVersion string `json:"file_version"`
	Filename    string `json:"file_name"`
}

func (t *TokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		responses.RespondWithError(w, http.StatusBadRequest, "POST only fortoken endpoint")
		return
	}

	// This should work by testing elsewhere
	request := new(TokenRequest)
	err := parse.ParseRequest(r, request)
	if err != nil {
		responses.RespondWithError(w, http.StatusBadRequest, "invalid post data")
		return
	}

	if request.Username != t.config.Username || request.Password != t.config.Password {
		responses.RespondWithError(w, http.StatusForbidden, "incorrect username or password")
		return
	}

	response := new(TokenResponse)
	response.FileVersion = request.FileVersion
	response.Filename = request.FileName

	response.Token, err = t.config.AddFile(request.FileName, request.FileVersion)
	if err != nil {
		t.config.Logger.Errorf("failed to add tokne: %v", err)
		responses.Oops(w)
		return
	}

	responses.RespondWithJSON(w, http.StatusCreated, response)
}
