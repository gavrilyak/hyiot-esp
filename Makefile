
SUBDIRS := src/host src/mod
all: $(SUBDIRS)

sim: $(SUBDIRS)

mod:
	$(MAKE) -C src/mod

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)


.PHONY: all $(SUBDIRS)
