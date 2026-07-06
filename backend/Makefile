.PHONY: build run run-dev test check fmt vet tidy clean kill reseed reset

build:
	go build -o paypath ./cmd/api/

run: build
	./paypath

run-dev: build
	ENV=development ./paypath

# Run all tests. The Mongo-backed repository tests under ./tests skip
# automatically unless MONGODB_URI is set.
test:
	go test -v -count=1 ./tests/

# Format, vet, and test in one shot.
check: fmt vet test

fmt:
	gofmt -w cmd internal pkg tests

vet:
	go vet ./...

tidy:
	go mod tidy

clean:
	rm -f paypath

kill:
	lsof -ti :8000 | xargs kill 2>/dev/null || true

reseed:
	go run ./cmd/reseed

reset: kill clean
