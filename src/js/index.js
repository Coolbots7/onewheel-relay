const noble = require('@abandonware/noble');
var md5 = require('js-md5');
var express = require("express");

var app = express();
const PORT = 3000;

const PERIPHERAL_ADDRESS = "4c:24:98:70:98:91".toLowerCase();
console.log("address:", PERIPHERAL_ADDRESS);

const OW_SERVICE_UUID = 'e659f300ea9811e3ac100800200c9a66';

const OW_CHARACTERISTIC_BATTERY_REMAINING_UUID = 'e659f303ea9811e3ac100800200c9a66';

const OW_CHARACTERISTIC_FIRMWARE_VERSION_UUID = 'e659f311ea9811e3ac100800200c9a66';

const OW_CHARACTERISTIC_LIFETIME_ODOMETER_UUID = 'e659f319ea9811e3ac100800200c9a66';

const OW_CHARACTERISTIC_UART_SERIAL_READ_UUID = 'e659f3feea9811e3ac100800200c9a66';
const OW_CHARACTERISTIC_UART_SERIAL_WRITE_UUID = 'e659f3ffea9811e3ac100800200c9a66';

var serialReadBuffer = Buffer.alloc(20);
var serialReadBufferSize = 0;
var sendKey = true;

var batteryRemaining = 0;
var lifetimeOdometer = 0;

function unsignedInt(buffer) {
  if (buffer === undefined || buffer.length <= 0) {
    return 0
  }
  else if (buffer.length === 1) {
    return buffer[0];
  }
  else {
    return (buffer[0] << 8) + buffer[1];
  }
}


noble.on('stateChange', function (state) {
  console.log("state changed:", state);
  if (state === 'poweredOn') {
    console.log("starting scan");
    noble.startScanning([OW_SERVICE_UUID], false);
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function (peripheral) {
  noble.stopScanning();

  peripheral.connect();

  console.log("Peripheral discovered: ", peripheral.advertisement.localName);

  peripheral.on('disconnect', () => {
    console.log("disconnected from peripheral: ", peripheral.advertisement.localName);
  })

  peripheral.on('rssiUpdate', (rssi) => {
    console.log("RSSI:", rssi);
  });

  peripheral.once('connect', (error) => {
    if (error) {
      console.log("connect error: ", error);
      return;
    }

    console.log("connected");

    peripheral.discoverSomeServicesAndCharacteristics([OW_SERVICE_UUID], [], (error, services, characteristics) => {
      if (error) {
        console.log("error getting services and characteristics:", error);
        return;
      }

      console.log("services and characteristics discovered");

      //get firmware version characteristic value       
      const firmwareCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_FIRMWARE_VERSION_UUID);
      firmwareCharacteristic.read((error, firmwareVersion) => {

        //TODO check firmware eversion >= gemini

        //enable notifications on serial read characteristic
        const serialReadCharacteristic = characteristics.find((characteristic) => characteristic.uuid === OW_CHARACTERISTIC_UART_SERIAL_READ_UUID);

        serialReadCharacteristic.subscribe((error) => {
          if (error) {
            console.log("serial read subscribe error: ", error);
          }

          //write firmware version characteristic
          firmwareCharacteristic.write(firmwareVersion, false, (error) => {
            if (error) {
              console.log('firmware characteristic write error: ', error);
            }
          });

        });

        serialReadCharacteristic.on('data', (data, isNotification) => {

          //get serial read bytes
          serialReadBuffer.fill(data, serialReadBufferSize);
          serialReadBufferSize += data.length;
          if (serialReadBufferSize >= 20 && sendKey) {

            //create authentication hash
            const hashSerialBytes = serialReadBuffer.slice(3, 19);
            const hashConst = Buffer.from([0xD9, 0x25, 0x5F, 0x0F, 0x23, 0x35, 0x4E, 0x19, 0xBA, 0x73, 0x9C, 0xCD, 0xC4, 0xA9, 0x17, 0x65]);
            const hashInput = Buffer.concat([hashSerialBytes, hashConst]);
            const hashOutput = md5.digest(hashInput);
            const outputBuffer = Buffer.concat([Buffer.from([0x43, 0x52, 0x58]), Buffer.from(hashOutput)]);

            //create authentication check byte
            var checkByte = 0x00;
            for (var i = 0; i < outputBuffer.length; i++) {
              checkByte = outputBuffer[i] ^ checkByte;
            }
            const authenticationHash = Buffer.concat([outputBuffer, Buffer.from([checkByte])]);

            //write authentication hash to serial write characteristic
            const serialWriteCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_UART_SERIAL_WRITE_UUID);
            serialWriteCharacteristic.write(authenticationHash, false, (error) => {
              if (error) {
                console.log("serial write error: ", error);
              }
              sendKey = false;

              console.log("authenticated");

              setInterval(() => {
                firmwareCharacteristic.write(firmwareVersion, false, (error) => {
                  if (error) {
                    console.log('firmware characteristic write error: ', error);
                  }
                });
              }, 5000);

              const batteryRemainingCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_BATTERY_REMAINING_UUID);
              const lifetimeOdometerCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_LIFETIME_ODOMETER_UUID);

              setInterval(() => {
                batteryRemainingCharacteristic.readAsync().then((batteryRemainingData) => {
                  batteryRemaining = unsignedInt(batteryRemainingData)
                  console.log("battery remaining: ", batteryRemaining);
                });

                lifetimeOdometerCharacteristic.readAsync().then((lifetimeOdometerData) => {
                  lifetimeOdometer = unsignedInt(lifetimeOdometerData)
                  console.log("lifetime odometer: ", lifetimeOdometer);
                });
              }, 5000);








            });
          };

          //disable notifications on serial read characteristic
          serialReadCharacteristic.unsubscribe((error) => {
            if (error) {
              console.log("unsubscribe error: ", error);
            }
          });
        });

      });


    }); // end discover services and characteristics

  }); // end connect

}); //end discover

app.get("/", (req, res, next) => {
  res.send("Hello, World!");
});

app.get("/onewheel", async (req, res, next) => {
  res.send({ 'batteryRemaining': batteryRemaining, 'lifetimeOdometer': lifetimeOdometer })
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});