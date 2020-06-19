var md5 = require('js-md5');

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
};

class OneWheel {

    constructor(peripheral, isOneWheelPlus = false, debug = false) {
        this.peripheral = peripheral;
        this.isOneWheelPlus = isOneWheelPlus;

        this.debug = debug;

        this.allCharacteristics = undefined;

        this.serialReadBuffer = Buffer.alloc(20);
        this.serialReadBufferSize = 0;
        this.sendKey = true;

        this.authenticated = false;

        this._onConnect = this._onConnect.bind(this);
        this._onDisconnect = this._onDisconnect.bind(this);

        this.peripheral.once('connect', this._onConnect);
        this.peripheral.once('disconnect', this._onDisconnect);
    }

    connect() {
        this.peripheral.connect();
    }

    //Get Peripheral Info
    getID() {
        return this.peripheral.id;
    }

    getAddress() {
        return this.peripheral.address;
    }

    getLocalName() {
        return this.peripheral.advertisement.localName;
    }

    //Get Characteristics
    async getSerialNumber() {
        return await this._readCharacteristicAsync(OW_CHARACTERISTICS.SERIAL_NUMBER);
    }

    async getRidingMode() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.RIDING_MODE));
    }

    async getBatteryLow5() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.BATTERY_LOW_5)) === 0x1;
    }

    async getBatteryLow20() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.BATTERY_LOW_20)) === 0x1;
    }

    async getAnglePitch() {
        return this._intToAngle(this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.ANGLE_PITCH)));
    }

    async getAngleRoll() {
        return this._intToAngle(this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.ANGLE_ROLL)));
    }

    async getAngleYaw() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.ANGLE_YAW)) / 10.0;
    }

    async getControllerTemperature() {
        const controllerTemperature = await this._readCharacteristicAsync(OW_CHARACTERISTICS.TEMPERATURE);

        if (controllerTemperature) {
            return this._unsignedByte(controllerTemperature[0]);
        }

        return null;
    }

    async getMotorTemperature() {
        const temperature = await this._readCharacteristicAsync(OW_CHARACTERISTICS.TEMPERATURE);

        if (temperature) {
            return this._unsignedByte(temperature[1]);
        }

        return null;
    }

    async getStatusFlags() {
        var flags = {
            riderDetectPad1: false,
            riderDetectPad2: false,
            riderDetect: false,
            icsufault: false,
            icsvFault: false,
            charging: false,
            bmsCtrlComms: false,
            brokenCapacitor: false
        };

        const statusError = await this._readCharacteristicAsync(OW_CHARACTERISTICS.STATUS_ERROR);

        if (statusError && statusError.length > 0) {
            flags.riderDetect = this._getBit(statusError[0], 0) === 1;
            flags.riderDetectPad1 = this._getBit(statusError[0], 1) === 1;
            flags.riderDetectPad2 = this._getBit(statusError[0], 2) === 1;
            flags.icsufault = this._getBit(statusError[0], 3) === 1;
            flags.icsvFault = this._getBit(statusError[0], 4) === 1;
            flags.charging = this._getBit(statusError[0], 5) === 1;
            flags.bmsCtrlComms = this._getBit(statusError[0], 6) === 1;
            flags.brokenCapacitor = this._getBit(statusError[0], 7) === 1;
        }

        return flags;
    }

    async getBatteryRemaining() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.BATTERY_REMAINING));
    }

    async getBatteryCells() {
        //TODO subscribe to notifications for characteristic. On characteristic changed, byte 0 is the cell idx, byte 1 / 50.0 is the voltage.
        return null
    }

    async getBatteryTemperature() {
        const batteryTemps = await this._readCharacteristicAsync(OW_CHARACTERISTICS.BATTERY_TEMPERATURE);

        if (batteryTemps) {
            return [this._unsignedByte(batteryTemps[0]), this._unsignedByte(batteryTemps[1])];
        }

        return null;
    }

    async getBatteryVoltage() {
        const batteryVoltage = await this._readCharacteristicAsync(OW_CHARACTERISTICS.BATTERY_VOLTAGE);

        if (batteryVoltage) {
            return this._unsignedInt(batteryVoltage) / 10.0;
        }

        return null;
    }

    async getCurrentAmps() {
        const currentAmpsValue = this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.CURRENT_AMPS));

        var multiplier = 0.0;
        if (this.isOneWheelPlus) {
            multiplier = 1.8;
        }
        else {
            multiplier = 0.9;
        }

        return currentAmpsValue / 1000.0 * multiplier;
    }

    async getCustomName() {
        return await this._readCharacteristicAsync(OW_CHARACTERISTICS.CUSTOM_NAME);
    }

    async getFirmwareVersion() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.FIRMWARE_VERSION));
    }

    async getHardwareVersion() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.HARDWARE_VERSION));
    }

    async getLastErrorCode() {
        // var errorCode = {
        //     '0': null,
        //     '1': null
        // };

        // const errorCodeValue = await this._readCharacteristicAsync(OW_CHARACTERISTICS.LAST_ERROR_CODE);

        // if (errorCodeValue) {
        //     errorCode['0'] = this._unsignedByte(errorCodeValue[0]);
        //     errorCode['1'] = this._unsignedByte(errorCodeValue[1]);
        // }

        // return errorCode;

        //TODO
        //     public static SparseArray<String> ERROR_CODE_MAP = new SparseArray<>();
        // {
        //     ERROR_CODE_MAP.append(1, "ErrorBMSLowBattery");
        //     ERROR_CODE_MAP.append(2, "ErrorVoltageLow");
        //     ERROR_CODE_MAP.append(3, "ErrorVoltageHigh");
        //     ERROR_CODE_MAP.append(4, "ErrorFallDetected");
        //     ERROR_CODE_MAP.append(5, "ErrorPickupDetected");
        //     ERROR_CODE_MAP.append(6, "ErrorOverCurrentDetected");
        //     ERROR_CODE_MAP.append(7, "ErrorOverTemperature");
        //     ERROR_CODE_MAP.append(8, "ErrorBadGyro");
        //     ERROR_CODE_MAP.append(9, "ErrorBadAccelerometer");
        //     ERROR_CODE_MAP.append(10, "ErrorBadCurrentSensor");
        //     ERROR_CODE_MAP.append(11, "ErrorBadHallSensors");
        //     ERROR_CODE_MAP.append(12, "ErrorBadMotor");
        //     ERROR_CODE_MAP.append(13, "ErrorOvercurrent13");
        //     ERROR_CODE_MAP.append(14, "ErrorOvercurrent14");
        //     ERROR_CODE_MAP.append(15, "ErrorRiderDetectZone");
        // }

        return await this._readCharacteristicAsync(OW_CHARACTERISTICS.LAST_ERROR_CODE);
    }

    async getLifetimeAmphours() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.LIFETIME_AMPHOURS));
    }

    async getLifetimeOdometer() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.LIFETIME_ODOMETER));
    }

    async getLightingMode() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.LIGHTING_MODE))[1] === 0x1;
    }

    async getLightsFront() {
        //TODO get front lights
        return await this._readCharacteristicAsync(OW_CHARACTERISTICS.LIGHTS_FRONT);
    }

    async getLightsBack() {
        //TODO get back lights
        return await this._readCharacteristicAsync(OW_CHARACTERISTICS.LIGHTS_BACK);
    }

    async getOdometer() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.ODOMETER));
    }

    async getTripOdometer() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.ODOMETER));
    }

    async getSafetyHeadroom() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.SAFETY_HEADROOM));
    }

    async getSpeedRPM() {
        return this._unsignedInt(await this._readCharacteristicAsync(OW_CHARACTERISTICS.SPEED_RPM));
    }

    async getTripRegenAmphours() {
        //TODO value seems too high
        const tripRegenAmphours = await this._readCharacteristicAsync(OW_CHARACTERISTICS.TRIP_REGEN_AMPHOURS);

        if (tripRegenAmphours) {
            return this._unsignedInt(tripRegenAmphours) / 50.0;
        }

        return null;
    }

    async getTripTotalAmphours() {
        const tripTotalAmphours = await this._readCharacteristicAsync(OW_CHARACTERISTICS.TRIP_TOTAL_AMPHOURS);

        if (tripTotalAmphours) {
            //TODO value seems too high
            return this._unsignedInt(tripTotalAmphours) / 50.0;
        }

        return null;

    }

    //Event Handlers
    _onConnect(error) {
        if (error) {
            console.log("connect error: ", error);
            return;
        }

        if (this.debug) console.log("connected");

        this.peripheral.discoverSomeServicesAndCharacteristics([OW_SERVICE_UUID], [], (error, services, characteristics) => {
            if (error) {
                console.log("error getting services and characteristics:", error);
                return;
            }

            this.allCharacteristics = characteristics;

            if (this.debug) console.log("services and characteristics discovered");

            //get firmware version characteristic value       
            const firmwareCharacteristic = this._getCharacteristic(OW_CHARACTERISTICS.FIRMWARE_VERSION);
            firmwareCharacteristic.read((error, firmwareVersion) => {

                //TODO check firmware eversion >= gemini

                //enable notifications on serial read characteristic
                const serialReadCharacteristic = this._getCharacteristic(OW_CHARACTERISTICS.UART_SERIAL_READ);

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
                    this.serialReadBuffer.fill(data, this.serialReadBufferSize);
                    this.serialReadBufferSize += data.length;
                    if (this.serialReadBufferSize >= 20 && this.sendKey) {

                        this.sendKey = false;
                        //disable notifications on serial read characteristic
                        serialReadCharacteristic.unsubscribe((error) => {
                            if (error) {
                                console.log("unsubscribe error: ", error);
                                return;
                            }

                            //create authentication hash
                            const authenticationResponse = this._createAuthenticationResponse(this.serialReadBuffer);

                            //write authentication hash to serial write characteristic
                            const serialWriteCharacteristic = this._getCharacteristic(OW_CHARACTERISTICS.UART_SERIAL_WRITE);
                            serialWriteCharacteristic.write(authenticationResponse, false, (error) => {
                                if (error) {
                                    console.log("serial write error: ", error);
                                    this.sendKey = true;
                                    return;
                                }
                                this.authenticated = true;
                                if (this.debug) console.log("authenticated");

                                //Write firmware back to OW regularly to keep authentication valid
                                setInterval(() => {
                                    firmwareCharacteristic.write(firmwareVersion, false, (error) => {
                                        if (error) {
                                            console.log('firmware characteristic write error: ', error);
                                        }
                                    });
                                }, 5000);

                            });
                        });

                    }

                }); // end on serial read data

            }); // end firmware read

        }); // end discover services and characteristics

    }

    _onDisconnect() {
        if (this.debug) console.log("disconnected from peripheral: ", this.peripheral.advertisement.localName);
    }

    //Helper Functions
    _getCharacteristic(uuid) {
        if (this.allCharacteristics) {
            return this.allCharacteristics.find(characteristic => characteristic.uuid === uuid);
        }
        return null;
    }

    async _readCharacteristicAsync(uuid) {
        const characteristic = this._getCharacteristic(uuid);

        if (characteristic) {
            return await characteristic.readAsync();
        }

        return null;
    }

    _createAuthenticationResponse(serialReadBytes) {

        if (this.debug) console.log("Serial Read Bytes", serialReadBytes);
        var authenticationResponse = null;

        //Create authentication hash
        const hashSerialBytes = serialReadBytes.slice(3, 19);
        if (this.debug) console.log("Hash Serial Bytes", hashSerialBytes);
        const hashConst = Buffer.from([0xD9, 0x25, 0x5F, 0x0F, 0x23, 0x35, 0x4E, 0x19, 0xBA, 0x73, 0x9C, 0xCD, 0xC4, 0xA9, 0x17, 0x65]);
        const hashInput = Buffer.concat([hashSerialBytes, hashConst]);
        if (this.debug) console.log("Hash Input Bytes", hashInput)
        const hashOutput = md5.digest(hashInput);
        if (this.debug) console.log("Hash Output Bytes", hashOutput);

        //create authentication check byte
        var checkByte = 0x00;
        for (var i = 0; i < authenticationResponse.length; i++) {
            checkByte = authenticationResponse[i] ^ checkByte;
        }
        if (this.debug) console.log("Check Byte", checkByte);
        authenticationResponse = Buffer.concat([authenticationResponse, Buffer.from([checkByte])]);

        if (this.debug) console.log("Authentication Response", authenticationResponse);
        return authenticationResponse;
    }

    _unsignedByte(byte) {
        return byte & 255;
    }

    _unsignedInt(buffer) {
        if (buffer === null || buffer === undefined || buffer.length <= 0) {
            return null;
        }
        else if (buffer.length === 1) {
            return this._unsignedByte(buffer[0]);
        }
        else {
            return (this._unsignedByte(buffer[0]) << 8) + this._unsignedByte(buffer[1]);
        }
    }

    _getBit(value, bit) {
        if (value && bit >= 0 && bit <= 7) {
            return (this._unsignedByte(value) >> bit) & 0x1;
        }

        return null;
    }

    _intToAngle(value) {
        if (value) {
            return (1800 - value) / 10.0;
        }

        return null;
    }
};

module.exports.OW_SERVICE_UUID = OW_SERVICE_UUID;
module.exports.OneWheel = OneWheel;