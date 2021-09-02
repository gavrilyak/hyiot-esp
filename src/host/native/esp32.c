#include "xsmc.h"
#include "xsHost.h"
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
