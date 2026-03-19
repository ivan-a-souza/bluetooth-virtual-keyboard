const dbus = require('dbus-next');
const {
  Variant,
  Message,
  MessageType
} = dbus;
const logger = require('../../shared/logger');
const C = require('./bluezConstants');

// ─── Helper: create a Variant for D-Bus ────────────────────────────────────────

function v(signature, value) {
  return new Variant(signature, value);
}

// ─── BluezHidServer ────────────────────────────────────────────────────────────

class BluezHidServer {
  constructor(name) {
    this.name = name;
    this.bus = null;
    this.inputReportChar = null;
    this._notifying = false;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async start() {
    this.bus = dbus.systemBus();

    await this._configureAdapter();
    await this._registerAgent();
    await this._registerGattApplication();
    await this._registerAdvertisement();

    logger.log('Bluetooth HID server started. Advertising as:', this.name);
  }

  send(report) {
    if (!this._notifying || !this.inputReportChar) return;
    this.inputReportChar.updateValue(report);
  }

  async stop() {
    if (this.bus) {
      try {
        const obj = await this.bus.getProxyObject(C.BLUEZ_SERVICE, '/org/bluez/hci0');
        const advManager = obj.getInterface(C.LE_ADVERTISING_MANAGER_IFACE);
        await advManager.UnregisterAdvertisement(C.ADV_PATH);
      } catch (_) { /* ignore */ }
      this.bus.disconnect();
      this.bus = null;
    }
  }

  // ── Configure adapter ─────────────────────────────────────────────────────

  async _configureAdapter() {
    const obj = await this.bus.getProxyObject(C.BLUEZ_SERVICE, '/org/bluez/hci0');
    const props = obj.getInterface(C.DBUS_PROP_IFACE);

    // Power on
    await props.Set(C.ADAPTER_IFACE, 'Powered', v('b', true));
    // Make discoverable
    await props.Set(C.ADAPTER_IFACE, 'Discoverable', v('b', true));
    // Stay discoverable forever
    await props.Set(C.ADAPTER_IFACE, 'DiscoverableTimeout', v('u', 0));
    // Set alias
    await props.Set(C.ADAPTER_IFACE, 'Alias', v('s', this.name));

    // Try to set device class (0x000540 = Peripheral Keyboard)
    // Note: Some BlueZ versions/adapters might reject this via D-Bus Properties.Set,
    // so we wrap it in a try-catch to not break the startup flow if it fails.
    try {
      // The Class property is typically exposed internally or by older BlueZ,
      // but modern BlueZ might manage it via plugins or Appearance.
      // We still try to set it explicitly if the property exists.
      await props.Set(C.ADAPTER_IFACE, 'Class', v('u', 0x000540));
    } catch (err) {
      logger.log('Note: Could not set adapter Class via D-Bus (often handled by BlueZ automatically)');
    }

    logger.log('Adapter configured: powered on, discoverable, alias =', this.name);
  }

  // ── Agent (pairing) ───────────────────────────────────────────────────────

  async _registerAgent() {
    // Export agent interface
    const agentNode = {
      name: C.AGENT_PATH,
      interfaces: {}
    };
    agentNode.interfaces[C.AGENT_IFACE] = {
      methods: {
        Release: { inSignature: '', outSignature: '' },
        RequestPinCode: { inSignature: 'o', outSignature: 's' },
        DisplayPinCode: { inSignature: 'os', outSignature: '' },
        RequestPasskey: { inSignature: 'o', outSignature: 'u' },
        DisplayPasskey: { inSignature: 'ou', outSignature: '' },
        RequestConfirmation: { inSignature: 'ou', outSignature: '' },
        RequestAuthorization: { inSignature: 'o', outSignature: '' },
        AuthorizeService: { inSignature: 'os', outSignature: '' },
        Cancel: { inSignature: '', outSignature: '' },
      },
      properties: {},
      signals: {},
      listeners: {},
      emit: () => {},
    };

    // Implement the agent - auto-accept everything (NoInputNoOutput)
    const agentImpl = {};
    agentImpl.Release = () => {};
    agentImpl.RequestPinCode = () => '0000';
    agentImpl.DisplayPinCode = () => {};
    agentImpl.RequestPasskey = () => 0;
    agentImpl.DisplayPasskey = () => {};
    agentImpl.RequestConfirmation = () => {};
    agentImpl.RequestAuthorization = () => {};
    agentImpl.AuthorizeService = () => {};
    agentImpl.Cancel = () => {};

    this.bus.export(C.AGENT_PATH, this._buildAgentInterface());

    const agentManagerObj = await this.bus.getProxyObject(C.BLUEZ_SERVICE, '/org/bluez');
    const agentManager = agentManagerObj.getInterface(C.AGENT_MANAGER_IFACE);

    await agentManager.RegisterAgent(C.AGENT_PATH, 'NoInputNoOutput');
    await agentManager.RequestDefaultAgent(C.AGENT_PATH);

    logger.log('Pairing agent registered');
  }

  _buildAgentInterface() {
    class AgentInterface extends dbus.interface.Interface {
      Release() { logger.log('Agent: Release'); }
      RequestPinCode(_device) { return '0000'; }
      DisplayPinCode(_device, _pincode) { logger.log('Agent: DisplayPinCode'); }
      RequestPasskey(_device) { return 0; }
      DisplayPasskey(_device, _passkey) { logger.log('Agent: DisplayPasskey'); }
      RequestConfirmation(_device, _passkey) { logger.log('Agent: auto-confirm pairing'); }
      RequestAuthorization(_device) { logger.log('Agent: auto-authorize'); }
      AuthorizeService(_device, _uuid) { logger.log('Agent: auto-authorize service'); }
      Cancel() { logger.log('Agent: Cancel'); }
    }

    AgentInterface.configureMembers({
      methods: {
        Release: { inSignature: '', outSignature: '' },
        RequestPinCode: { inSignature: 'o', outSignature: 's' },
        DisplayPinCode: { inSignature: 'os', outSignature: '' },
        RequestPasskey: { inSignature: 'o', outSignature: 'u' },
        DisplayPasskey: { inSignature: 'ou', outSignature: '' },
        RequestConfirmation: { inSignature: 'ou', outSignature: '' },
        RequestAuthorization: { inSignature: 'o', outSignature: '' },
        AuthorizeService: { inSignature: 'os', outSignature: '' },
        Cancel: { inSignature: '', outSignature: '' },
      }
    });

    return new AgentInterface(C.AGENT_IFACE);
  }

  // ── GATT Application ──────────────────────────────────────────────────────

  async _registerGattApplication() {
    // Build all GATT objects
    const objects = this._buildGattObjects();

    // Export the Application (ObjectManager) at APP_PATH
    this.bus.export(C.APP_PATH, this._buildObjectManager(objects));

    // Export each object at its path
    for (const [path, ifaces] of Object.entries(objects)) {
      for (const iface of ifaces) {
        this.bus.export(path, iface);
      }
    }

    // Register with BlueZ
    const obj = await this.bus.getProxyObject(C.BLUEZ_SERVICE, '/org/bluez/hci0');
    const gattManager = obj.getInterface(C.GATT_MANAGER_IFACE);

    await gattManager.RegisterApplication(C.APP_PATH, {});

    logger.log('GATT Application registered');
  }

  _buildGattObjects() {
    const objects = {};
    const servicePath = C.SERVICE_PATH;

    // ── HID Service ──
    objects[servicePath] = [
      this._buildServiceInterface(servicePath, C.HID_SERVICE_UUID, true)
    ];

    // ── Report Map Characteristic (read) ──
    const reportMapPath = `${servicePath}/char0`;
    objects[reportMapPath] = [
      this._buildCharacteristicInterface(
        reportMapPath,
        C.HID_REPORT_MAP_UUID,
        servicePath,
        ['read'],
        C.HID_REPORT_MAP
      )
    ];

    // ── Input Report Characteristic (read, notify) ──
    const inputReportPath = `${servicePath}/char1`;
    const inputReportIface = this._buildCharacteristicInterface(
      inputReportPath,
      C.HID_REPORT_UUID,
      servicePath,
      ['read', 'notify'],
      Buffer.alloc(8)
    );
    this.inputReportChar = inputReportIface;
    objects[inputReportPath] = [inputReportIface];

    // Input Report Reference Descriptor
    const inputReportRefPath = `${inputReportPath}/desc0`;
    objects[inputReportRefPath] = [
      this._buildDescriptorInterface(
        inputReportRefPath,
        C.REPORT_REFERENCE_DESC_UUID,
        inputReportPath,
        ['read'],
        Buffer.from([0x01, 0x01]) // Report ID 1, Input (1)
      )
    ];

    // ── Protocol Mode Characteristic (read, write-without-response) ──
    const protocolModePath = `${servicePath}/char2`;
    objects[protocolModePath] = [
      this._buildCharacteristicInterface(
        protocolModePath,
        C.PROTOCOL_MODE_UUID,
        servicePath,
        ['read', 'write-without-response'],
        Buffer.from([C.PROTOCOL_MODE_REPORT])
      )
    ];

    // ── HID Information Characteristic (read) ──
    const hidInfoPath = `${servicePath}/char3`;
    objects[hidInfoPath] = [
      this._buildCharacteristicInterface(
        hidInfoPath,
        C.HID_INFORMATION_UUID,
        servicePath,
        ['read'],
        C.HID_INFORMATION
      )
    ];

    return objects;
  }

  _buildServiceInterface(path, uuid, primary) {
    const self = this;

    class ServiceInterface extends dbus.interface.Interface {
      get UUID() { return uuid; }
      get Primary() { return primary; }
      get Includes() { return []; }
    }

    ServiceInterface.configureMembers({
      properties: {
        UUID: { signature: 's', access: 'read' },
        Primary: { signature: 'b', access: 'read' },
        Includes: { signature: 'ao', access: 'read' },
      }
    });

    const iface = new ServiceInterface(C.GATT_SERVICE_IFACE);
    return iface;
  }

  _buildCharacteristicInterface(path, uuid, servicePath, flags, initialValue) {
    return new CharInterface(path, uuid, servicePath, flags, initialValue, this);
  }

  _buildDescriptorInterface(path, uuid, charPath, flags, value) {
    class DescInterface extends dbus.interface.Interface {
      get UUID() { return uuid; }
      get Characteristic() { return charPath; }
      get Flags() { return flags; }

      ReadValue(_options) {
        return value;
      }
    }

    DescInterface.configureMembers({
      methods: {
        ReadValue: { inSignature: 'a{sv}', outSignature: 'ay' },
      },
      properties: {
        UUID: { signature: 's', access: 'read' },
        Characteristic: { signature: 'o', access: 'read' },
        Flags: { signature: 'as', access: 'read' },
      },
    });

    return new DescInterface(C.GATT_DESC_IFACE);
  }

  // ── ObjectManager ─────────────────────────────────────────────────────────

  _buildObjectManager(objects) {
    // Convert our object tree into the format expected by GetManagedObjects
    const managedObjects = {};

    for (const [path, ifaces] of Object.entries(objects)) {
      managedObjects[path] = {};
      for (const iface of ifaces) {
        const ifaceName = iface.$name;
        const props = {};

        // Read the property values from the interface
        if (iface.UUID !== undefined) props.UUID = v('s', iface.UUID);
        if (iface.Primary !== undefined) props.Primary = v('b', iface.Primary);
        if (iface.Includes !== undefined) props.Includes = v('ao', iface.Includes);
        if (iface.Service !== undefined) props.Service = v('o', iface.Service);
        if (iface.Characteristic !== undefined) props.Characteristic = v('o', iface.Characteristic);
        if (iface.Flags !== undefined) props.Flags = v('as', iface.Flags);
        if (iface.Value !== undefined) props.Value = v('ay', [...iface.Value]);
        if (iface.Notifying !== undefined) props.Notifying = v('b', iface.Notifying);

        managedObjects[path][ifaceName] = props;
      }
    }

    class ObjectManagerInterface extends dbus.interface.Interface {
      GetManagedObjects() {
        return managedObjects;
      }
    }

    ObjectManagerInterface.configureMembers({
      methods: {
        GetManagedObjects: { inSignature: '', outSignature: 'a{oa{sa{sv}}}' },
      }
    });

    return new ObjectManagerInterface(C.DBUS_OM_IFACE);
  }

  // ── LE Advertisement ──────────────────────────────────────────────────────

  async _registerAdvertisement() {
    this.bus.export(C.ADV_PATH, this._buildAdvertisementInterface());

    const obj = await this.bus.getProxyObject(C.BLUEZ_SERVICE, '/org/bluez/hci0');
    const advManager = obj.getInterface(C.LE_ADVERTISING_MANAGER_IFACE);

    await advManager.RegisterAdvertisement(C.ADV_PATH, {});

    logger.log('LE Advertisement registered');
  }

  _buildAdvertisementInterface() {
    const name = this.name;

    class AdvInterface extends dbus.interface.Interface {
      get Type() { return 'peripheral'; }
      get ServiceUUIDs() { return [C.HID_SERVICE_UUID]; }
      get LocalName() { return name; }
      get Appearance() { return C.APPEARANCE_KEYBOARD; }
      get Discoverable() { return true; }
      get Includes() { return ['tx-power', 'service-uuids']; }

      Release() {
        logger.log('Advertisement released');
      }
    }

    AdvInterface.configureMembers({
      methods: {
        Release: { inSignature: '', outSignature: '' },
      },
      properties: {
        Type: { signature: 's', access: 'read' },
        ServiceUUIDs: { signature: 'as', access: 'read' },
        LocalName: { signature: 's', access: 'read' },
        Appearance: { signature: 'q', access: 'read' },
        Discoverable: { signature: 'b', access: 'read' },
        Includes: { signature: 'as', access: 'read' },
      },
    });

    return new AdvInterface(C.LE_ADVERTISEMENT_IFACE);
  }
}

class CharInterface extends dbus.interface.Interface {
  constructor(path, uuid, servicePath, flags, initialValue, server) {
    super(C.GATT_CHAR_IFACE);
    this._path = path;
    this._uuid = uuid;
    this._servicePath = servicePath;
    this._flags = flags;
    this._value = Buffer.from(initialValue);
    this._notifying = false;
    this._server = server;

    // Cache the input report characteristic if it matches the HID Input Report UUID
    if (uuid === '2a4d' && flags.includes('notify')) {
      server.inputReportChar = this;
    }
  }

  get UUID() { return this._uuid; }
  get Service() { return this._servicePath; }
  get Flags() { return this._flags; }
  get Value() { return this._value; }
  get Notifying() { return this._notifying; }

  ReadValue(_options) {
    return this._value;
  }

  WriteValue(val, _options) {
    this._value = Buffer.from(val);
  }

  StartNotify() {
    this._notifying = true;
    this._server._notifying = true;
    logger.log(`Notifications started for ${this._uuid}`);
  }

  StopNotify() {
    this._notifying = false;
    this._server._notifying = false;
    logger.log(`Notifications stopped for ${this._uuid}`);
  }

  updateValue(newValue) {
    this._value = Buffer.from(newValue);
    if (this._notifying && this._server.bus) {
      // Manual D-Bus Signal for PropertiesChanged
      try {
        const message = new dbus.Message({
          path: this._path,
          interface: 'org.freedesktop.DBus.Properties',
          member: 'PropertiesChanged',
          signature: 'sa{sv}as',
          body: [
            C.GATT_CHAR_IFACE,
            { Value: new dbus.Variant('ay', this._value) },
            []
          ],
          type: dbus.MessageType.SIGNAL
        });
        this._server.bus.send(message);
      } catch (err) {
        logger.error(`Failed to emit report: ${err.message}`);
      }
    }
  }
}

CharInterface.configureMembers({
  methods: {
    ReadValue: { inSignature: 'a{sv}', outSignature: 'ay' },
    WriteValue: { inSignature: 'aya{sv}', outSignature: '' },
    StartNotify: { inSignature: '', outSignature: '' },
    StopNotify: { inSignature: '', outSignature: '' },
  },
  properties: {
    UUID: { signature: 's', access: 'read' },
    Service: { signature: 'o', access: 'read' },
    Flags: { signature: 'as', access: 'read' },
    Value: { signature: 'ay', access: 'read' },
    Notifying: { signature: 'b', access: 'read' },
  },
});

module.exports = { BluezHidServer };
