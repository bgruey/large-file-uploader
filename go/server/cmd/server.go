package main

import (
	"lfu-go/server/app"
)

func main() {
	server := app.NewServer()
	server.Run()

}
