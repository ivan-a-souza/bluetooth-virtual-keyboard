const { execSync } = require('child_process');
const fs = require('fs');
const logger = require('../shared/logger');

class SystemCheck {
  constructor(devicePath) {
    this.devicePath = devicePath;
    this.results = [];
    this.hasErrors = false;
  }

  async run() {
    logger.log('=== System Check ===\n');

    this._checkNodeVersion();
    this._checkBluezInstalled();
    this._checkBluetoothService();
    this._checkBluetoothAdapter();
    this._checkDbusAvailable();

    if (this.devicePath) {
      this._checkDeviceAccess(this.devicePath);
    }

    logger.log('\n=== Results ===');
    for (const r of this.results) {
      const icon = r.ok ? '✅' : '❌';
      logger.log(`${icon} ${r.name}: ${r.message}`);
    }

    if (this.hasErrors) {
      logger.error('\nSome checks failed. Fix the issues above before running.');
    } else {
      logger.log('\n✅ All checks passed! You can run the keyboard.');
    }

    return !this.hasErrors;
  }

  _addResult(name, ok, message) {
    this.results.push({ name, ok, message });
    if (!ok) this.hasErrors = true;
  }

  _checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    if (major >= 18) {
      this._addResult('Node.js', true, `${version} (>= 18 required)`);
    } else {
      this._addResult('Node.js', false, `${version} — version 18+ required`);
    }
  }

  _checkBluezInstalled() {
    try {
      const output = execSync('bluetoothctl --version', { encoding: 'utf8', timeout: 5000 }).trim();
      this._addResult('BlueZ', true, output);
    } catch (_) {
      this._addResult('BlueZ', false, 'bluetoothctl not found. Install: sudo apt install bluez');
    }
  }

  _checkBluetoothService() {
    try {
      const output = execSync('systemctl is-active bluetooth', { encoding: 'utf8', timeout: 5000 }).trim();
      if (output === 'active') {
        this._addResult('Bluetooth Service', true, 'running');
      } else {
        this._addResult('Bluetooth Service', false, `status: ${output}. Run: sudo systemctl start bluetooth`);
      }
    } catch (_) {
      this._addResult('Bluetooth Service', false, 'not running. Run: sudo systemctl start bluetooth');
    }
  }

  _checkBluetoothAdapter() {
    try {
      const output = execSync('hciconfig', { encoding: 'utf8', timeout: 5000 });
      if (output.includes('hci0')) {
        const isUp = output.includes('UP RUNNING');
        if (isUp) {
          this._addResult('Bluetooth Adapter', true, 'hci0 found and UP');
        } else {
          this._addResult('Bluetooth Adapter', false, 'hci0 found but DOWN. Run: sudo hciconfig hci0 up');
        }
      } else {
        this._addResult('Bluetooth Adapter', false, 'no adapter found. Check rfkill or hardware.');
      }
    } catch (_) {
      // hciconfig may not be installed, try bluetoothctl
      try {
        const output = execSync('bluetoothctl list', { encoding: 'utf8', timeout: 5000 });
        if (output.trim().length > 0) {
          this._addResult('Bluetooth Adapter', true, 'adapter found via bluetoothctl');
        } else {
          this._addResult('Bluetooth Adapter', false, 'no adapter found');
        }
      } catch (_) {
        this._addResult('Bluetooth Adapter', false, 'unable to detect adapter');
      }
    }
  }

  _checkDbusAvailable() {
    try {
      const dbus = require('dbus-next');
      const bus = dbus.systemBus();
      bus.disconnect();
      this._addResult('D-Bus', true, 'system bus accessible');
    } catch (err) {
      this._addResult('D-Bus', false, `cannot connect: ${err.message}`);
    }
  }

  _checkDeviceAccess(path) {
    try {
      fs.accessSync(path, fs.constants.R_OK);
      this._addResult('Input Device', true, `${path} readable`);
    } catch (_) {
      this._addResult('Input Device', false, `${path} not accessible. Run with sudo or add user to 'input' group`);
    }
  }
}

module.exports = { SystemCheck };
