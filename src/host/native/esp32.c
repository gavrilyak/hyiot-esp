#include "xsmc.h"
#include "xsHost.h"
#include "buildinfo.h"


void xs_getbuildstring(xsMachine *the)
{
  int len;
  char *str;

  len = c_strlen(_BuildInfo.date) + c_strlen(_BuildInfo.time)
    + c_strlen(_BuildInfo.src_version) + c_strlen(_BuildInfo.env_version);
  len += 4;
  str = c_malloc(len);
  c_strcpy(str, _BuildInfo.date);
  c_strcat(str, " ");
  c_strcat(str, _BuildInfo.time);
  c_strcat(str, " ");
  c_strcat(str, _BuildInfo.src_version);
  c_strcat(str, " ");
  c_strcat(str, _BuildInfo.env_version);
  xsmcSetString(xsResult, str);
}

#include <esp_wifi.h>
void xs_getmac(xsMachine *the)
{
  xsmcSetArrayBuffer(xsResult, NULL, 6);
  esp_wifi_get_mac(xsmcToInteger(xsArgc) > 0? WIFI_IF_AP : WIFI_IF_STA, xsmcToArrayBuffer(xsResult));
}

void xs_do_restart(xsMachine *the)
{
	esp_restart();
}

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
