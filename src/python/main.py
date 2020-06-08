import gatt
from OneWheelBLE import OneWheelDevice, OneWheelDeviceManager
from argparse import ArgumentParser
import signal
import sys
import time

owDevice = None
manager = None

def signal_handler(sig, frame):
    print('Disconnecting from OW...')
    owDevice.disconnect()
    print("Stopping manager...")
    manager.stop()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

arg_parser = ArgumentParser(description="OneWheel Bluetooth Connection")
arg_parser.add_argument('mac_address', help="MAC address of device to connect")
args = arg_parser.parse_args()

manager = OneWheelDeviceManager(adapter_name='hci0')
owDevice = manager.make_device(args.mac_address)
owDevice.connect()

manager.run()



