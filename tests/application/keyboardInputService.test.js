const { KeyboardInputService } = require('../../src/application/keyboardInputService');

// Mock logger
jest.mock('../../src/shared/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('KeyboardInputService', () => {
  let mockReader;
  let mockBt;
  let service;

  beforeEach(() => {
    mockReader = {
      onKey: jest.fn(),
      start: jest.fn(),
    };
    mockBt = {
      start: jest.fn().mockResolvedValue(),
      send: jest.fn(),
      stop: jest.fn(),
    };
    service = new KeyboardInputService(mockReader, mockBt);
  });

  describe('constructor', () => {
    it('should store reader and bt', () => {
      expect(service.reader).toBe(mockReader);
      expect(service.bt).toBe(mockBt);
    });

    it('should create a KeyboardState', () => {
      expect(service.state).toBeDefined();
      expect(service.state.keys).toBeInstanceOf(Set);
    });
  });

  describe('start()', () => {
    it('should call bt.start()', async () => {
      await service.start();
      expect(mockBt.start).toHaveBeenCalled();
    });

    it('should register a key callback on reader', async () => {
      await service.start();
      expect(mockReader.onKey).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call reader.start()', async () => {
      await service.start();
      expect(mockReader.start).toHaveBeenCalled();
    });

    it('should send HID report on key press (known key)', async () => {
      await service.start();
      const cb = mockReader.onKey.mock.calls[0][0];

      // Linux keycode 30 = 'a' (HID 0x04), value 1 = press
      cb(30, 1);

      expect(mockBt.send).toHaveBeenCalledWith(expect.any(Buffer));
      const report = mockBt.send.mock.calls[0][0];
      expect(report[2]).toBe(0x04);
    });

    it('should send HID report on key release (known key)', async () => {
      await service.start();
      const cb = mockReader.onKey.mock.calls[0][0];

      cb(30, 1); // press
      cb(30, 0); // release

      const lastReport = mockBt.send.mock.calls[mockBt.send.mock.calls.length - 1][0];
      expect(lastReport[2]).toBe(0x00); // key released
    });

    it('should handle modifier keys', async () => {
      await service.start();
      const cb = mockReader.onKey.mock.calls[0][0];

      // Linux keycode 42 = Left Shift (modifier 0x02)
      cb(42, 1);

      const report = mockBt.send.mock.calls[0][0];
      expect(report[0]).toBe(0x02); // Left Shift modifier
    });

    it('should handle modifier key release', async () => {
      await service.start();
      const cb = mockReader.onKey.mock.calls[0][0];

      cb(42, 1); // shift press
      cb(42, 0); // shift release

      const lastReport = mockBt.send.mock.calls[mockBt.send.mock.calls.length - 1][0];
      expect(lastReport[0]).toBe(0x00);
    });

    it('should ignore unknown keycodes', async () => {
      await service.start();
      const cb = mockReader.onKey.mock.calls[0][0];

      cb(9999, 1); // unknown

      expect(mockBt.send).not.toHaveBeenCalled();
    });

    it('should send report on key repeat (value === 2)', async () => {
      await service.start();
      const cb = mockReader.onKey.mock.calls[0][0];

      cb(30, 1); // press
      mockBt.send.mockClear();

      cb(30, 2); // repeat
      expect(mockBt.send).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should reset state and stop bt', () => {
      service.state.press(0x04);
      service.state.press(0xe1, 0x02);
      service.stop();

      expect(service.state.keys.size).toBe(0);
      expect(service.state.modifiers).toBe(0);
      expect(mockBt.stop).toHaveBeenCalled();
    });
  });
});
