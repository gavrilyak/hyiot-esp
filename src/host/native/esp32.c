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
