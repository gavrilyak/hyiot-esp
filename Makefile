
SUBDIRS := src/host src/mod
all: $(SUBDIRS)

sim: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)


.PHONY: all $(SUBDIRS)
