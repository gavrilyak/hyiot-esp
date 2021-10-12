PLATFORM?=esp32/nodemcu

all: host

host:  build deploy

build:
	mcconfig -d -m -p $(PLATFORM) -t build -f gray256

deploy: 
	mcconfig -d -m -p $(PLATFORM) -t deploy

xsbug: 
	mcconfig -d -m -p $(PLATFORM) -t xsbug

instrumented:
	mcconfig -i -m -p $(PLATFORM)  manifest_release.json  -f gray256

release:
	mcconfig -m -p $(PLATFORM)  manifest_release.json  -f gray256

sim:
	-killall mcsim
	-killall simulator
	mcconfig -d -m -p lin manifest_release.json  -f gray256

clean:
	mcconfig -d -m -p $(PLATFORM) -t clean

cleanall:
	mcconfig -d -m -p $(PLATFORM) -t clean
	mcconfig -i -m -p $(PLATFORM) -t clean
	mcconfig  -m -p $(PLATFORM) -t clean

.PHONY: build deploy host all sim clean

