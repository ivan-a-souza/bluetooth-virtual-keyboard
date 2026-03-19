const fs = require('fs');

class EvdevInputReader {
  constructor(device) {
    this.device = device;
  }

  onKey(cb) {
    this.cb = cb;
  }

  start() {
    const stream = fs.createReadStream(this.device, { highWaterMark: 24 });

    stream.on('data', (chunk) => {
      const type = chunk.readUInt16LE(16);
      const code = chunk.readUInt16LE(18);
      const value = chunk.readInt32LE(20);

      if (type === 1 && this.cb) {
        this.cb(code, value);
      }
    });
  }
}

module.exports = { EvdevInputReader };
