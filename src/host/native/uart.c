#include "esp_err.h"
#include "xsmc.h"
#include "xsHost.h"
#include "driver/uart.h"
#include "hal/uart_hal.h"
#include "hal/uart_types.h"
//#include "soc/uart_caps.h"
#include "soc/uart_struct.h"

void xs_uart_set_data_bits(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue data_bit = xsmcToInteger(xsArg(1));
  esp_err_t err = uart_set_word_length(uart_num, data_bit);
  if(err != ESP_OK) {
    xsUnknownError("Failed to set data bits: %d", err);
  }
}

void xs_uart_set_stop_bits(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue data_bit = xsmcToInteger(xsArg(1));
  esp_err_t err = uart_set_stop_bits(uart_num, data_bit);
  if(err != ESP_OK) {
    xsUnknownError("Failed to set stop bits: %d", err);
  }
}

void xs_uart_set_parity(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue parity = xsmcToInteger(xsArg(1));
  esp_err_t err = uart_set_parity(uart_num, parity);
  if(err != ESP_OK) {
    xsUnknownError("Failed to set parity: %d", err);
  }
}

void xs_uart_set_rx_full_threshold(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue threshold = xsmcToInteger(xsArg(1));
  uart_dev_t *uart_reg = uart_num == 2 ? &UART2 : uart_num == 1 ? &UART1 : &UART0;
  uart_ll_set_rxfifo_full_thr(uart_reg, threshold);
}

void xs_uart_set_tx_empty_threshold(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue threshold = xsmcToInteger(xsArg(1));
  uart_dev_t *uart_reg = uart_num == 2 ? &UART2 : uart_num == 1 ? &UART1 : &UART0;
  uart_ll_set_txfifo_empty_thr(uart_reg, threshold);
}


void xs_uart_driver_install(xsMachine* the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue buf_size = xsmcToInteger(xsArg(1));
  esp_err_t err =  uart_driver_install(uart_num, buf_size, buf_size, 0, NULL, 0);
  if (err != ESP_OK) {
    xsUnknownError("Failed to install uart driver: %d", err);
  }
}

void xs_uart_driver_delete(xsMachine* the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  esp_err_t err =  uart_driver_delete(uart_num);
  if (err != ESP_OK) {
    xsUnknownError("Failed to delete uart driver: %d", err);
  }
}

/*
    uart_ll_get_rxfifo_len

    size_t available;
    uart_get_buffered_data_len(uart->num, &available);
    return available;

    uint32_t available =  uart_ll_get_txfifo_len(UART_LL_GET_HW(uart->num));  
    return available;
*/

