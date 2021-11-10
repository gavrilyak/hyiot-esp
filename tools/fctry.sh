ADDRESS=$(grep fctry src/host/esp_config/partitions.csv | cut -d ',' -f4)

esptool.py write_flash $ADDRESS $1

