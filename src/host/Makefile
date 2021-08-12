PLATFORM?=esp32/moddable_two
all:
	mcconfig -d -m -p $(PLATFORM)

sim:
	-killall simulator
	mcconfig -d -m -p lin

clean:
	mcconfig -d -m -p $(PLATFORM) -t clean

