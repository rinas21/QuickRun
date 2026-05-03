FROM golang:1.22-alpine

WORKDIR /app

# Install necessary build tools
RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the Go application
RUN go build -o main .

EXPOSE 8080

CMD ["./main"]
