var comms = require('ncd-red-comm');
var MCP23017 = require('./index.js');

/*
 * Allows use of a USB to I2C converter form ncd.io
 */
var port = '/dev/tty.usbserial-DN03Q7F9';
var serial = new comms.NcdSerial('/dev/tty.usbserial-DN03Q7F9', 115200);
var comm = new comms.NcdSerialI2C(serial, 0);

/*
 * Use the native I2C port on the Raspberry Pi
 */
//var comm = new comms.NcdI2C(1);

/*
 * Initialize as a 16-channel relay board
 */
// 0 = output, 1 = input
var config = {};
for(var i=1;i<17;i++) config['io_'+i] = 1;

 var relay_board = new MCP23017(0x20, config, comm);

 var current_relay = 1;

 function switch_relay(){
	 relay_board.get().then((status) => {
		 //channel_1 is the first argument to set the first GPIO
		 var ch = 'channel_'+current_relay;

		 //a value of 1 will turn on an output, 0 will turn it off
		 //a 2 may be sent to togle the relay as well
		 var update = status[ch] == 1 ? 0 : 1;

		 relay_board.set(ch, update).then(() => {
			 if(current_relay == 16) current_relay = 1;
			 else current_relay++;
			 switch_relay();
		 }).catch(console.log);
	 }).catch(console.log);
 }
switch_relay();
