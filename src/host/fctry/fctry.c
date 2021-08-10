/*
 * Copyright (c) 2016-2020  Moddable Tech, Inc.
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

#include "xsmc.h"
#include "xsHost.h"

#include "nvs_flash/include/nvs_flash.h"

//#define FCTRY_PART_NAME "fctry"
#define FCTRY_PART_NAME "fctry"
//NVS_DEFAULT_PART_NAME
int8_t initialized = 0;

void xs_fctry_get(xsMachine *the)
{
	esp_err_t err;
	nvs_handle handle;
	uint8_t b;
	int32_t integer;
	char *str, key[64];

	xsmcToStringBuffer(xsArg(1), key, sizeof(key));

	if(!initialized) {
		nvs_flash_init_partition(FCTRY_PART_NAME);
		initialized = 1;
	}

	err = nvs_open_from_partition(FCTRY_PART_NAME, xsmcToString(xsArg(0)), NVS_READONLY, &handle);
	if (ESP_OK != err) {
	  char s[256];
	  sprintf(s, "fctry error get %d\n", err);
		xsTrace(s);
		return; 
	}
	// most likely that domain doesn't exist yet

	if (ESP_OK == (err = nvs_get_u8(handle, key, &b)))
		xsmcSetBoolean(xsResult, b);
	else if (ESP_OK == (err = nvs_get_i32(handle, key, &integer)))
		xsmcSetInteger(xsResult, integer);
	else if (ESP_OK == (err = nvs_get_str(handle, key, NULL, &integer))) {
		xsResult = xsStringBuffer(NULL, integer);
		err = nvs_get_str(handle, key, xsmcToString(xsResult), &integer);
	}
	else if (ESP_OK == (err = nvs_get_blob(handle, key, NULL, &integer))) {
		xsmcSetArrayBuffer(xsResult, NULL, integer);
		err = nvs_get_blob(handle, key, xsmcToArrayBuffer(xsResult), &integer);
	}
	else
		xsmcSetUndefined(xsResult);	// not an error if not found, just undefined

	if (err == ESP_ERR_NVS_NOT_FOUND)
		err = ESP_OK;

bail:
	nvs_close(handle);

	if (ESP_OK != err)
		xsUnknownError("nvs get fail");
}



void xs_fctry_keys(xsMachine *the)
{
	if(!initialized) {
		nvs_flash_init_partition(FCTRY_PART_NAME);
		initialized = 1;
	}
	int i = 0;
	nvs_iterator_t it;
	
	xsmcSetNewArray(xsResult, 0);
	
	it = nvs_entry_find(FCTRY_PART_NAME, xsmcToString(xsArg(0)), NVS_TYPE_ANY);
	if (!it) {
		return;
	}

	xsmcVars(1);

	while (it) {
        nvs_entry_info_t info;

        nvs_entry_info(it, &info);

		xsmcSetString(xsVar(0), info.key);
		xsmcSetIndex(xsResult, i++, xsVar(0));

        it = nvs_entry_next(it);
	}
}

void xs_fctry_reset(xsMachine *the)
{
	nvs_flash_deinit();
	nvs_flash_erase();
	nvs_flash_init();
	xsmcSetUndefined(xsResult);	// not an error if not found, just undefined
} 
