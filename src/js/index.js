const noble = require('@abandonware/noble');
var express = require("express");
const OneWheel = require('./OneWheel');

var app = express();
const PORT = 3000;

//Globals
var serialReadBuffer = Buffer.alloc(20);
var serialReadBufferSize = 0;
var sendKey = true;

var allCharacteristics = undefined;
const getCharacteristic = (uuid) => {
  return allCharacteristics.find(characteristic => characteristic.uuid === uuid);
}


noble.on('stateChange', function (state) {
  console.log("state changed:", state);
  if (state === 'poweredOn') {
    console.log("starting scan");
    noble.startScanning([OneWheel.OW_SERVICE_UUID], false);
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function (peripheral) {
  noble.stopScanning();
  console.log("Peripheral discovered: ", peripheral.advertisement.localName);

  peripheral.connect();

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

    peripheral.discoverSomeServicesAndCharacteristics([OneWheel.OW_SERVICE_UUID], [], (error, services, characteristics) => {
      if (error) {
        console.log("error getting services and characteristics:", error);
        return;
      }

      console.log("services and characteristics discovered");

      allCharacteristics = characteristics;

      //get firmware version characteristic value       
      const firmwareCharacteristic = getCharacteristic(OneWheel.OW_CHARACTERISTICS.FIRMWARE_VERSION);
      firmwareCharacteristic.read((error, firmwareVersion) => {

        //TODO check firmware eversion >= gemini

        //enable notifications on serial read characteristic
        const serialReadCharacteristic = getCharacteristic(OneWheel.OW_CHARACTERISTICS.UART_SERIAL_READ);

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
            const authenticationResponse = OneWheel.createAuthenticationResponse(serialReadBuffer);

            //write authentication hash to serial write characteristic
            const serialWriteCharacteristic = getCharacteristic(OneWheel.OW_CHARACTERISTICS.UART_SERIAL_WRITE);
            serialWriteCharacteristic.write(authenticationResponse, false, (error) => {
              if (error) {
                console.log("serial write error: ", error);
              }
              sendKey = false;

              console.log("authenticated");

              //Write firmware back to OW regularly to keep authentication valid
              setInterval(() => {
                firmwareCharacteristic.write(firmwareVersion, false, (error) => {
                  if (error) {
                    console.log('firmware characteristic write error: ', error);
                  }
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

        }); // end on serial read data

      }); // end firmware read

    }); // end discover services and characteristics

  }); // end connect

}); //end discover

app.get("/", (req, res, next) => {
  res.send("Hello, World!");
});

app.get("/onewheel", async (req, res, next) => {

  var batteryRemaining = 0;
  var lifetimeOdometer = 0;

  if (allCharacteristics) {
    batteryRemaining = OneWheel.unsignedInt(await getCharacteristic(OneWheel.OW_CHARACTERISTICS.BATTERY_REMAINING).readAsync());
    lifetimeOdometer = OneWheel.unsignedInt(await getCharacteristic(OneWheel.OW_CHARACTERISTICS.LIFETIME_ODOMETER).readAsync());
  }

  res.send({ 'batteryRemaining': batteryRemaining, 'lifetimeOdometer': lifetimeOdometer })
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});