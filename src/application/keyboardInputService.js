const { KeyboardState } = require('../domain/keyboardState');
const keymap = require('../domain/linuxKeyMap');
const logger = require('../shared/logger');

class KeyboardInputService {
  constructor(reader, bt) {
    this.reader = reader;
    this.bt = bt;
    this.state = new KeyboardState();
  }

  async start() {
    await this.bt.start();

    this.reader.onKey((code, value) => {
      const map = keymap[code];
      if (!map) return;

      if (value === 1) {
        // Key press
        this.state.press(map.hid, map.modifier);
      } else if (value === 0) {
        // Key release
        this.state.release(map.hid, map.modifier);
      }
      // value === 2 means key repeat — we send the same report again

      const report = this.state.buildReport();
      this.bt.send(report);
    });

    this.reader.start();
    logger.log('Keyboard input service started');
  }

  stop() {
    this.state.reset();
    this.bt.stop();
  }
}

module.exports = { KeyboardInputService };
