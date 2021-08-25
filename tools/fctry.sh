ADDRESS=$(grep fctry src/host/sdkconfig/partitions.csv | cut -d ',' -f4)

esptool.py write_flash $ADDRESS fctry.arr

