const noble = require('@abandonware/noble');
var md5 = require('js-md5');

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

function unsignedInt(buffer) {
  if(buffer === undefined || buffer.length <= 0) {
    return 0
  }
  else if(buffer.length === 1) {
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

  console.log('peripheral discovered (' + peripheral.id +
    ' with address <' + peripheral.address + ', ' + peripheral.addressType + '>,' +
    ' connectable ' + peripheral.connectable + ',' +
    ' RSSI ' + peripheral.rssi + ':');
  console.log('\thello my local name is:');
  console.log('\t\t' + peripheral.advertisement.localName);
  console.log('\tcan I interest you in any of the following advertised services:');
  console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));

  var serviceData = peripheral.advertisement.serviceData;
  if (serviceData && serviceData.length) {
    console.log('\there is my service data:');
    for (var i in serviceData) {
      console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': ' + JSON.stringify(serviceData[i].data.toString('hex')));
    }
  }
  if (peripheral.advertisement.manufacturerData) {
    console.log('\there is my manufacturer data:');
    console.log('\t\t' + JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex')));
  }
  if (peripheral.advertisement.txPowerLevel !== undefined) {
    console.log('\tmy TX power level is:');
    console.log('\t\t' + peripheral.advertisement.txPowerLevel);
  }

  console.log();

  peripheral.on('rssiUpdate', (rssi) => {
    console.log("RSSI:", rssi);
  })

  peripheral.connect(async (error) => {
    if (!error) {
      console.log("connected!");

      peripheral.discoverSomeServicesAndCharacteristics([OW_SERVICE_UUID], [], async (error, services, characteristics) => {
        if (error) {
          console.log("error getting services and characteristics:", error);
          return;
        }
        console.log("discovered services and characteristics");
        // console.log("characteristics")
        // for (var characteristic in characteristics) {
        //   console.log("\t" + characteristics[characteristic].uuid);
        // }        

        //get firmware version characteristic value       
        const firmwareCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_FIRMWARE_VERSION_UUID)
        // firmwareCharacteristic.read((error, firmwareVersion) => {
        //   console.log("firmware version:", firmwareVersion);
        // });
        const firmwareVersion = (await firmwareCharacteristic.readAsync());
        console.log("firmware version:", firmwareVersion);

        //TODO check firmware eversion >= gemini

        //enable notifications on serial read characteristic
        const serialReadCharacteristic = characteristics.find((characteristic) => characteristic.uuid === OW_CHARACTERISTIC_UART_SERIAL_READ_UUID);
        // serialReadCharacteristic.on('notify', (state) => {
        //   console.log('serial read notify: ', state);
        // });
        serialReadCharacteristic.on('data', (data, isNotification) => {
          // console.log("on data:", data);
          // console.log("is notification: ", isNotification);

          //get serial read bytes
          serialReadBuffer.fill(data, serialReadBufferSize);
          serialReadBufferSize += data.length;
          if (serialReadBufferSize >= 20 && sendKey) {
            console.log("serial read buffer: ", serialReadBuffer);

            //create authentication hash
            const hashSerialBytes = serialReadBuffer.slice(3, 19);
            console.log("hash serial bytes", hashSerialBytes);
            const hashConst = Buffer.from([0xD9, 0x25, 0x5F, 0x0F, 0x23, 0x35, 0x4E, 0x19, 0xBA, 0x73, 0x9C, 0xCD, 0xC4, 0xA9, 0x17, 0x65]);
            const hashInput = Buffer.concat([hashSerialBytes, hashConst]);
            console.log("hash input", hashInput);
            const hashOutput = md5.digest(hashInput);
            console.log("hash output", hashOutput);
            const outputBuffer = Buffer.concat([Buffer.from([0x43, 0x52, 0x58]), Buffer.from(hashOutput)]);
            console.log("output: ", outputBuffer)

            var checkByte = 0x00;
            for (var i = 0; i < outputBuffer.length; i++) {
              checkByte = outputBuffer[i] ^ checkByte;
            }
            console.log("check byte", checkByte);
            // output.writeUInt16BE(checkByte, outputBufferSize - 1);
            const authenticationHash = Buffer.concat([outputBuffer, Buffer.from([checkByte])]);
            console.log("auth hash", authenticationHash);

            //write authentication hash to serial write characteristic
            const serialWriteCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_UART_SERIAL_WRITE_UUID);
            serialWriteCharacteristic.write(authenticationHash, false, (error) => {
              if (error) {
                console.log("serial write error: ", error);
              }
              sendKey = false;

              const batteryRemainingCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_BATTERY_REMAINING_UUID);
              batteryRemainingCharacteristic.read((error, batteryRemaining) => {
                if (error) {
                  console.log("battery remaining read error: ", error);
                }
                else {
                }
                console.log("battery remaining: ", unsignedInt(batteryRemaining));
              });

              const lifetimeOdometerCharacteristic = characteristics.find(characteristic => characteristic.uuid === OW_CHARACTERISTIC_LIFETIME_ODOMETER_UUID);
              lifetimeOdometerCharacteristic.read((error, lifetimeOdometer) => {
                if(error) {
                  console.log("lifetime odometer read error: ", error);
                }
                else {
                  console.log("lifetime odometer: ", unsignedInt(lifetimeOdometer));
                }
              });

            });
          };

          //disable notifications on serial read characteristic
          serialReadCharacteristic.unsubscribe((error) => {
            if (error) {
              console.log("unsubscribe error: ", error);
            }
          });


        });
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
        })


      });



    }
    else {
      console.log("connect error: ", error);
    }
  });
});