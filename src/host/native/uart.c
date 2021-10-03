#include "esp_err.h"
#include "xsmc.h"
#include "xsHost.h"
#include "driver/uart.h"

void xs_uart_set_data_bits(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue data_bit = xsmcToInteger(xsArg(1));
  esp_err_t err = uart_set_word_length(uart_num, data_bit);
  if(err != ESP_OK) {
    xsUnknownError("Failed to set data bits");
  }
}

void xs_uart_set_stop_bits(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue data_bit = xsmcToInteger(xsArg(1));
  esp_err_t err = uart_set_stop_bits(uart_num, data_bit);
  if(err != ESP_OK) {
    xsUnknownError("Failed to set stop bits");
  }
}

void xs_uart_set_parity(xsMachine *the) {
  xsIntegerValue uart_num = xsmcToInteger(xsArg(0));
  xsIntegerValue parity = xsmcToInteger(xsArg(1));
  esp_err_t err = uart_set_parity(uart_num, parity);
  if(err != ESP_OK) {
    xsUnknownError("Failed to set parity");
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

