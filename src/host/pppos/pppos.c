#include "xs.h"
#include "xsmc.h"
#include "xsHost.h"


#include "netif/ppp/ppp.h"
#include "netif/ppp/pppos.h"
#include "lwip/err.h"
#include "lwip/sockets.h"
#include "lwip/sys.h"
#include "lwip/netdb.h"
#include "lwip/dns.h"
#include "netif/ppp/pppapi.h"
#include "esp_log.h"
#include "driver/uart.h"
#include "hal/uart_hal.h"
#include "hal/uart_types.h"
//#include "soc/uart_caps.h"
#include "soc/uart_struct.h"
//#include "mc.defines.h"


#define UART_NUM 2
#define UART_REG &UART2
#define BUF_SIZE 256

static char *TAG = "pppos";

typedef struct xsModemRecord {
  xsSlot       callback;
  xsMachine    *the;
  ppp_pcb      *pcb;
  struct netif pppif;
  int          ppp_status_code;
  volatile     TaskHandle_t task;
} xsModemRec;

static xsModemRec* gModem;

//const mp_obj_type_t ppp_if_type;

void callUserCallback(void *the, void *refcon, uint8_t *message, uint16_t messageLength)
{
  xsBeginHost(gModem->the);
  //printf("userCallback %d\n", gModem->ppp_status_code);
  xsCallFunction1(gModem->callback, xsGlobal, xsNumber(gModem->ppp_status_code));
  xsEndHost(nr->the);
}

static void ppp_status_cb(ppp_pcb *pcb, int err_code, void *ctx) {
  //printf("ppp_status_cb %d\n", err_code);
  if(gModem == NULL || gModem->pcb == NULL) return;
  gModem->ppp_status_code = err_code;
  modMessagePostToMachine(gModem->the, NULL, 0, callUserCallback, NULL);
  //struct netif *pppif = ppp_netif(self->pcb);
  //ESP_LOGI(TAG, "status_cb: %d", err_code);
  /*
  switch (err_code) {
    case PPPERR_NONE:
      self->connected = (pppif->ip_addr.u_addr.ip4.addr != 0);
      break;
    case PPPERR_USER:
      self->clean_close = true;
      break;
    case PPPERR_CONNECT:
      self->connected = false;
      break;
    default:
      break;
  }
  */
}



static u32_t ppp_output_callback(ppp_pcb *pcb, u8_t *data, u32_t len, void *ctx) {
  printf("ppp_output_callback %d\n", len);
  return uart_tx_chars(UART_NUM, (const char *)data, len);
}

static void pppos_client_task(void *self_in) {
  ppp_pcb* pcb = gModem->pcb;
  uint8_t buf[BUF_SIZE];
  for(;;){
    int len = uart_read_bytes(UART_NUM, (uint8_t *)buf, sizeof(buf), 50 / portTICK_RATE_MS);
    if (len > 0) {
      printf("LEN IS %d\n", len);
      pppos_input_tcpip(pcb, (u8_t *)buf, len);
    }
  }
}

static u32_t ppp_output_callback_ll(ppp_pcb *pcb, u8_t *data, u32_t len, void *ctx) {
  int count = uart_ll_get_txfifo_len(UART_REG);
  uart_ll_write_txfifo(UART_REG, data, count);
  return count;
}

void xs_modem_write(xsMachine *the) {
  if (gModem == NULL) {
    xsUnknownError("PPP stopped");
    return;
  }
  unsigned char* buffer = xsmcToArrayBuffer(xsArg(0));
  int requested = xsmcGetArrayBufferLength(xsArg(0));
  pppos_input_tcpip(gModem->pcb, buffer, requested);
}


void xs_modem_stop(xsMachine *the){
  if (gModem == NULL) {
    return;
  }
  ppp_pcb      *pcb = gModem->pcb;
  gModem->pcb = NULL;
  vTaskDelete(gModem->task);
  pppapi_close(pcb, 1);
  pppapi_free(pcb);
  xsForget(gModem->callback);
  uart_driver_delete(UART_NUM);
  c_free(gModem);
  gModem = NULL;
}


void xs_modem_start(xsMachine *the) {
  if (gModem != NULL) {
    xsEvalError("Modem already started");
    return;
  }

  gModem = c_malloc(sizeof(xsModemRec));
  if (!gModem){
    xsUnknownError("out of memory");
    return;
  }
  gModem->callback = xsArg(0);
  esp_err_t err;
  err =  uart_driver_install(UART_NUM, BUF_SIZE, BUF_SIZE, 0, NULL, 0);
  if (err != ESP_OK) goto bail1;

  gModem->the = the;

  gModem->pcb = pppapi_pppos_create(&gModem->pppif, ppp_output_callback, ppp_status_cb, gModem);

  if (gModem->pcb == NULL) goto bail1;
  pppapi_set_default(gModem->pcb);
  ppp_set_usepeerdns(gModem->pcb, 1);
  if ((err = xTaskCreate(pppos_client_task, "ppp", BUF_SIZE*4, gModem, 1, (TaskHandle_t *)&gModem->task)) != pdPASS) goto bail2;
  if ((err = pppapi_connect(gModem->pcb, 0)) != ESP_OK) goto bail3;

  xsRemember(gModem->callback);
  return;

bail3:
  pppapi_close(gModem->pcb, 1);
  xTaskNotifyGive(gModem->task);
bail2:
  pppapi_free(gModem->pcb);
bail1: 
  c_free(gModem);
  gModem = NULL;
  xsUnknownError("Error: %d", err);
}
