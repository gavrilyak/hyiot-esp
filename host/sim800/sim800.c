#include "xs.h" //most importatn

void xs_sim800_constructor(xsMachine* the) {
    if (ppposInit() == 0){
        xsUnknownError("can't connect");
    }
}

void xs_sim800_destructor(void *data) {
    // close the connection, free up memory and resources
}