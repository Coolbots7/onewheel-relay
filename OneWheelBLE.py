import gatt


class OneWheelBLE:
    def __init__(self, manager, mac_address):
        self.mac_address = mac_address
        self.owDevice = gatt.Device(manager=manager, mac_address=self.mac_address)

    def connect(self):
        self.owDevice.connect()

        if(self.owDevice.is_connected()):
            # TODO check device services
            # TODO if device is missing onewheel service, disconnect
            pass
        else:
            pass

    def is_connected(self):
        return self.owDevice.is_connected()

    def alias(self):
        return self.owDevice.alias()
