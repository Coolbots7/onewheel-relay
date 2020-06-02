import gatt
from OneWheelBLE import OneWheelBLE
from argparse import ArgumentParser

arg_parser = ArgumentParser(description="OneWheel Bluetooth Connection")
arg_parser.add_argument('mac_address', help="MAC address of device to connect")
args = arg_parser.parse_args()

manager = gatt.DeviceManager(adapter_name='hci0')

owDevice = OneWheelBLE(manager=manager, mac_address=args.mac_address)
owDevice.connect()

if(owDevice.is_connected()):
    print("[%s] Connected to device %s" % (owDevice.mac_address, owDevice.alias()))
else:
    print("Connection Failed")
    
manager.run()
