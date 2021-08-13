PLATFORM?=esp32
build:
	mcconfig -d -m -p $(PLATFORM) -t build
host:
	mcconfig -d -m -p $(PLATFORM)

all: host


sim:
	-killall simulator
	mcconfig -d -m -p lin

clean:
	mcconfig -d -m -p $(PLATFORM) -t clean

