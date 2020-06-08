const noble = require('@abandonware/noble');

const PERIPHERAL_ADDRESS = "4c:24:98:70:98:91".toLowerCase();
console.log("address:", PERIPHERAL_ADDRESS);

const OW_SERVICE_UUID = 'e659f300ea9811e3ac100800200c9a66';

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

  peripheral.connect((error) => {
    if (!error) {
      console.log("connected!");
    }
    else {
      console.log("connect error: ", error);
    }
  });
});