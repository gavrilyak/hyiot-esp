
SUBDIRS := host mod
all: $(SUBDIRS)

sim: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)


.PHONY: all $(SUBDIRS)
