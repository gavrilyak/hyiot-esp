#!/bin/bash

for i in "$@"; do 
  echo $(basename $i); 
  stat -c %s $i;
  cat $i; 
  echo ; 
done
