#include "xsmc.h"
#include "xsHost.h"
#include <esp_wifi.h>
#include "esp_system.h"

void xs_getmac(xsMachine *the)
{
  xsmcSetArrayBuffer(xsResult, NULL, 6);
  //esp_wifi_get_mac(xsmcToInteger(xsArgc) > 0? WIFI_IF_AP : WIFI_IF_STA, xsmcToArrayBuffer(xsResult));
  esp_efuse_mac_get_default(xsmcToArrayBuffer(xsResult));
}

void xs_do_restart(xsMachine *the)
{
	esp_restart();
}

void xs_set_wifi_ps(xsMachine *the) {
   xsIntegerValue mode = xsmcToInteger(xsArg(0));
   if (esp_wifi_set_ps(mode) != ESP_OK) {
	xsUnknownError("esp_wifi_set_ps failed");
   }
}
