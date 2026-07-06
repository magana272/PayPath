FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o paypath ./cmd/api/

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /app/paypath .
# seed CSVs are read at runtime (relative "seed/" path) on first boot
COPY --from=build /app/seed ./seed
EXPOSE 8000
CMD ["./paypath"]
