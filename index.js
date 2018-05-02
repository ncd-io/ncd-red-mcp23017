module.exports = class MCP23017{
	constructor(addr, config, comm){
		this.data = config;
		this.comm = comm;
		this.addr = addr;
		this.settable = [];
		this.iodir = 0;
		this.data.ios = {};
		for(var i=16;i>0;i--){
			this.iodir = (this.iodir << 1) | (this.data["io_"+i] ? 0 : 1);
			this.data.ios[i] = this.data["io_"+i] ? 1 : 0;
		}
		this.settable = ['all', 'channel_1', 'channel_2', 'channel_3', 'channel_4', 'channel_5', 'channel_6', 'channel_7', 'channel_8', 'channel_9', 'channel_10', 'channel_11', 'channel_12', 'channel_13', 'channel_14', 'channel_15', 'channel_16'];
	}
	init(){
		var b1 = this.iodir & 255;
		var b2 = this.iodir >> 8;

		Promise.all([
			this.comm.writeBytes(this.addr, 0, b1, b2),
			this.comm.writeBytes(this.addr, 12, b1, b2),
			this.get()
		]).then((r) => {
			this.initialized = true;
		}).catch((e) => {
			this.initialized = false;
		});
	}
	get(){
		var sensor = this;
		return new Promise((fulfill, reject) => {
			sensor.comm.readBytes(sensor.addr, 18, 2).then((res) => {
				var status = (res[1] << 8) | res[0];
				sensor.input_status = status & this.iodir;
				sensor.output_status = status & (~this.iodir);
				fulfill(sensor.parseStatus());
			}).catch((e) => {
				sensor.initialized = false;
				reject(e);
			});
		});
	}
	parseStatus(){
		var ios = this.data.ios,
			readings = {};
		for(var i in ios){
			if(ios[i] == 1) readings["channel_"+i] = this.output_status & (1 << (i-1)) ? 1 : 0;
			else readings["channel_"+i] = this.input_status & (1 << (i-1)) ? 0 : 1;
		}
		return readings;
	}
	set(topic, value){
		var sensor = this;
		return new Promise((fulfill, reject) => {
				function uninit(e){
					sensor.initialized = false;
					reject(e);
				}
				var status = sensor.output_status;
				if(topic == 'all'){
					if(status != value){
						sensor.output_status = value;
						sensor.comm.writeBytes(this.addr, 18, value & 255, value >> 8).then(fulfill(sensor.parseStatus())).catch(uninit);
					}else{
						fulfill(sensor.parseStatus());
					}
				}else{
					var mask = (1 << (topic.split('_')[1] - 1));
					if(value == 1){
						status |= mask;
					}else if(value == 2){
						status ^= mask;
					}else{
						status &= ~mask;
					}
					if(sensor.output_status != status){
						sensor.output_status = status;
						sensor.comm.writeBytes(sensor.addr, 18, status & 255, status >> 8).then(fulfill(sensor.parseStatus())).catch(uninit);
					}else{
						fulfill(sensor.parseStatus());
					}
				}
		});
	}
}
