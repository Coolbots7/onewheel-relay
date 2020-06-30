const noble = require('@abandonware/noble');
var express = require("express");
const OneWheel = require('./OneWheel');

var app = express();
//TODO add port environment variable
const PORT = 3000;

//TODO add mac address environment variable
//TODO if no mac address environment variable, default to looking for service

var onewheel = null;

function startScanning() {
  console.log("starting scan");
  noble.startScanning([OneWheel.OW_SERVICE_UUID], false);
}

noble.on('stateChange', function (state) {
  console.log("state changed:", state);
  if (state === 'poweredOn') {
    startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function (peripheral) {
  noble.stopScanning();
  console.log("OW Peripheral discovered: ", peripheral.advertisement.localName);

  if (!onewheel) {
    onewheel = new OneWheel.OneWheel(peripheral, isOneWheelPlus = false, debug = true);

    onewheel.on("disconnect", () => {
      console.log("OneWheel disconnected");
      onewheel.disconnect();
      onewheel = null;

      setTimeout(startScanning, 10000);
    });

    onewheel.connect();
  }

}); //end discover

app.get("/", (req, res, next) => {
  res.send("Hello, World!");
});

app.get("/onewheel", async (req, res, next) => {
  var status = {};
  var data = {};

  if (onewheel) {
    status = {
      'connected': true,
      'id': onewheel.getID(),
      'address': onewheel.getAddress(),
      'localName': onewheel.getLocalName()
    };

    data['serialNumber'] = await onewheel.getSerialNumber();
    data['ridingMode'] = await onewheel.getRidingMode();
    data['customName'] = await onewheel.getCustomName();
    data['firmwareVersion'] = await onewheel.getFirmwareVersion();
    data['hardwareVersion'] = await onewheel.getHardwareVersion();
    data['flags'] = await onewheel.getStatusFlags();
    data['lastErrorCode'] = await onewheel.getLastErrorCode();
    data['safetyHeadroom'] = await onewheel.getSafetyHeadroom();

    data['angle'] = {
      'pitch': await onewheel.getAnglePitch(),
      'roll': await onewheel.getAngleRoll(),
      'yaw': await onewheel.getAngleYaw()
    };

    data['lifetime'] = {
      'odometer': await onewheel.getLifetimeOdometer(),
      'amp_hours': await onewheel.getLifetimeAmphours()
    };

    data['current'] = {
      'rpm': await onewheel.getSpeedRPM(),
      'amps': await onewheel.getCurrentAmps(),
      'battery': {
        'voltage': await onewheel.getBatteryVoltage(),
        'remaining': await onewheel.getBatteryRemaining(),
        'cells': await onewheel.getBatteryCells(),
        'batteryLow5': await onewheel.getBatteryLow5(),
        'batteryLow20': await onewheel.getBatteryLow20()
      },
      'temperature': {
        'battery': await onewheel.getBatteryTemperature(),
        'controller': await onewheel.getControllerTemperature(),
        'motor': await onewheel.getMotorTemperature()
      },
      'lights': {
        'mode': await onewheel.getLightingMode(),
        'front': await onewheel.getLightsFront(),
        'back': await onewheel.getLightsBack()
      }
    };

    data['trip'] = {
      'odometer': await onewheel.getTripOdometer(),
      'regen_amp_hours': await onewheel.getTripRegenAmphours(),
      'total_amp_hours': await onewheel.getTripTotalAmphours()
    };
  }
  else {
    status['connected'] = false;
    data = null;
  }

  res.send({ 'status': status, 'data': data });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});