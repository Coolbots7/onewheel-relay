const noble = require('@abandonware/noble');
var express = require("express");
const OneWheel = require('./OneWheel');

var app = express();
//TODO add port environment variable
const PORT = 3000;

//TODO add mac address environment variable
//TODO if no mac address environment variable, default to looking for service

var onewheel = null;

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
  console.log("OW Peripheral discovered: ", peripheral.advertisement.localName);

  onewheel = new OneWheel.OneWheel(peripheral);
  onewheel.connect();

}); //end discover

app.get("/", (req, res, next) => {
  res.send("Hello, World!");
});

app.get("/onewheel", async (req, res, next) => {

  var batteryRemaining = 0;
  var lifetimeOdometer = 0;

  if(onewheel) {
    batteryRemaining = await onewheel.getBatteryRemaining();
    lifetimeOdometer = await onewheel.getLifetimeOdometer();
  }

  res.send({ 'batteryRemaining': batteryRemaining, 'lifetimeOdometer': lifetimeOdometer })
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});