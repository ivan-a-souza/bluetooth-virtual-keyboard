const keymap = require('../../src/domain/linuxKeyMap');

describe('linuxKeyMap', () => {
  it('should export an object', () => {
    expect(typeof keymap).toBe('object');
  });

  it('should have MODIFIER constants', () => {
    expect(keymap.MODIFIER).toBeDefined();
    expect(keymap.MODIFIER.LEFT_CTRL).toBe(0x01);
    expect(keymap.MODIFIER.LEFT_SHIFT).toBe(0x02);
    expect(keymap.MODIFIER.LEFT_ALT).toBe(0x04);
    expect(keymap.MODIFIER.LEFT_GUI).toBe(0x08);
    expect(keymap.MODIFIER.RIGHT_CTRL).toBe(0x10);
    expect(keymap.MODIFIER.RIGHT_SHIFT).toBe(0x20);
    expect(keymap.MODIFIER.RIGHT_ALT).toBe(0x40);
    expect(keymap.MODIFIER.RIGHT_GUI).toBe(0x80);
  });

  describe('letter keys (A-Z)', () => {
    const letters = {
      30: 0x04, // A
      48: 0x05, // B
      46: 0x06, // C
      32: 0x07, // D
      18: 0x08, // E
      33: 0x09, // F
      34: 0x0a, // G
      35: 0x0b, // H
      23: 0x0c, // I
      36: 0x0d, // J
      37: 0x0e, // K
      38: 0x0f, // L
      50: 0x10, // M
      49: 0x11, // N
      24: 0x12, // O
      25: 0x13, // P
      16: 0x14, // Q
      19: 0x15, // R
      31: 0x16, // S
      20: 0x17, // T
      22: 0x18, // U
      47: 0x19, // V
      17: 0x1a, // W
      45: 0x1b, // X
      21: 0x1c, // Y
      44: 0x1d, // Z
    };

    it.each(Object.entries(letters))('linux code %s should map to HID 0x%s', (linux, hid) => {
      expect(keymap[linux]).toBeDefined();
      expect(keymap[linux].hid).toBe(hid);
      expect(keymap[linux].modifier).toBeUndefined();
    });
  });

  describe('number keys (0-9)', () => {
    const numbers = {
      2: 0x1e,  // 1
      3: 0x1f,  // 2
      4: 0x20,  // 3
      5: 0x21,  // 4
      6: 0x22,  // 5
      7: 0x23,  // 6
      8: 0x24,  // 7
      9: 0x25,  // 8
      10: 0x26, // 9
      11: 0x27, // 0
    };

    it.each(Object.entries(numbers))('linux code %s should map to HID 0x%s', (linux, hid) => {
      expect(keymap[linux]).toBeDefined();
      expect(keymap[linux].hid).toBe(hid);
    });
  });

  describe('modifier keys', () => {
    it('should map Left Shift with modifier bitmask', () => {
      expect(keymap[42].hid).toBe(0xe1);
      expect(keymap[42].modifier).toBe(keymap.MODIFIER.LEFT_SHIFT);
    });

    it('should map Right Shift with modifier bitmask', () => {
      expect(keymap[54].hid).toBe(0xe5);
      expect(keymap[54].modifier).toBe(keymap.MODIFIER.RIGHT_SHIFT);
    });

    it('should map Left Ctrl with modifier bitmask', () => {
      expect(keymap[29].hid).toBe(0xe0);
      expect(keymap[29].modifier).toBe(keymap.MODIFIER.LEFT_CTRL);
    });

    it('should map Right Ctrl with modifier bitmask', () => {
      expect(keymap[97].hid).toBe(0xe4);
      expect(keymap[97].modifier).toBe(keymap.MODIFIER.RIGHT_CTRL);
    });

    it('should map Left Alt with modifier bitmask', () => {
      expect(keymap[56].hid).toBe(0xe2);
      expect(keymap[56].modifier).toBe(keymap.MODIFIER.LEFT_ALT);
    });

    it('should map Right Alt with modifier bitmask', () => {
      expect(keymap[100].hid).toBe(0xe6);
      expect(keymap[100].modifier).toBe(keymap.MODIFIER.RIGHT_ALT);
    });

    it('should map Left GUI with modifier bitmask', () => {
      expect(keymap[125].hid).toBe(0xe3);
      expect(keymap[125].modifier).toBe(keymap.MODIFIER.LEFT_GUI);
    });
  });

  describe('special keys', () => {
    it('should map Escape', () => {
      expect(keymap[1].hid).toBe(0x29);
    });

    it('should map Enter', () => {
      expect(keymap[28].hid).toBe(0x28);
    });

    it('should map Backspace', () => {
      expect(keymap[14].hid).toBe(0x2a);
    });

    it('should map Tab', () => {
      expect(keymap[15].hid).toBe(0x2b);
    });

    it('should map Space', () => {
      expect(keymap[57].hid).toBe(0x2c);
    });

    it('should map Caps Lock', () => {
      expect(keymap[58].hid).toBe(0x39);
    });
  });

  describe('F-keys', () => {
    it('should map F1-F12', () => {
      expect(keymap[59].hid).toBe(0x3a);
      expect(keymap[60].hid).toBe(0x3b);
      expect(keymap[61].hid).toBe(0x3c);
      expect(keymap[62].hid).toBe(0x3d);
      expect(keymap[63].hid).toBe(0x3e);
      expect(keymap[64].hid).toBe(0x3f);
      expect(keymap[65].hid).toBe(0x40);
      expect(keymap[66].hid).toBe(0x41);
      expect(keymap[67].hid).toBe(0x42);
      expect(keymap[68].hid).toBe(0x43);
      expect(keymap[87].hid).toBe(0x44);
      expect(keymap[88].hid).toBe(0x45);
    });
  });

  describe('arrow keys', () => {
    it('should map arrow keys', () => {
      expect(keymap[103].hid).toBe(0x52); // Up
      expect(keymap[108].hid).toBe(0x51); // Down
      expect(keymap[105].hid).toBe(0x50); // Left
      expect(keymap[106].hid).toBe(0x4f); // Right
    });
  });

  describe('all entries have valid HID codes', () => {
    it('should have hid property for every entry', () => {
      const entries = Object.entries(keymap).filter(([k]) => k !== 'MODIFIER');
      for (const [code, val] of entries) {
        expect(val.hid).toBeDefined();
        expect(typeof val.hid).toBe('number');
        expect(val.hid).toBeGreaterThan(0);
        expect(val.hid).toBeLessThanOrEqual(0xff);
      }
    });
  });
});
