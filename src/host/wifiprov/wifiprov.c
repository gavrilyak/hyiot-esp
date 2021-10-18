/*
 * Copyright (c) 2016-2017  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK Runtime.
 * 
 *   The Moddable SDK Runtime is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 * 
 *   The Moddable SDK Runtime is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 * 
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with the Moddable SDK Runtime.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

#include "xs.h"
#include "xsHost.h"

#include "malloc.h"
#include "string.h"

#include "lwip/tcp.h"
#include "lwip/dns.h"
#include <esp_log.h>
#include <esp_wifi.h>
#include <esp_event.h>

#include <wifi_provisioning/manager.h>
//#include <wifi_provisioning/scheme_softap.h>
#include <wifi_provisioning/scheme_ble.h>
//#define CONFIG_EXAMPLE_PROV_TRANSPORT_SOFTAP


typedef struct xsWiFiProvRecord xsWiFiProvRecord;
typedef xsWiFiProvRecord *xsWiFiProv;

struct xsWiFiProvRecord {
	xsSlot			callback;
	xsMachine		*the;
	ip_addr_t		ipaddr;
	int                     event_id;
        wifi_sta_config_t       *wifi_sta_cfg;
        wifi_prov_sta_fail_reason_t reason;
};

static void provdImmediate(void *the, void *refcon, uint8_t *message, uint16_t messageLength);

static xsWiFiProv gProv;

static void event_handler(void* arg, esp_event_base_t event_base,
                          int event_id, void* event_data)
{
    if(gProv == NULL) return ;

    if (event_base == WIFI_PROV_EVENT) {
        gProv->event_id = event_id;
	gProv->reason = 0;
        switch (event_id) {
            case WIFI_PROV_CRED_RECV: 
   		gProv->wifi_sta_cfg = (wifi_sta_config_t *)event_data;
                break;
            case WIFI_PROV_CRED_FAIL: {
                wifi_prov_sta_fail_reason_t *reason = (wifi_prov_sta_fail_reason_t *)event_data;
		gProv->reason = *reason;
                break;
            }
            default:
                break;
        }
	modMessagePostToMachine(gProv->the, NULL, 0, provdImmediate, NULL);
    }
}

void xs_wifi_prov(xsMachine *the)
{
  if (gProv != NULL) {
    xsUnknownError("This function is singleton");
    return;
  }

  xsWiFiProv nr;
  char *service_name = xsToString(xsArg(0));
  nr = c_malloc(sizeof(xsWiFiProvRecord));

  if (!nr) xsUnknownError("out of memory");

  nr->the = the;
  nr->callback = xsArg(1);
  nr->event_id=-1;
  nr->wifi_sta_cfg=NULL;
  gProv = nr;

  esp_err_t err;
  /*
  wifi_prov_mgr_config_t config_softap = {
    .scheme = wifi_prov_scheme_softap,
    .scheme_event_handler = WIFI_PROV_EVENT_HANDLER_NONE
  };
  */
  wifi_prov_mgr_config_t config = {
    .scheme = wifi_prov_scheme_ble,
    .scheme_event_handler = WIFI_PROV_SCHEME_BLE_EVENT_HANDLER_FREE_BT
  };



  err= esp_event_handler_register(WIFI_PROV_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL);

  if (err) goto bail;
  err = wifi_prov_mgr_init(config);
  if (err) goto bail;

  uint8_t custom_service_uuid[] = {
    /* LSB <---------------------------------------
     * ---------------------------------------> MSB */
    0xb4, 0xdf, 0x5a, 0x1c, 0x3f, 0x6b, 0xf4, 0xbf,
    0xea, 0x4a, 0x82, 0x03, 0x04, 0x90, 0x1a, 0x02,
  };
  wifi_prov_scheme_ble_set_service_uuid(custom_service_uuid);

  err = wifi_prov_mgr_start_provisioning(WIFI_PROV_SECURITY_1, "abcd1234", service_name, NULL);
  if (err) goto bail;

  xsRemember(nr->callback);
  return;

bail:
  wifi_prov_mgr_deinit();
  esp_event_handler_unregister(WIFI_PROV_EVENT, ESP_EVENT_ANY_ID, &event_handler);
  c_free(gProv);
  gProv = NULL;
  xsUnknownError("wifi prov mgr error %d", err);
}

void provdImmediate(void *the, void *refcon, uint8_t *message, uint16_t messageLength)
{
	xsWiFiProv nr = gProv;

	xsBeginHost(nr->the);
	if(nr->event_id == WIFI_PROV_CRED_RECV) {
	  xsCallFunction3(nr->callback, xsGlobal, xsInteger(nr->event_id), xsString(nr->wifi_sta_cfg->ssid), xsString(nr->wifi_sta_cfg->password));
	} else {
	  xsCallFunction2(nr->callback, xsGlobal, xsInteger(nr->event_id), xsInteger(nr->reason));
	}
	xsEndHost(nr->the);

	if(gProv->event_id == WIFI_PROV_END) {
	  esp_event_handler_unregister(WIFI_PROV_EVENT, ESP_EVENT_ANY_ID, &event_handler);
	  wifi_prov_mgr_deinit();
	  xsForget(nr->callback);
	  c_free(gProv);
	  gProv = NULL;
	}
}
