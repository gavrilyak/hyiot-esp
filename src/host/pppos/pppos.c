#include "xs.h"
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
#include "mc.defines.h"


#define PPP_CLOSE_TIMEOUT_MS (4000)
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
  xsCallFunction1(gModem->callback, xsGlobal, xsNumber(gModem->ppp_status_code));
  xsEndHost(nr->the);
}

static void ppp_status_cb(ppp_pcb *pcb, int err_code, void *ctx) {
  if(gModem == NULL) return;
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
  return uart_tx_chars(MODDEF_SERIAL_INTERFACE_UART, (const char *)data, len);
}

static void pppos_client_task(void *self_in) {
  xsModemRec *self = (xsModemRec *)self_in;
  uint8_t buf[MODDEF_SERIAL_RXBUFFERSIZE];
  while (ulTaskNotifyTake(pdTRUE, 0) == 0) {
    int err;
    int len = uart_read_bytes(MODDEF_SERIAL_INTERFACE_UART, (uint8_t *)buf, sizeof(buf), 10 / portTICK_RATE_MS);
    if (len > 0) {
      pppos_input_tcpip(self->pcb, (u8_t *)buf, len);
    }
  }

  self->task = NULL;
  vTaskDelete(NULL);
}

void setup_uart() {
    int uart_num = MODDEF_SERIAL_INTERFACE_UART;
    uart_config_t uart_config = {
      .baud_rate = MODDEF_SERIAL_BAUD,
      .data_bits = 8,
      .parity = UART_PARITY_DISABLE,
      .stop_bits = UART_STOP_BITS_1,
      .flow_ctrl = UART_HW_FLOWCTRL_DISABLE
    };
    uart_param_config(uart_num, &uart_config) ;
    uart_set_pin(uart_num, MODDEF_SERIAL_TX_PIN, MODDEF_SERIAL_RX_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    uart_driver_install(uart_num, MODDEF_SERIAL_TXBUFFERSIZE, MODDEF_SERIAL_RXBUFFERSIZE, 0, NULL, 0);   
}


void xs_modem_stop(xsMachine *the){
  if (gModem == NULL) return;
  pppapi_close(gModem->pcb, 0);
  //uint32_t t0 = mp_hal_ticks_ms();
  //while (!self->clean_close && mp_hal_ticks_ms() - t0 < PPP_CLOSE_TIMEOUT_MS) {
  //  mp_hal_delay_ms(10);
  //}

  // Shutdown task
  xTaskNotifyGive(gModem->task);
  /* t0 = mp_hal_ticks_ms(); */
  /* while (self->client_task_handle != NULL && mp_hal_ticks_ms() - t0 < PPP_CLOSE_TIMEOUT_MS) { */
  /*   mp_hal_delay_ms(10); */
  /* } */

  // Release PPP
  pppapi_free(gModem->pcb);
  gModem->pcb = NULL;
  xsForget(gModem->callback);
  uart_driver_delete(MODDEF_SERIAL_INTERFACE_UART);
  c_free(gModem);
  gModem = NULL;
}


void xs_modem_start(xsMachine *the) {
  if (gModem != NULL) {
    xsEvalError("Modem already started");
    return;
  }

  gModem = c_malloc(sizeof(xsModemRec));
  if (!gModem)
    xsUnknownError("out of memory");

  gModem->the = the;

  gModem->pcb = pppapi_pppos_create(&gModem->pppif, ppp_output_callback, ppp_status_cb, gModem);

  if (gModem->pcb == NULL) goto bail1;
  esp_err_t err;
  ppp_set_usepeerdns(gModem->pcb, true);
  if ((err = xTaskCreate(pppos_client_task, "ppp", 2048, gModem, 1, (TaskHandle_t *)&gModem->task)) != pdPASS) goto bail2;
  if ((err = pppapi_connect(gModem->pcb, 0)) != ESP_OK) goto bail3;

  gModem->callback = xsArg(0);
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
