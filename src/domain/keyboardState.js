// Maintains the state of pressed keys and builds HID input reports.
//
// HID Boot Keyboard Report format (8 bytes):
//   Byte 0: Modifier bitmask (Ctrl, Shift, Alt, GUI)
//   Byte 1: Reserved (0x00)
//   Bytes 2-7: Up to 6 simultaneous key codes
//
// Modifier bits:
//   bit 0 = Left Ctrl,  bit 1 = Left Shift,  bit 2 = Left Alt,  bit 3 = Left GUI
//   bit 4 = Right Ctrl, bit 5 = Right Shift, bit 6 = Right Alt, bit 7 = Right GUI

const MAX_KEYS = 6;

class KeyboardState {
  constructor() {
    this.keys = new Set();
    this.modifiers = 0;
  }

  press(hidCode, modifier) {
    if (modifier) {
      this.modifiers |= modifier;
    } else {
      this.keys.add(hidCode);
    }
  }

  release(hidCode, modifier) {
    if (modifier) {
      this.modifiers &= ~modifier;
    } else {
      this.keys.delete(hidCode);
    }
  }

  buildReport() {
    const buf = Buffer.alloc(8);
    buf[0] = this.modifiers;
    // buf[1] = 0x00; // reserved
    let i = 2;
    for (const k of this.keys) {
      if (i >= 2 + MAX_KEYS) break;
      buf[i++] = k;
    }
    return buf;
  }

  reset() {
    this.keys.clear();
    this.modifiers = 0;
  }
}

module.exports = { KeyboardState, MAX_KEYS };
