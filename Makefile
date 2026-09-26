.PHONY: dev build check test e2e demo demo-video demo-explore demo-palette demo-waypoint demo-compare demo-journey demo-controller

dev:
	npm run dev

build:
	npm run build

check:
	npm run check

test:
	npm run test

e2e:
	npm run test:e2e

demo:
	npm run demo

demo-video:
	npm run demo:video

demo-explore:
	npm run demo:explore

demo-palette:
	npm run demo:palette

demo-waypoint:
	npm run demo:waypoint

demo-compare:
	npm run demo:compare

demo-journey:
	npm run demo:journey

demo-controller:
	npm run demo:controller
