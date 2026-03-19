// Maps Linux evdev keycodes to HID usage codes
// See: https://www.usb.org/sites/default/files/documents/hut1_12v2.pdf (Table 12)
// Linux keycodes: /usr/include/linux/input-event-codes.h
//
// Format: linuxKeycode: { hid: hidUsageCode, modifier?: bitMask }
// modifier is set for Ctrl/Shift/Alt/GUI keys (byte 0 of HID report)

const MODIFIER = {
  LEFT_CTRL:   0x01,
  LEFT_SHIFT:  0x02,
  LEFT_ALT:    0x04,
  LEFT_GUI:    0x08,
  RIGHT_CTRL:  0x10,
  RIGHT_SHIFT: 0x20,
  RIGHT_ALT:   0x40,
  RIGHT_GUI:   0x80,
};

const keyMap = {
  // Row 1: Escape + F-keys
  1:   { hid: 0x29 },  // ESC
  59:  { hid: 0x3a },  // F1
  60:  { hid: 0x3b },  // F2
  61:  { hid: 0x3c },  // F3
  62:  { hid: 0x3d },  // F4
  63:  { hid: 0x3e },  // F5
  64:  { hid: 0x3f },  // F6
  65:  { hid: 0x40 },  // F7
  66:  { hid: 0x41 },  // F8
  67:  { hid: 0x42 },  // F9
  68:  { hid: 0x43 },  // F10
  87:  { hid: 0x44 },  // F11
  88:  { hid: 0x45 },  // F12

  // Row 2: Numbers
  41:  { hid: 0x35 },  // ` (grave/tilde)
  2:   { hid: 0x1e },  // 1
  3:   { hid: 0x1f },  // 2
  4:   { hid: 0x20 },  // 3
  5:   { hid: 0x21 },  // 4
  6:   { hid: 0x22 },  // 5
  7:   { hid: 0x23 },  // 6
  8:   { hid: 0x24 },  // 7
  9:   { hid: 0x25 },  // 8
  10:  { hid: 0x26 },  // 9
  11:  { hid: 0x27 },  // 0
  12:  { hid: 0x2d },  // - (minus)
  13:  { hid: 0x2e },  // = (equal)
  14:  { hid: 0x2a },  // Backspace

  // Row 3: Tab + QWERTY
  15:  { hid: 0x2b },  // Tab
  16:  { hid: 0x14 },  // Q
  17:  { hid: 0x1a },  // W
  18:  { hid: 0x08 },  // E
  19:  { hid: 0x15 },  // R
  20:  { hid: 0x17 },  // T
  21:  { hid: 0x1c },  // Y
  22:  { hid: 0x18 },  // U
  23:  { hid: 0x0c },  // I
  24:  { hid: 0x12 },  // O
  25:  { hid: 0x13 },  // P
  26:  { hid: 0x2f },  // [ (left bracket)
  27:  { hid: 0x30 },  // ] (right bracket)
  43:  { hid: 0x31 },  // \ (backslash)

  // Row 4: CapsLock + ASDF
  58:  { hid: 0x39 },  // Caps Lock
  30:  { hid: 0x04 },  // A
  31:  { hid: 0x16 },  // S
  32:  { hid: 0x07 },  // D
  33:  { hid: 0x09 },  // F
  34:  { hid: 0x0a },  // G
  35:  { hid: 0x0b },  // H
  36:  { hid: 0x0d },  // J
  37:  { hid: 0x0e },  // K
  38:  { hid: 0x0f },  // L
  39:  { hid: 0x33 },  // ; (semicolon)
  40:  { hid: 0x34 },  // ' (apostrophe)
  28:  { hid: 0x28 },  // Enter

  // Row 5: Shift + ZXCV
  42:  { hid: 0xe1, modifier: MODIFIER.LEFT_SHIFT },   // Left Shift
  44:  { hid: 0x1d },  // Z
  45:  { hid: 0x1b },  // X
  46:  { hid: 0x06 },  // C
  47:  { hid: 0x19 },  // V
  48:  { hid: 0x05 },  // B
  49:  { hid: 0x11 },  // N
  50:  { hid: 0x10 },  // M
  51:  { hid: 0x36 },  // , (comma)
  52:  { hid: 0x37 },  // . (period)
  53:  { hid: 0x38 },  // / (slash)
  54:  { hid: 0xe5, modifier: MODIFIER.RIGHT_SHIFT },  // Right Shift

  // Row 6: Ctrl, Alt, Space, etc.
  29:  { hid: 0xe0, modifier: MODIFIER.LEFT_CTRL },    // Left Ctrl
  125: { hid: 0xe3, modifier: MODIFIER.LEFT_GUI },     // Left Super/Windows
  56:  { hid: 0xe2, modifier: MODIFIER.LEFT_ALT },     // Left Alt
  57:  { hid: 0x2c },  // Space
  100: { hid: 0xe6, modifier: MODIFIER.RIGHT_ALT },    // Right Alt
  127: { hid: 0x65 },  // Menu/Compose
  97:  { hid: 0xe4, modifier: MODIFIER.RIGHT_CTRL },   // Right Ctrl

  // Arrow keys
  103: { hid: 0x52 },  // Up
  108: { hid: 0x51 },  // Down
  105: { hid: 0x50 },  // Left
  106: { hid: 0x4f },  // Right

  // Navigation cluster
  110: { hid: 0x49 },  // Insert
  111: { hid: 0x4c },  // Delete
  102: { hid: 0x4a },  // Home
  107: { hid: 0x4d },  // End
  104: { hid: 0x4b },  // Page Up
  109: { hid: 0x4e },  // Page Down

  // Above arrows
  99:  { hid: 0x46 },  // Print Screen
  70:  { hid: 0x47 },  // Scroll Lock
  119: { hid: 0x48 },  // Pause/Break

  // Numpad
  69:  { hid: 0x53 },  // Num Lock
  98:  { hid: 0x54 },  // Numpad /
  55:  { hid: 0x55 },  // Numpad *
  74:  { hid: 0x56 },  // Numpad -
  78:  { hid: 0x57 },  // Numpad +
  96:  { hid: 0x58 },  // Numpad Enter
  82:  { hid: 0x62 },  // Numpad 0
  79:  { hid: 0x59 },  // Numpad 1
  80:  { hid: 0x5a },  // Numpad 2
  81:  { hid: 0x5b },  // Numpad 3
  75:  { hid: 0x5c },  // Numpad 4
  76:  { hid: 0x5d },  // Numpad 5
  77:  { hid: 0x5e },  // Numpad 6
  71:  { hid: 0x5f },  // Numpad 7
  72:  { hid: 0x60 },  // Numpad 8
  73:  { hid: 0x61 },  // Numpad 9
  83:  { hid: 0x63 },  // Numpad .
};

keyMap.MODIFIER = MODIFIER;

module.exports = keyMap;