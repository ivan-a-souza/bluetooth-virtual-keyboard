jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  accessSync: jest.fn(),
  constants: { R_OK: 4 },
}));

jest.mock('dbus-next', () => ({
  systemBus: jest.fn(),
}));

jest.mock('../../src/shared/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const { execSync } = require('child_process');
const fs = require('fs');
const dbus = require('dbus-next');
const { SystemCheck } = require('../../src/application/systemCheck');

describe('SystemCheck', () => {
  let checker;

  beforeEach(() => {
    jest.clearAllMocks();
    checker = new SystemCheck('/dev/input/event0');
  });

  describe('constructor', () => {
    it('should store devicePath', () => {
      expect(checker.devicePath).toBe('/dev/input/event0');
    });

    it('should handle undefined devicePath', () => {
      const c = new SystemCheck();
      expect(c.devicePath).toBeUndefined();
    });

    it('should initialize results empty', () => {
      expect(checker.results).toEqual([]);
    });

    it('should initialize hasErrors as false', () => {
      expect(checker.hasErrors).toBe(false);
    });
  });

  describe('run()', () => {
    beforeEach(() => {
      // Setup all checks to pass by default
      execSync.mockImplementation((cmd) => {
        if (cmd === 'bluetoothctl --version') return 'bluetoothctl: 5.55';
        if (cmd === 'systemctl is-active bluetooth') return 'active';
        if (cmd === 'hciconfig') return 'hci0: ... UP RUNNING ...';
        return '';
      });
      dbus.systemBus.mockReturnValue({ disconnect: jest.fn() });
      fs.accessSync.mockReturnValue(undefined);
    });

    it('should return true when all checks pass', async () => {
      const result = await checker.run();
      expect(result).toBe(true);
    });

    it('should return false when any check fails', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'bluetoothctl --version') throw new Error('not found');
        if (cmd === 'systemctl is-active bluetooth') return 'active';
        if (cmd === 'hciconfig') return 'hci0: ... UP RUNNING ...';
        return '';
      });

      const result = await checker.run();
      expect(result).toBe(false);
    });

    it('should skip device check when devicePath is not set', async () => {
      const c = new SystemCheck();
      const result = await c.run();
      expect(fs.accessSync).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('_checkNodeVersion()', () => {
    it('should pass for Node 18+', () => {
      checker._checkNodeVersion();
      const result = checker.results.find(r => r.name === 'Node.js');
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('should fail for Node < 18', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v16.20.0', configurable: true });
      checker._checkNodeVersion();
      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
      const result = checker.results.find(r => r.name === 'Node.js');
      expect(result.ok).toBe(false);
      expect(result.message).toContain('version 18+ required');
    });
  });

  describe('_checkBluezInstalled()', () => {
    it('should pass when bluetoothctl is found', () => {
      execSync.mockReturnValue('bluetoothctl: 5.55');
      checker._checkBluezInstalled();
      const result = checker.results.find(r => r.name === 'BlueZ');
      expect(result.ok).toBe(true);
    });

    it('should fail when bluetoothctl is not found', () => {
      execSync.mockImplementation(() => { throw new Error('not found'); });
      checker._checkBluezInstalled();
      const result = checker.results.find(r => r.name === 'BlueZ');
      expect(result.ok).toBe(false);
    });
  });

  describe('_checkBluetoothService()', () => {
    it('should pass when service is active', () => {
      execSync.mockReturnValue('active');
      checker._checkBluetoothService();
      const result = checker.results.find(r => r.name === 'Bluetooth Service');
      expect(result.ok).toBe(true);
    });

    it('should fail when service is inactive', () => {
      execSync.mockReturnValue('inactive');
      checker._checkBluetoothService();
      const result = checker.results.find(r => r.name === 'Bluetooth Service');
      expect(result.ok).toBe(false);
    });

    it('should fail when systemctl throws', () => {
      execSync.mockImplementation(() => { throw new Error('failed'); });
      checker._checkBluetoothService();
      const result = checker.results.find(r => r.name === 'Bluetooth Service');
      expect(result.ok).toBe(false);
    });
  });

  describe('_checkBluetoothAdapter()', () => {
    it('should pass when hci0 is UP RUNNING', () => {
      execSync.mockReturnValue('hci0:\n\tBD Address: ... UP RUNNING');
      checker._checkBluetoothAdapter();
      const result = checker.results.find(r => r.name === 'Bluetooth Adapter');
      expect(result.ok).toBe(true);
    });

    it('should fail when hci0 is found but DOWN', () => {
      execSync.mockReturnValue('hci0:\n\tBD Address: ... DOWN');
      checker._checkBluetoothAdapter();
      const result = checker.results.find(r => r.name === 'Bluetooth Adapter');
      expect(result.ok).toBe(false);
    });

    it('should fail when no adapter found via hciconfig', () => {
      execSync.mockReturnValue('');
      checker._checkBluetoothAdapter();
      const result = checker.results.find(r => r.name === 'Bluetooth Adapter');
      expect(result.ok).toBe(false);
    });

    it('should fallback to bluetoothctl when hciconfig throws', () => {
      let callCount = 0;
      execSync.mockImplementation((cmd) => {
        if (cmd === 'hciconfig') throw new Error('not found');
        if (cmd === 'bluetoothctl list') return 'Controller XX:XX:XX:XX:XX:XX MachineController';
        return '';
      });
      checker._checkBluetoothAdapter();
      const result = checker.results.find(r => r.name === 'Bluetooth Adapter');
      expect(result.ok).toBe(true);
    });

    it('should fail when both hciconfig and bluetoothctl fail', () => {
      execSync.mockImplementation(() => { throw new Error('not found'); });
      checker._checkBluetoothAdapter();
      const result = checker.results.find(r => r.name === 'Bluetooth Adapter');
      expect(result.ok).toBe(false);
    });

    it('should fail when bluetoothctl list returns empty', () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'hciconfig') throw new Error('not found');
        if (cmd === 'bluetoothctl list') return '';
        return '';
      });
      checker._checkBluetoothAdapter();
      const result = checker.results.find(r => r.name === 'Bluetooth Adapter');
      expect(result.ok).toBe(false);
    });
  });

  describe('_checkDbusAvailable()', () => {
    it('should pass when D-Bus is accessible', () => {
      dbus.systemBus.mockReturnValue({ disconnect: jest.fn() });
      checker._checkDbusAvailable();
      const result = checker.results.find(r => r.name === 'D-Bus');
      expect(result.ok).toBe(true);
    });

    it('should fail when D-Bus connection throws', () => {
      dbus.systemBus.mockImplementation(() => { throw new Error('connection refused'); });
      checker._checkDbusAvailable();
      const result = checker.results.find(r => r.name === 'D-Bus');
      expect(result.ok).toBe(false);
    });
  });

  describe('_checkDeviceAccess()', () => {
    it('should pass when device is readable', () => {
      fs.accessSync.mockReturnValue(undefined);
      checker._checkDeviceAccess('/dev/input/event0');
      const result = checker.results.find(r => r.name === 'Input Device');
      expect(result.ok).toBe(true);
    });

    it('should fail when device is not accessible', () => {
      fs.accessSync.mockImplementation(() => { throw new Error('EACCES'); });
      checker._checkDeviceAccess('/dev/input/event0');
      const result = checker.results.find(r => r.name === 'Input Device');
      expect(result.ok).toBe(false);
    });
  });

  describe('_addResult()', () => {
    it('should add result to results array', () => {
      checker._addResult('Test', true, 'ok');
      expect(checker.results.length).toBe(1);
      expect(checker.results[0]).toEqual({ name: 'Test', ok: true, message: 'ok' });
    });

    it('should set hasErrors when result is not ok', () => {
      checker._addResult('Test', false, 'fail');
      expect(checker.hasErrors).toBe(true);
    });

    it('should not set hasErrors when result is ok', () => {
      checker._addResult('Test', true, 'ok');
      expect(checker.hasErrors).toBe(false);
    });
  });
});
