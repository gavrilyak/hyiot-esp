export function setDataBits(uartnum, databits) @ "xs_uart_set_data_bits";
export function setParity(uartnum, databits) @ "xs_uart_set_parity";
export function setStopBits(uartnum, stopBits) @ "xs_uart_set_stop_bits";
export function setRxFullThreshold(uartnum, threshold) @ "xs_uart_set_rx_full_threshold";
export function setTxEmptyThreshold(uartnum, threshold) @ "xs_uart_set_tx_empty_threshold";
export function installDriver(uartnum, bufSize) @ "xs_uart_driver_install";
export function uninstallDriver(uartnum) @ "xs_uart_driver_delete";


export const DATA_5_BITS   = 0x0;    /*!< word length: 5bits*/
export const DATA_6_BITS   = 0x1;    /*!< word length: 6bits*/
export const DATA_7_BITS   = 0x2;    /*!< word length: 7bits*/
export const DATA_8_BITS   = 0x3;    /*!< word length: 8bits*/

export const STOP_BITS_1   = 0x1;  /*!< stop bit: 1bit*/
export const STOP_BITS_1_5 = 0x2;  /*!< stop bit: 1.5bits*/
export const STOP_BITS_2   = 0x3;  /*!< stop bit: 2bits*/

export const PARITY_DISABLE  = 0x0;  /*!< Disable UART parity*/
export const PARITY_EVEN     = 0x2;  /*!< Enable UART even parity*/
export const PARITY_ODD      = 0x3   /*!< Enable UART odd parity*/
