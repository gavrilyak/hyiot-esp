/* MQTT Mutual Authentication Example

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/
#include "xsmc.h"
#include "xsHost.h"

#include "malloc.h"
#include "string.h"

#include "mqtt_client.h"

typedef struct xsMQTTRecord xsMQTTRecord;
typedef xsMQTTRecord *xsMQTT;

struct xsMQTTRecord {
  xsSlot			callback;
  xsMachine		*the;
  esp_mqtt_client_handle_t client;
  int event_id;
  int msg_id;
};

static xsMQTT gMQTT;

void provdImmediate(void *the, void *refcon, uint8_t *message, uint16_t messageLength) {
  xsMQTT nr = gMQTT;
  xsBeginHost(nr->the);
  xsCallFunction2(nr->callback, xsGlobal, xsInteger(nr->event_id), xsInteger(nr->msg_id));
  xsEndHost(nr->the);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
  esp_mqtt_event_handle_t event = event_data;
  //esp_mqtt_client_handle_t client = event->client;
  gMQTT->event_id = event_id;
  gMQTT->msg_id = event->msg_id;
  modMessagePostToMachine(gMQTT->the, NULL, 0, provdImmediate, NULL);
  return;
  // your_context_t *context = event->context;
  switch (event->event_id) {
    case MQTT_EVENT_CONNECTED:
      /* msg_id = esp_mqtt_client_subscribe(client, "/topic/qos0", 0); */
      /* msg_id = esp_mqtt_client_subscribe(client, "/topic/qos1", 1); */
      /* msg_id = esp_mqtt_client_unsubscribe(client, "/topic/qos1"); */
      // msg_id = esp_mqtt_client_publish(client, "/topic/qos0", "data", 0, 0, 0);
      break;
    case MQTT_EVENT_DISCONNECTED:
      break;

    case MQTT_EVENT_SUBSCRIBED:
      break;
    case MQTT_EVENT_UNSUBSCRIBED:
      break;
    case MQTT_EVENT_PUBLISHED:
      break;
    case MQTT_EVENT_DATA:
      //ESP_LOGI(TAG, "MQTT_EVENT_DATA");
      //printf("TOPIC=%.*s\r\n", event->topic_len, event->topic);
      //printf("DATA=%.*s\r\n", event->data_len, event->data);
      break;
    case MQTT_EVENT_ERROR:
      //ESP_LOGI(TAG, "MQTT_EVENT_ERROR");
      break;
    default:
      //ESP_LOGI(TAG, "Other event id:%d", event->event_id);
      break;
  }
}

//static char* alpn_protos[] = {"x-amzn-mqtt-ca", NULL};
static const char* alpn_protos[] = {"mqtt", NULL};
static const char* server_cert_pem = ""\
"-----BEGIN CERTIFICATE-----\n"\
"MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF\n"\
"ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6\n"\
"b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL\n"\
"MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv\n"\
"b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj\n"\
"ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM\n"\
"9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw\n"\
"IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6\n"\
"VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L\n"\
"93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm\n"\
"jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC\n"\
"AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA\n"\
"A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI\n"\
"U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs\n"\
"N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv\n"\
"o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU\n"\
"5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy\n"\
"rqXRfboQnoZsG4q5WTP468SQvvG5\n"\
"-----END CERTIFICATE-----\n"\
"";

void xs_MQTT(xsMachine *the) {
  xsMQTT nr;
  //char *service_name = xsToString(xsArg(0));
  nr = c_malloc(sizeof(xsMQTTRecord));
  if (!nr) xsUnknownError("out of memory");

  nr->the = the;
  nr->callback = xsArg(0);
  gMQTT = nr;
  xsRemember(nr->callback);

  const esp_mqtt_client_config_t mqtt_cfg = {
    .uri = "mqtts://a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com:443",
    .alpn_protos = alpn_protos,
    .cert_pem = server_cert_pem,
    .client_id = "smartgate1",
    .username = "smartgate1",
    .password = "Ochen'DlinniyParol'"
      //.client_cert_pem = (const char *)client_cert_pem_start,
      //.client_key_pem = (const char *)client_key_pem_start,
  };

  esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt_cfg);

  nr->client = client;

  esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, client);
  esp_mqtt_client_start(client);
}


//int esp_mqtt_client_publish(esp_mqtt_client_handle_t client, const char *topic, const char *data, int len, int qos, int retain);

void xs_MQTT_publish(xsMachine *the) {
  xsMQTT nr = gMQTT;
  char *topic = xsmcToString(xsArg(0));

  char *payload;
  s32_t payloadLen;
  int type = xsmcTypeOf(xsArg(1));
  uint8_t temp;

  if (xsStringType == type) {
    payload = xsmcToString(xsArg(1));
    payloadLen = c_strlen(payload);
  }
  else {
    payload = xsmcToArrayBuffer(xsArg(1));
    payloadLen = xsmcGetArrayBufferLength(xsArg(1));
  }

  int retain = 0;
  if(xsmcArgc > 2) {
    retain = xsmcToInteger(xsArg(2));
  }

  int msg_id = esp_mqtt_client_publish(nr->client, topic, payload, payloadLen, 0, retain);
  xsmcSetInteger(xsResult, msg_id);
  // msg_id = esp_mqtt_client_publish(client, "/topic/qos0", "data", 0, 0, 0);
}

void xs_MQTT_subscribe(xsMachine *the) {
  xsMQTT nr = gMQTT;
  char *topic = xsmcToString(xsArg(0));
  int msg_id = esp_mqtt_client_subscribe(nr->client, topic, 0);
  xsmcSetInteger(xsResult, msg_id);
}

void xs_MQTT_unsubscribe(xsMachine *the) {
  xsMQTT nr = gMQTT;
  char *topic = xsmcToString(xsArg(0));
  int msg_id = esp_mqtt_client_unsubscribe(nr->client, topic);
  xsmcSetInteger(xsResult, msg_id);
}

void xs_MQTT_close(xsMachine *the) {
    // msg_id = esp_mqtt_client_publish(client, "/topic/qos0", "data", 0, 0, 0);
}





