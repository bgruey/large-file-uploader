package parse

import (
	"encoding/json"
	"io"
	"net/http"
)

func ParseRequest(r *http.Request, model any) error {
	defer r.Body.Close()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}

	err = json.Unmarshal(body, model)
	if err != nil {
		return err
	}

	return nil
}
