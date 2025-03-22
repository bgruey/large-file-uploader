FROM golang:1.24

WORKDIR /server

RUN mkdir /uploads
RUN mkdir /static

COPY . .

RUN go mod tidy
RUN go build -o /server.x ./server/cmd/server.go

CMD ["/server.x"]