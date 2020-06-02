#! /bin/bash

#Test get battery
echo "Test get battery"
/usr/bin/gatttool -b 4C:24:98:70:98:91 --char-read --handle=0x0021

#Get FW version
echo "Get FW version"
/usr/bin/gatttool -b 4C:24:98:70:98:91 --char-read --handle=0x0059

#Enable notifications on UART Serial Read characteristic
echo "Enable UARTSerialRead notifications"
/usr/bin/gatttool -b 4C:24:98:70:98:91 --char-write-req --handle=0x0012 --value=0100

#Write FW version
echo "Write FW version"
/usr/bin/gatttool -b 4C:24:98:70:98:91 --char-write-req --handle=0x0059 --value=1026

#TODO listen for 20 bytes from serial read and perform authentication

#Test get battery
echo "Test get battery"
/usr/bin/gatttool -b 4C:24:98:70:98:91 --char-read --handle=0x0021