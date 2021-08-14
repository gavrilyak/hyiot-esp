PLATFORM?=esp32
all: mod

mod:
	mcrun -d -m -p $(PLATFORM)

sim:
	mcrun -d -m -p lin

xsbug:
	mcconfig -d -m -p $(PLATFORM) -t xsbug

clean:
	mcconfig -d -m -p $(PLATFORM) -t clean


