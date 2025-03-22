package html

import (
	"fmt"
	"html/template"
	"net/http"

	"lfu-go/pkg/responses"
)

const staticFolder = "/server/static/"

func SendTemplate(w http.ResponseWriter, filename string, pageData any) (string, error) {

	fullPath := staticFolder + filename
	page, err := template.ParseFiles(fullPath)
	if err != nil {

		responses.RespondWithError(w, http.StatusInternalServerError, "oops")
		return fmt.Sprintf("failed to read template: %s", fullPath), err
	}

	err = page.Execute(w, pageData)
	if err != nil {
		responses.RespondWithError(w, http.StatusInternalServerError, "oops")
		return fmt.Sprintf("failed to write template: %s", fullPath), err
	}

	return "", nil
}
