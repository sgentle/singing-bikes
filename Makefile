.PHONY: build watch

build:
	node_modules/.bin/buble bikes.js > bikes.build.js

watch:
	node_modules/.bin/nodemon -w bikes.js -x 'make build || exit 1'
