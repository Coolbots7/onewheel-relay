const noble = require('@abandonware/noble');
var md5 = require('js-md5');
var express = require("express");

var app = express();
const PORT = 3000;

const OW_SERVICE_UUID = 'e659f300ea9811e3ac100800200c9a66';

const OW_CHARACTERISTICS = {
  SERIAL_NUMBER: 'e659F301ea9811e3ac100800200c9a66',
  RIDING_MODE: 'e659f302ea9811e3ac100800200c9a66',
  BATTERY_LOW_5: 'e659f304ea9811e3ac100800200c9a66',
  BATTERY_LOW_20: 'e659f305ea9811e3ac100800200c9a66',
  BATTERY_SERIAL: 'e659f306ea9811e3ac100800200c9a66',
  ANGLE_PITCH: 'e659f307ea9811e3ac100800200c9a66',
  ANGLE_ROLL: 'e659f308ea9811e3ac100800200c9a66',
  ANGLE_YAW: 'e659f309ea9811e3ac100800200c9a66',
  TEMPERATURE: 'e659f310ea9811e3ac100800200c9a66',
  STATUS_ERROR: 'e659f30fea9811e3ac100800200c9a66',
  BATTERY_REMAINING: 'e659f303ea9811e3ac100800200c9a66',
  BATTERY_CELLS: 'e659f31bea9811e3ac100800200c9a66',
  BATTERY_TEMPERATURE: 'e659f315ea9811e3ac100800200c9a66',
  BATTERY_VOLTAGE: 'e659f316ea9811e3ac100800200c9a66',
  CURRENT_AMPS: 'e659f312ea9811e3ac100800200c9a66',
  CUSTOM_NAME: 'e659f3fdea9811e3ac100800200c9a66',
  FIRMWARE_VERSION: 'e659f311ea9811e3ac100800200c9a66',
  HARDWARE_VERSION: 'e659f318ea9811e3ac100800200c9a66',
  LAST_ERROR_CODE: 'e659f31cea9811e3ac100800200c9a66',
  LIFETIME_AMPHOURS: 'e659f31aea9811e3ac100800200c9a66',
  LIFETIME_ODOMETER: 'e659f319ea9811e3ac100800200c9a66',
  LIGHTING_MODE: 'e659f30cea9811e3ac100800200c9a66',
  LIGHTS_FRONT: 'e659f30dea9811e3ac100800200c9a66',
  LIGHTS_BACK: 'e659f30eea9811e3ac100800200c9a66',
  ODOMETER: 'e659f30aea9811e3ac100800200c9a66',
  SAFETY_HEADROOM: 'e659f317ea9811e3ac100800200c9a66',
  SPEED_RPM: 'e659f30bea9811e3ac100800200c9a66',
  TRIP_REGEN_AMPHOURS: 'e659f314ea9811e3ac100800200c9a66',
  TRIP_TOTAL_AMPHOURS: 'e659f313ea9811e3ac100800200c9a66',
  UART_SERIAL_READ: 'e659f3feea9811e3ac100800200c9a66',
  UART_SERIAL_WRITE: 'e659f3ffea9811e3ac100800200c9a66'
}

var serialReadBuffer = Buffer.alloc(20);
var serialReadBufferSize = 0;
var sendKey = true;

var allCharacteristics = undefined;
const getCharacteristic = (uuid) => {
  return allCharacteristics.find(characteristic => characteristic.uuid === uuid);
}

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

      allCharacteristics = characteristics;

      //get firmware version characteristic value       
      const firmwareCharacteristic = getCharacteristic(OW_CHARACTERISTICS.FIRMWARE_VERSION);
      firmwareCharacteristic.read((error, firmwareVersion) => {

        //TODO check firmware eversion >= gemini

        //enable notifications on serial read characteristic
        const serialReadCharacteristic = getCharacteristic(OW_CHARACTERISTICS.UART_SERIAL_READ);

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
            const serialWriteCharacteristic = getCharacteristic(OW_CHARACTERISTICS.UART_SERIAL_WRITE);
            serialWriteCharacteristic.write(authenticationHash, false, (error) => {
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
    batteryRemaining = unsignedInt(await getCharacteristic(OW_CHARACTERISTICS.BATTERY_REMAINING).readAsync());
    lifetimeOdometer = unsignedInt(await getCharacteristic(OW_CHARACTERISTICS.LIFETIME_ODOMETER).readAsync());
  }

  res.send({ 'batteryRemaining': batteryRemaining, 'lifetimeOdometer': lifetimeOdometer })
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});