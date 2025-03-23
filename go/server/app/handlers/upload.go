package handlers

import (
	"fmt"
	"hash/crc32"
	"io"
	"net/http"
	"os"

	"lfu-go/pkg/config"
	"lfu-go/pkg/parse"
	"lfu-go/pkg/responses"
)

type Upload struct {
	config     *config.Config
	crc32Table *crc32.Table
}

type UploadRequest struct {
	ChunkBytes  []byte `json:"chunk"`
	Checksum    uint32 `json:"checksum"`
	Index       int    `json:"index"`
	Filename    string `json:"filename"`
	FileVersion string `json:"file_version"`
	TotalChunks int    `json:"total_chunks"`
	Token       string `json:"token"`
}

func NewUploadHandler(config *config.Config) *Upload {
	ret := new(Upload)
	ret.config = config
	ret.crc32Table = crc32.MakeTable(crc32.IEEE)

	return ret
}

func (u *Upload) getFilePath(index *int, version string, filename string) string {
	if index != nil {
		return fmt.Sprintf("%s/%d-%s-%s",
			u.config.UploadPath, *index, version, filename,
		)

	}

	return fmt.Sprintf("%s/%s-%s",
		u.config.UploadPath, version, filename,
	)

}

func (u *Upload) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		responses.RespondWithJSON(w, http.StatusBadRequest, "POST only.")
		return
	}

	request := new(UploadRequest)
	err := parse.ParseRequest(r, request)
	if err != nil {
		u.config.Logger.Errorf("failed to unmarshall: %v", err)
		responses.RespondWithJSON(w, http.StatusBadRequest, "failed to parse body")
		return
	}

	if !u.config.CheckFile(request.Filename, request.FileVersion, request.Token) {
		u.config.Logger.Error("invalid token")
		responses.RespondWithError(w, http.StatusForbidden, "invalid token for file")
		return
	}

	myCRC := crc32.Checksum(request.ChunkBytes, u.crc32Table)
	if myCRC != request.Checksum {
		u.config.Logger.Errorf("CRC mismatch: %v =?= %v", myCRC, request.Checksum)
		responses.RespondWithError(w, http.StatusConflict, "checksum mismatch please resend")
		return
	}

	if request.TotalChunks > 0 {
		u.config.Logger.Infof("Assembling %s", request.Filename)
		go u.Concat(
			request.Filename,
			request.FileVersion,
			request.TotalChunks,
		)
		responses.RespondWithJSON(w, http.StatusAccepted, "started file collecting")
		return
	}

	chunkFilename := u.getFilePath(
		&request.Index,
		request.FileVersion,
		request.Filename,
	)

	if _, err := os.Stat(chunkFilename); err == nil {
		u.config.Logger.Errorf("Duplicate chunk filename: %s", chunkFilename)
		responses.RespondWithJSON(w, http.StatusOK, "duplicate chunk")
		return
	}

	fout, err := os.Create(chunkFilename)
	if err != nil {
		u.config.Logger.Errorf("failed to create file: %v", err)
		responses.Oops(w)
		return
	}
	defer fout.Close()

	n, err := fout.Write(request.ChunkBytes)
	if err != nil {
		u.config.Logger.Errorf("failed to write chunk %d: %v", request.Index, err)
		responses.Oops(w)
		return
	}
	if n != len(request.ChunkBytes) {
		u.config.Logger.Errorf("Wrote %d of %d bytes", n, len(request.ChunkBytes))
		responses.Oops(w)
		return
	}

	responses.RespondWithJSON(w, http.StatusCreated, "saved chunk")
}

func (u *Upload) Concat(filename string, version string, nChunks int) {
	filePath := u.getFilePath(nil, version, filename)
	fout, err := os.Create(filePath)
	if err != nil {
		u.config.Logger.Errorf("failed to open for writing: %v", err)
		return
	}
	defer fout.Close()

	var fin *os.File
	var chunkFilename string
	var n int
	for i := range nChunks {

		chunkFilename = u.getFilePath(&i, version, filename)

		fin, err = os.Open(chunkFilename)
		if err != nil {
			u.config.Logger.Errorf("failed to open %s for reading: %v", chunkFilename, err)
			return
		}

		buf, err := io.ReadAll(fin)
		if err != nil {
			u.config.Logger.Errorf("failed to read from chunk %s: %v", chunkFilename, err)
			return
		}

		n, err = fout.Write(buf)
		if err != nil {
			u.config.Logger.Errorf("failed to write to file %s: %v", filename, err)
			return
		}

		if n != len(buf) {
			u.config.Logger.Errorf("In concat wrote %d of %d bytes", n, len(buf))
			return
		}

		fin.Close()
		err = os.Remove(chunkFilename)
		if err != nil {
			u.config.Logger.Errorf("failed to remove chunk %s: %v", chunkFilename, err)
			return
		}
	}

	err = u.config.DropFile(filename, version)
	if err != nil {
		u.config.Logger.Errorf("failed to drop file: %v", err)
		return
	}
}
