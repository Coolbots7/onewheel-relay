#!/usr/bin/env python3
import argparse,subprocess

text = 'This program returns stats from an Onewheel BLE device'
parser = argparse.ArgumentParser(description = text)
parser.add_argument("address",help="mac address of device")
parser.add_argument("--battery", help="get battery level",action="store_true")
parser.add_argument("--total_miles", help="get total miles",action="store_true")
parser.add_argument("--firmware_version", help="get firmware version",action="store_true")
parser.add_argument("--hardware_revision", help="get hardware revision",action="store_true")
parser.add_argument("--riding_mode", help="get current riding mode",action="store_true")

args = parser.parse_args()


if __name__ == "__main__":
    if args.battery:
        handle = "0x0021"
    elif args.total_miles:
        handle = "0x0079"
    elif args.hardware_revision:
        handle = "0x0075"
    elif args.firmware_version:
        handle = "0x0059"
    elif args.riding_mode:
        handle = "0x001d"
    else:
        handle = "0x0021"

    p = subprocess.Popen("/usr/bin/gatttool -b {0} --char-read --handle={1}".format(args.address,handle), stdout=subprocess.PIPE, shell=True)
    try:
        (output, err) = p.communicate(timeout=10)
        p_status = p.wait()
        p_out = output.decode('ascii').split()
        if len(p_out) > 0:
            r = '{0}{1}'.format(p_out[2],p_out[3])
            print(int(r,16))
        else:
            print(p_out)
    except subprocess.TimeoutExpired:
        print('n/a')