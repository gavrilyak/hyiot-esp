#include "xsmc.h"
#include "xsHost.h"
#include <time.h>
void xs_setenv(xsMachine* the)
{
  xsStringValue name = xsmcToString(xsArg(0));
  xsStringValue value = xsmcToString(xsArg(1));
  xsIntegerValue c = xsmcToInteger(xsArgc);
  xsIntegerValue overwrite = 1;
  if (c > 2)
    overwrite = xsmcToInteger(xsArg(2));
  setenv(name, value, overwrite);
}

void xs_getenv(xsMachine* the)
{
  xsStringValue name = xsmcToString(xsArg(0));
  char *value = getenv(name);
  if(value) {
    xsmcSetString(xsResult, value);
  }
}

void xs_tzset(xsMachine* the)
{
  tzset();
}

void xs_localtime(xsMachine* the) {
  static char strftime_buf[64];
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);
  strftime(strftime_buf, sizeof(strftime_buf), "%c", &timeinfo);
  xsmcSetString(xsResult, strftime_buf);
}

