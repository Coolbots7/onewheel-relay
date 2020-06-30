import gatt
import hashlib
import time


class OneWheelDeviceManager(gatt.DeviceManager):
    def make_device(self, mac_address):
        return OneWheelDevice(mac_address=mac_address, manager=self)


class OneWheelDevice(gatt.Device):
    OW_SERVICE_UUID = "e659f300-ea98-11e3-ac10-0800200c9a66"

    OW_CHARACTERISTIC_SERIAL_NUMBER = "e659F301-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_RIDING_MODE = "e659f302-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_LOW_5 = "e659f304-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_LOW_20 = "e659f305-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_SERIAL = "e659f306-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_ANGLE_PITCH = "e659f307-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_ANGLE_ROW = "e659f308-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_ANGLE_YAW = "e659f309-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_TEMPERATURE = "e659f310-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_STATUS_ERROR = "e659f30f-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_REMAINING = "e659f303-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_CELLS = "e659f31b-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_TEMPERATURE = "e659f315-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_BATTERY_VOLTAGE = "e659f316-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_CURRENT_AMPS = "e659f312-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_CUSTOM_NAME = "e659f3fd-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_FIRMWARE_VERSION = "e659f311-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_HARDWARE_VERSION = "e659f318-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_LAST_ERROR_CODE = "e659f31c-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_LIFETIME_AMPHOURS = "e659f31a-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_LIFETIME_ODOMETER = "e659f319-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_LIGHTING_MODE = "e659f30c-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_LIGHTS_FRONT = "e659f30d-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_LIGHTS_BACK = "e659f30e-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_ODOMETER = "e659f30a-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_SAFETY_HEADROOM = "e659f317-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_SPEED_RPM = "e659f30b-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_TRIP_REGEN_AMPHOURS = "e659f314-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_TRIP_TOTAL_AMPHOURS = "e659f313-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_UART_SERIAL_READ = "e659f3fe-ea98-11e3-ac10-0800200c9a66"
    OW_CHARACTERISTIC_UART_SERIAL_WRITE = "e659f3ff-ea98-11e3-ac10-0800200c9a66"

    authentication_byte_array = bytearray(0)
    _send_key = True
    _is_authenticated = False

    def connect(self):
        print("Connecting to OW...")
        super().connect()

    def connect_succeeded(self):
        super().connect_succeeded()
        print("[%s] Connected" % (self.mac_address))

    def connect_failed(self, error):
        super().connect_failed(error)
        print("[%s] Connection failed: %s" % (self.mac_address, str(error)))

    def disconnect_succeeded(self):
        super().disconnect_succeeded()
        print("[%s] Disconnected" % (self.mac_address))

    def services_resolved(self):
        super().services_resolved()

        # get onewheel service
        self.owService = self.get_ow_service()
        # TODO check device services
        # TODO if device is missing onewheel service, disconnect

        self._authenticate()

    def _authenticate(self):
        # reset serial read byte array
        self.authentication_byte_array = bytearray(0)

        # TODO check what authentication method to use based on firmware version

        # Authentication Step 1: Enable notification for the Serial Read characteristic
        # char-write-req 0x0013 0100
        # get serial read characteristics
        serial_read_characteristic = self.get_serial_read_characteristic()
        # enable serial read characteristic notification
        serial_read_characteristic.enable_notifications(True)
        # from here shift shift to the characteristic_enable_notifications_succeeded function
        # to wait till the notification is enabled

    def _authentication_hash(self, serial_read_bytes):
        # Create output and add constant 3 bytes 43:52:58
        output = bytearray(b'\x43\x52\x58')

        # Hash the remaining 17 bytes with the constant string converted to byte array
        hash_serial_bytes = serial_read_bytes[3:19]
        hash_input = hash_serial_bytes + \
            bytearray(
                b'\xD9\x25\x5F\x0F\x23\x35\x4E\x19\xBA\x73\x9C\xCD\xC4\xA9\x17\x65')
        m = hashlib.md5(hash_input)
        hash_output = m.digest()
        output = output + hash_output

        # create check byte
        check_byte = 0
        for c in output:
            check_byte = c ^ check_byte
        output = output + check_byte.to_bytes(1, byteorder='big')

        return output

    def is_authenticated(self):
        return self._is_authenticated

    def characteristic_value_updated(self, characteristic, value):

        # Authentication Step 3: Wait to receive 20 bytes from the serial read characteristic notification
        if(characteristic.uuid == self.OW_CHARACTERISTIC_UART_SERIAL_READ):

            self.authentication_byte_array = self.authentication_byte_array + value

            if(len(self.authentication_byte_array) >= 20 and self._send_key):
                # TODO disable serial read characteristic notification

                # Authentication create authentication response byte array
                authentication_hash = self._authentication_hash(
                    self.authentication_byte_array)

                # get device serial write characteristic
                serial_write_characteristic = self.get_serial_write_characteristic()
                # write authentication hash to serial write characteristic
                serial_write_characteristic.write_value(authentication_hash)
                self._send_key = False

    def characteristic_enable_notifications_succeeded(self, characteristic):
        super().characteristic_enable_notifications_succeeded(characteristic)

        # Authentication Step 2: Once the Serial Read characteristic notifications have been enabled
        # echo the devices firmware version back to itself
        if(characteristic.uuid == self.OW_CHARACTERISTIC_UART_SERIAL_READ):
            firmware_version_characteristic = self.get_firmware_version_characteristic()
            # write firmware version
            firmware_version_characteristic.write_value(
                firmware_version_characteristic.read_value())
            # from here things jump to the characteristic_value_updated to wait for the response from the board

    def characteristic_write_value_succeeded(self, characteristic):
        super().characteristic_write_value_succeeded(characteristic)

        if(characteristic.uuid == self.OW_CHARACTERISTIC_UART_SERIAL_WRITE):
            self._is_authenticated = True

            firmware_version_characteristic = self.get_firmware_version_characteristic()
            
            while True:
                self._debug()
                
                # write firmware version
                firmware_version_characteristic.write_value(
                    firmware_version_characteristic.read_value())

                time.sleep(5)

    def get_service(self, uuid):
        for service in self.services:
            if service.uuid == uuid:
                return service

        return None

    def get_ow_service(self):
        return self.get_service(self.OW_SERVICE_UUID)

    def get_characteristic(self, service,  uuid):
        for characteristic in service.characteristics:
            if characteristic.uuid == uuid:
                return characteristic

        return None

    def get_ow_characteristic(self, uuid):
        return self.get_characteristic(self.get_ow_service(), uuid)

    def get_serial_read_characteristic(self):
        return self.get_ow_characteristic(self.OW_CHARACTERISTIC_UART_SERIAL_READ)

    def get_serial_write_characteristic(self):
        return self.get_ow_characteristic(self.OW_CHARACTERISTIC_UART_SERIAL_WRITE)

    def get_firmware_version_characteristic(self):
        return self.get_ow_characteristic(self.OW_CHARACTERISTIC_FIRMWARE_VERSION)

    def unsignedInt(self, arr):
        if (not arr) or (len(arr) < 1):
            return None
        elif(len(arr) < 2):
            return arr[0]
        else:
            return (arr[0] << 8) + arr[1]

    def getFirmwareVersion(self):
        if(self._is_authenticated):
            return self.unsignedInt(self.get_firmware_version_characteristic().read_value())
        else:
            return None

    def getBatteryRemaining(self):
        if(self._is_authenticated):
            return self.unsignedInt(self.get_ow_characteristic(self.OW_CHARACTERISTIC_BATTERY_REMAINING).read_value())
        else:
            return None

    def getLifetimeAmphours(self):
        if(self._is_authenticated):
            return self.unsignedInt(self.get_ow_characteristic(self.OW_CHARACTERISTIC_LIFETIME_AMPHOURS).read_value())
        else:
            return None

    def getLifetimeOdometer(self):
        if(self._is_authenticated):
            return self.unsignedInt(self.get_ow_characteristic(self.OW_CHARACTERISTIC_LIFETIME_ODOMETER).read_value())
        else:
            return None

    def _debug(self):
        print("Firmware version:")
        print(self.getFirmwareVersion())

        print("Lifetime Amphours:")
        print(self.getLifetimeAmphours())

        print("Lifetime Odometer:")
        print(self.getLifetimeOdometer())

        print("Battery Remaining:")
        print("%s %%" % (self.getBatteryRemaining()))
