const { EventEmitter } = require('events');

// Mock fs before requiring the module
jest.mock('fs', () => ({
  createReadStream: jest.fn(),
}));

const fs = require('fs');
const { EvdevInputReader } = require('../../src/infrastructure/input/evdevInputReader');

describe('EvdevInputReader', () => {
  let reader;
  let mockStream;

  beforeEach(() => {
    mockStream = new EventEmitter();
    fs.createReadStream.mockReturnValue(mockStream);
    reader = new EvdevInputReader('/dev/input/event0');
  });

  describe('constructor', () => {
    it('should store the device path', () => {
      expect(reader.device).toBe('/dev/input/event0');
    });
  });

  describe('onKey()', () => {
    it('should store the callback', () => {
      const cb = jest.fn();
      reader.onKey(cb);
      expect(reader.cb).toBe(cb);
    });
  });

  describe('start()', () => {
    it('should create a read stream for the device', () => {
      reader.start();
      expect(fs.createReadStream).toHaveBeenCalledWith('/dev/input/event0', {
        highWaterMark: 24,
      });
    });

    it('should call callback with keycode and value on EV_KEY events', () => {
      const cb = jest.fn();
      reader.onKey(cb);
      reader.start();

      // Create a 24-byte evdev event buffer
      // struct input_event: timeval(16 bytes) + type(2) + code(2) + value(4)
      const chunk = Buffer.alloc(24);
      chunk.writeUInt16LE(1, 16);     // type = EV_KEY (1)
      chunk.writeUInt16LE(30, 18);    // code = KEY_A (30)
      chunk.writeInt32LE(1, 20);      // value = 1 (press)

      mockStream.emit('data', chunk);

      expect(cb).toHaveBeenCalledWith(30, 1);
    });

    it('should not call callback for non-EV_KEY events', () => {
      const cb = jest.fn();
      reader.onKey(cb);
      reader.start();

      const chunk = Buffer.alloc(24);
      chunk.writeUInt16LE(0, 16);     // type = EV_SYN (0), not EV_KEY
      chunk.writeUInt16LE(0, 18);
      chunk.writeInt32LE(0, 20);

      mockStream.emit('data', chunk);

      expect(cb).not.toHaveBeenCalled();
    });

    it('should not crash if no callback is set', () => {
      reader.start();

      const chunk = Buffer.alloc(24);
      chunk.writeUInt16LE(1, 16);
      chunk.writeUInt16LE(30, 18);
      chunk.writeInt32LE(1, 20);

      expect(() => mockStream.emit('data', chunk)).not.toThrow();
    });

    it('should handle key release events (value = 0)', () => {
      const cb = jest.fn();
      reader.onKey(cb);
      reader.start();

      const chunk = Buffer.alloc(24);
      chunk.writeUInt16LE(1, 16);
      chunk.writeUInt16LE(30, 18);
      chunk.writeInt32LE(0, 20);      // value = 0 (release)

      mockStream.emit('data', chunk);

      expect(cb).toHaveBeenCalledWith(30, 0);
    });

    it('should handle key repeat events (value = 2)', () => {
      const cb = jest.fn();
      reader.onKey(cb);
      reader.start();

      const chunk = Buffer.alloc(24);
      chunk.writeUInt16LE(1, 16);
      chunk.writeUInt16LE(30, 18);
      chunk.writeInt32LE(2, 20);      // value = 2 (repeat)

      mockStream.emit('data', chunk);

      expect(cb).toHaveBeenCalledWith(30, 2);
    });
  });
});
