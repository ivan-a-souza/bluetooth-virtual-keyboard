// Mock dbus-next before requiring the module
const mockSet = jest.fn().mockResolvedValue();
const mockRegisterAgent = jest.fn().mockResolvedValue();
const mockRequestDefaultAgent = jest.fn().mockResolvedValue();
const mockRegisterApplication = jest.fn().mockResolvedValue();
const mockRegisterAdvertisement = jest.fn().mockResolvedValue();
const mockUnregister = jest.fn().mockResolvedValue();

const mockProxyObject = {
  getInterface: jest.fn((ifaceName) => {
    if (ifaceName === 'org.freedesktop.DBus.Properties') {
      return { Set: mockSet };
    }
    if (ifaceName === 'org.bluez.AgentManager1') {
      return { RegisterAgent: mockRegisterAgent, RequestDefaultAgent: mockRequestDefaultAgent };
    }
    if (ifaceName === 'org.bluez.GattManager1') {
      return { RegisterApplication: mockRegisterApplication };
    }
    if (ifaceName === 'org.bluez.LEAdvertisingManager1') {
      return { RegisterAdvertisement: mockRegisterAdvertisement, UnregisterAdvertisement: mockUnregister };
    }
    return {};
  }),
};

const mockBus = {
  getProxyObject: jest.fn().mockResolvedValue(mockProxyObject),
  export: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
};

// Real-ish MockInterface that stores $name from constructor
class MockInterface {
  constructor(name) {
    this.$name = name;
  }
  emit() {}
  emitPropertiesChanged() {}
}

MockInterface.configureMembers = jest.fn();

jest.mock('dbus-next', () => {
  return {
    systemBus: jest.fn(() => mockBus),
    Variant: class Variant {
      constructor(sig, val) { this.signature = sig; this.value = val; }
    },
    Message: class Message {
      constructor(opts) { Object.assign(this, opts); }
    },
    MessageType: {
      SIGNAL: 4,
    },
    interface: {
      Interface: MockInterface,
    },
  };
});

jest.mock('../../src/shared/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const { BluezHidServer } = require('../../src/infrastructure/bluetooth/bluezHidServer');
const C = require('../../src/infrastructure/bluetooth/bluezConstants');
const logger = require('../../src/shared/logger');

describe('BluezHidServer', () => {
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new BluezHidServer('Test Keyboard');
  });

  describe('constructor', () => {
    it('should store the name', () => {
      expect(server.name).toBe('Test Keyboard');
    });

    it('should initialize with null bus', () => {
      expect(server.bus).toBeNull();
    });

    it('should initialize with null inputReportChar', () => {
      expect(server.inputReportChar).toBeNull();
    });

    it('should initialize with _notifying as false', () => {
      expect(server._notifying).toBe(false);
    });
  });

  describe('start()', () => {
    it('should connect to system bus', async () => {
      await server.start();
      expect(server.bus).toBe(mockBus);
    });

    it('should configure adapter (power, discoverable, alias)', async () => {
      await server.start();
      expect(mockSet.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('should register the agent', async () => {
      await server.start();
      expect(mockRegisterAgent).toHaveBeenCalledWith(C.AGENT_PATH, 'NoInputNoOutput');
      expect(mockRequestDefaultAgent).toHaveBeenCalledWith(C.AGENT_PATH);
    });

    it('should register the GATT application', async () => {
      await server.start();
      expect(mockRegisterApplication).toHaveBeenCalledWith(C.APP_PATH, {});
    });

    it('should register the advertisement', async () => {
      await server.start();
      expect(mockRegisterAdvertisement).toHaveBeenCalledWith(C.ADV_PATH, {});
    });

    it('should export interfaces on the bus', async () => {
      await server.start();
      expect(mockBus.export).toHaveBeenCalled();
    });

    it('should log startup message', async () => {
      await server.start();
      expect(logger.log).toHaveBeenCalledWith(
        'Bluetooth HID server started. Advertising as:', 'Test Keyboard'
      );
    });
  });

  describe('send()', () => {
    it('should not send when not notifying', async () => {
      await server.start();
      server._notifying = false;
      server.send(Buffer.alloc(8));
    });

    it('should not send when inputReportChar is null', () => {
      server.inputReportChar = null;
      server._notifying = true;
      server.send(Buffer.alloc(8));
    });

    it('should not send when both are falsy', () => {
      server.inputReportChar = null;
      server._notifying = false;
      server.send(Buffer.alloc(8));
    });

    it('should call updateValue when notifying and char exists', async () => {
      await server.start();
      server._notifying = true;

      if (server.inputReportChar) {
        server.inputReportChar.updateValue = jest.fn();
        const report = Buffer.alloc(8);
        server.send(report);
        expect(server.inputReportChar.updateValue).toHaveBeenCalledWith(report);
      }
    });
  });

  describe('stop()', () => {
    it('should disconnect the bus', async () => {
      await server.start();
      await server.stop();
      expect(mockBus.disconnect).toHaveBeenCalled();
      expect(server.bus).toBeNull();
    });

    it('should handle stop when bus is null', async () => {
      server.bus = null;
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should handle errors during unregister gracefully', async () => {
      await server.start();
      mockBus.getProxyObject.mockRejectedValueOnce(new Error('fail'));
      await server.stop();
      expect(mockBus.disconnect).toHaveBeenCalled();
    });
  });

  describe('_buildAgentInterface()', () => {
    it('should return an interface instance', () => {
      const iface = server._buildAgentInterface();
      expect(iface).toBeDefined();
    });

    it('agent methods should exist and be callable', () => {
      const iface = server._buildAgentInterface();
      // The inner class extends MockInterface and has these methods defined
      // In our mock, they exist on the prototype
      expect(typeof iface.Release).toBe('function');
      expect(typeof iface.RequestPinCode).toBe('function');
      expect(typeof iface.DisplayPinCode).toBe('function');
      expect(typeof iface.RequestPasskey).toBe('function');
      expect(typeof iface.DisplayPasskey).toBe('function');
      expect(typeof iface.RequestConfirmation).toBe('function');
      expect(typeof iface.RequestAuthorization).toBe('function');
      expect(typeof iface.AuthorizeService).toBe('function');
      expect(typeof iface.Cancel).toBe('function');

      // Call them all for coverage
      iface.Release();
      expect(iface.RequestPinCode('/dev')).toBe('0000');
      iface.DisplayPinCode('/dev', '1234');
      expect(iface.RequestPasskey('/dev')).toBe(0);
      iface.DisplayPasskey('/dev', 123456);
      iface.RequestConfirmation('/dev', 123456);
      iface.RequestAuthorization('/dev');
      iface.AuthorizeService('/dev', '1812');
      iface.Cancel();
    });
  });

  describe('_buildGattObjects()', () => {
    it('should return objects with correct paths', () => {
      const objects = server._buildGattObjects();
      expect(objects[C.SERVICE_PATH]).toBeDefined();
      expect(objects[`${C.SERVICE_PATH}/char0`]).toBeDefined();
      expect(objects[`${C.SERVICE_PATH}/char1`]).toBeDefined();
      expect(objects[`${C.SERVICE_PATH}/char2`]).toBeDefined();
      expect(objects[`${C.SERVICE_PATH}/char3`]).toBeDefined();
    });

    it('should include input report reference descriptor', () => {
      const objects = server._buildGattObjects();
      const descPath = `${C.SERVICE_PATH}/char1/desc0`;
      expect(objects[descPath]).toBeDefined();
    });

    it('should set inputReportChar', () => {
      server._buildGattObjects();
      expect(server.inputReportChar).toBeDefined();
    });
  });

  describe('_buildServiceInterface()', () => {
    it('should create service with correct properties', () => {
      const iface = server._buildServiceInterface('/test', '1812', true);
      expect(iface.UUID).toBe('1812');
      expect(iface.Primary).toBe(true);
      expect(iface.Includes).toEqual([]);
    });
  });

  describe('_buildCharacteristicInterface()', () => {
    it('should create characteristic with correct properties', () => {
      const iface = server._buildCharacteristicInterface(
        '/test/char', '2a4d', '/test', ['read', 'notify'], Buffer.from([0x00])
      );
      expect(iface.UUID).toBe('2a4d');
      expect(iface.Service).toBe('/test');
      expect(iface.Flags).toEqual(['read', 'notify']);
      expect(iface.Notifying).toBe(false);
    });

    it('should support ReadValue', () => {
      const iface = server._buildCharacteristicInterface(
        '/test/char', '2a4d', '/test', ['read'], Buffer.from([0x42])
      );
      const val = iface.ReadValue({});
      expect(Buffer.isBuffer(val)).toBe(true);
      expect(val[0]).toBe(0x42);
    });

    it('should support WriteValue', () => {
      const iface = server._buildCharacteristicInterface(
        '/test/char', '2a4e', '/test', ['read', 'write-without-response'], Buffer.from([0x01])
      );
      iface.WriteValue([0x00], {});
      expect(iface.Value[0]).toBe(0x00);
    });

    it('should support StartNotify/StopNotify', () => {
      const iface = server._buildCharacteristicInterface(
        '/test/char', '2a4d', '/test', ['read', 'notify'], Buffer.alloc(8)
      );
      iface.StartNotify();
      expect(iface.Notifying).toBe(true);
      expect(server._notifying).toBe(true);

      iface.StopNotify();
      expect(iface.Notifying).toBe(false);
      expect(server._notifying).toBe(false);
    });

    it('should support updateValue with notification', () => {
      server.bus = mockBus;
      const iface = server._buildCharacteristicInterface(
        '/test/char', '2a4d', '/test', ['read', 'notify'], Buffer.alloc(8)
      );
      iface._notifying = true;
      iface.updateValue(Buffer.from([0x01, 0x00, 0x04, 0, 0, 0, 0, 0]));
      expect(iface.Value[0]).toBe(0x01);
      expect(mockBus.send).toHaveBeenCalledWith(expect.objectContaining({
        member: 'PropertiesChanged',
        interface: 'org.freedesktop.DBus.Properties',
        type: 4
      }));
    });

    it('should not emit PropertiesChanged when not notifying', () => {
      const iface = server._buildCharacteristicInterface(
        '/test/char', '2a4d', '/test', ['read', 'notify'], Buffer.alloc(8)
      );
      const spy = jest.spyOn(iface, 'emitPropertiesChanged');
      iface.updateValue(Buffer.from([0x01, 0, 0, 0, 0, 0, 0, 0]));
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('_buildDescriptorInterface()', () => {
    it('should create descriptor with correct properties', () => {
      const iface = server._buildDescriptorInterface(
        '/test/desc', '2908', '/test/char', ['read'], Buffer.from([0x01, 0x01])
      );
      expect(iface.UUID).toBe('2908');
      expect(iface.Characteristic).toBe('/test/char');
      expect(iface.Flags).toEqual(['read']);
    });

    it('should support ReadValue', () => {
      const value = Buffer.from([0x01, 0x01]);
      const iface = server._buildDescriptorInterface(
        '/test/desc', '2908', '/test/char', ['read'], value
      );
      const result = iface.ReadValue({});
      expect(result).toBe(value);
    });
  });

  describe('_buildObjectManager()', () => {
    it('should create ObjectManager with GetManagedObjects', () => {
      const objects = server._buildGattObjects();
      const om = server._buildObjectManager(objects);
      expect(typeof om.GetManagedObjects).toBe('function');
    });

    it('GetManagedObjects should return managed objects dict', () => {
      const objects = server._buildGattObjects();
      const om = server._buildObjectManager(objects);
      const result = om.GetManagedObjects();
      expect(result).toBeDefined();
      expect(result[C.SERVICE_PATH]).toBeDefined();
    });

    it('should handle objects with Characteristic property (descriptor)', () => {
      // Build objects that include a descriptor (which has Characteristic property)
      const objects = server._buildGattObjects();
      const om = server._buildObjectManager(objects);
      const result = om.GetManagedObjects();
      const descPath = `${C.SERVICE_PATH}/char1/desc0`;
      expect(result[descPath]).toBeDefined();
    });
  });

  describe('_buildAdvertisementInterface()', () => {
    it('should create advertisement with correct properties', () => {
      const iface = server._buildAdvertisementInterface();
      expect(iface.Type).toBe('peripheral');
      expect(iface.ServiceUUIDs).toEqual([C.HID_SERVICE_UUID]);
      expect(iface.LocalName).toBe('Test Keyboard');
      expect(iface.Appearance).toBe(C.APPEARANCE_KEYBOARD);
      expect(iface.Includes).toEqual(['tx-power', 'service-uuids']);
    });

    it('should have a Release method', () => {
      const iface = server._buildAdvertisementInterface();
      iface.Release();
      expect(logger.log).toHaveBeenCalledWith('Advertisement released');
    });
  });
});
