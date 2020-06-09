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
}


function createAuthenticationResponse(serialReadBytes) {
    var authenticationResponse = null;

    //Create authentication hash
    const hashSerialBytes = serialReadBytes.slice(3, 19);
    const hashConst = Buffer.from([0xD9, 0x25, 0x5F, 0x0F, 0x23, 0x35, 0x4E, 0x19, 0xBA, 0x73, 0x9C, 0xCD, 0xC4, 0xA9, 0x17, 0x65]);
    const hashInput = Buffer.concat([hashSerialBytes, hashConst]);
    const hashOutput = md5.digest(hashInput);
    authenticationResponse = Buffer.concat([Buffer.from([0x43, 0x52, 0x58]), Buffer.from(hashOutput)]);

    //create authentication check byte
    var checkByte = 0x00;
    for (var i = 0; i < authenticationResponse.length; i++) {
        checkByte = authenticationResponse[i] ^ checkByte;
    }
    authenticationResponse = Buffer.concat([authenticationResponse, Buffer.from([checkByte])]);

    return authenticationResponse;
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

module.exports.OW_SERVICE_UUID = OW_SERVICE_UUID;
module.exports.OW_CHARACTERISTICS = OW_CHARACTERISTICS;
module.exports.createAuthenticationResponse = createAuthenticationResponse;
module.exports.unsignedInt = unsignedInt;