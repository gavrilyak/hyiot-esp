PLATFORM?=esp32

all: host

host:  build deploy

build:
	mcconfig -d -m -p $(PLATFORM) -t build

deploy: 
	mcconfig -d -m -p $(PLATFORM) -t deploy

instrumented:
	mcconfig -i -m -p esp32  manifest_release.json 

release:
	mcconfig -m -p esp32  manifest_release.json 

sim:
	-killall simulator
	mcconfig -d -m -p lin

clean:
	mcconfig -d -m -p $(PLATFORM) -t clean



.PHONY: build deploy host all sim clean

