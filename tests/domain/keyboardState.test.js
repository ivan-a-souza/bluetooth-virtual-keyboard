const { KeyboardState, MAX_KEYS } = require('../../src/domain/keyboardState');

describe('KeyboardState', () => {
  let state;

  beforeEach(() => {
    state = new KeyboardState();
  });

  describe('initial state', () => {
    it('should start with empty keys and zero modifiers', () => {
      expect(state.keys.size).toBe(0);
      expect(state.modifiers).toBe(0);
    });
  });

  describe('press()', () => {
    it('should add a regular key', () => {
      state.press(0x04); // 'a'
      expect(state.keys.has(0x04)).toBe(true);
    });

    it('should set modifier bitmask when modifier is provided', () => {
      state.press(0xe1, 0x02); // Left Shift
      expect(state.modifiers).toBe(0x02);
      expect(state.keys.has(0xe1)).toBe(false);
    });

    it('should combine multiple modifiers', () => {
      state.press(0xe0, 0x01); // Left Ctrl
      state.press(0xe1, 0x02); // Left Shift
      expect(state.modifiers).toBe(0x03);
    });

    it('should add key without modifier when modifier is undefined', () => {
      state.press(0x04, undefined);
      expect(state.keys.has(0x04)).toBe(true);
      expect(state.modifiers).toBe(0);
    });

    it('should add key without modifier when modifier is 0', () => {
      state.press(0x04, 0);
      expect(state.keys.has(0x04)).toBe(true);
      expect(state.modifiers).toBe(0);
    });
  });

  describe('release()', () => {
    it('should remove a regular key', () => {
      state.press(0x04);
      state.release(0x04);
      expect(state.keys.has(0x04)).toBe(false);
    });

    it('should clear modifier bitmask', () => {
      state.press(0xe0, 0x01); // Left Ctrl
      state.press(0xe1, 0x02); // Left Shift
      state.release(0xe0, 0x01);
      expect(state.modifiers).toBe(0x02);
    });

    it('should handle releasing a key that was never pressed', () => {
      state.release(0x04);
      expect(state.keys.has(0x04)).toBe(false);
    });

    it('should handle releasing modifier when modifier is undefined', () => {
      state.release(0x04, undefined);
      expect(state.keys.has(0x04)).toBe(false);
    });

    it('should handle releasing modifier when modifier is 0', () => {
      state.modifiers = 0x03;
      state.release(0x04, 0);
      // modifier 0 is falsy, so key should be deleted from keys set
      expect(state.modifiers).toBe(0x03);
    });
  });

  describe('buildReport()', () => {
    it('should return 8-byte buffer', () => {
      const report = state.buildReport();
      expect(report.length).toBe(8);
    });

    it('should have modifiers in byte 0', () => {
      state.press(0xe0, 0x01); // Left Ctrl
      const report = state.buildReport();
      expect(report[0]).toBe(0x01);
    });

    it('should have reserved 0x00 in byte 1', () => {
      state.press(0x04);
      const report = state.buildReport();
      expect(report[1]).toBe(0x00);
    });

    it('should have key codes starting at byte 2', () => {
      state.press(0x04); // 'a'
      const report = state.buildReport();
      expect(report[2]).toBe(0x04);
    });

    it('should limit to MAX_KEYS (6) keys', () => {
      for (let i = 0; i < 8; i++) {
        state.press(0x04 + i);
      }
      const report = state.buildReport();

      // Only first 6 keys should be in the report
      let keyCount = 0;
      for (let i = 2; i < 8; i++) {
        if (report[i] !== 0) keyCount++;
      }
      expect(keyCount).toBe(MAX_KEYS);
    });

    it('should include both modifiers and keys', () => {
      state.press(0xe1, 0x02); // Left Shift
      state.press(0x04);       // 'a'
      const report = state.buildReport();
      expect(report[0]).toBe(0x02); // modifier
      expect(report[2]).toBe(0x04); // key
    });
  });

  describe('reset()', () => {
    it('should clear all keys and modifiers', () => {
      state.press(0x04);
      state.press(0xe1, 0x02);
      state.reset();
      expect(state.keys.size).toBe(0);
      expect(state.modifiers).toBe(0);
    });
  });

  describe('MAX_KEYS', () => {
    it('should be 6', () => {
      expect(MAX_KEYS).toBe(6);
    });
  });
});
