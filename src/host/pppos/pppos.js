export function start(callback) @ "xs_modem_start"; 
export function stop() @ "xs_modem_stop"; 
export function write(bytes) @ "xs_modem_write"; 
export function bytesRead() @ "xs_modem_bytes_read"; 
export function bytesWritten() @ "xs_modem_bytes_written"; 


export const PPPERR_NONE       =  0 ; /* No error. */
export const PPPERR_PARAM      =  1 ; /* Invalid parameter. */
export const PPPERR_OPEN       =  2 ; /* Unable to open PPP session. */
export const PPPERR_DEVICE     =  3 ; /* Invalid I/O device for PPP. */
export const PPPERR_ALLOC      =  4 ; /* Unable to allocate resources. */
export const PPPERR_USER       =  5 ; /* User interrupt. */
export const PPPERR_CONNECT    =  6 ; /* Connection lost. */
export const PPPERR_AUTHFAIL   =  7 ; /* Failed authentication challenge. */
export const PPPERR_PROTOCOL   =  8 ; /* Failed to meet protocol. */
export const PPPERR_PEERDEAD   =  9 ; /* Connection timeout */
export const PPPERR_IDLETIMEOUT=  10; /* Idle Timeout */
export const PPPERR_CONNECTTIME=  11; /* Max connect time reached */
export const PPPERR_LOOPBACK   =  12; /* Loopback detected */


