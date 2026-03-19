// BlueZ D-Bus constants for HID over GATT (HOGP)

// D-Bus
const DBUS_OM_IFACE = 'org.freedesktop.DBus.ObjectManager';
const DBUS_PROP_IFACE = 'org.freedesktop.DBus.Properties';

// BlueZ
const BLUEZ_SERVICE = 'org.bluez';
const ADAPTER_IFACE = 'org.bluez.Adapter1';
const GATT_MANAGER_IFACE = 'org.bluez.GattManager1';
const GATT_SERVICE_IFACE = 'org.bluez.GattService1';
const GATT_CHAR_IFACE = 'org.bluez.GattCharacteristic1';
const GATT_DESC_IFACE = 'org.bluez.GattDescriptor1';
const LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1';
const LE_ADVERTISEMENT_IFACE = 'org.bluez.LEAdvertisement1';
const AGENT_MANAGER_IFACE = 'org.bluez.AgentManager1';
const AGENT_IFACE = 'org.bluez.Agent1';

// GATT UUIDs
const HID_SERVICE_UUID = '1812';
const DEVICE_INFO_SERVICE_UUID = '180a';
const BATTERY_SERVICE_UUID = '180f';

// HID Characteristics
const HID_REPORT_MAP_UUID = '2a4b';
const HID_REPORT_UUID = '2a4d';
const HID_INFORMATION_UUID = '2a4a';
const PROTOCOL_MODE_UUID = '2a4e';

// Descriptors
const REPORT_REFERENCE_DESC_UUID = '2908';
const CCC_DESC_UUID = '2902';

// Device Information Characteristics
const PNP_ID_UUID = '2a50';
const MANUFACTURER_NAME_UUID = '2a29';

// Battery Characteristics
const BATTERY_LEVEL_UUID = '2a19';

// BLE Appearance for Keyboard
const APPEARANCE_KEYBOARD = 0x03c1;

// HID Report Map for a standard keyboard (Boot protocol compatible)
// This descriptor tells the host what kind of reports to expect.
const HID_REPORT_MAP = Buffer.from([
  0x05, 0x01,       // Usage Page (Generic Desktop)
  0x09, 0x06,       // Usage (Keyboard)
  0xa1, 0x01,       // Collection (Application)
  0x85, 0x01,       //   Report ID (1)

  // Modifier keys (8 bits)
  0x05, 0x07,       //   Usage Page (Key Codes)
  0x19, 0xe0,       //   Usage Minimum (224) - Left Control
  0x29, 0xe7,       //   Usage Maximum (231) - Right GUI
  0x15, 0x00,       //   Logical Minimum (0)
  0x25, 0x01,       //   Logical Maximum (1)
  0x75, 0x01,       //   Report Size (1)
  0x95, 0x08,       //   Report Count (8)
  0x81, 0x02,       //   Input (Data, Variable, Absolute)

  // Reserved byte
  0x95, 0x01,       //   Report Count (1)
  0x75, 0x08,       //   Report Size (8)
  0x81, 0x01,       //   Input (Constant)

  // LED output report (5 bits + 3 padding)
  0x95, 0x05,       //   Report Count (5)
  0x75, 0x01,       //   Report Size (1)
  0x05, 0x08,       //   Usage Page (LEDs)
  0x19, 0x01,       //   Usage Minimum (1) - Num Lock
  0x29, 0x05,       //   Usage Maximum (5) - Kana
  0x91, 0x02,       //   Output (Data, Variable, Absolute)
  0x95, 0x01,       //   Report Count (1)
  0x75, 0x03,       //   Report Size (3)
  0x91, 0x01,       //   Output (Constant)

  // Key codes (6 bytes)
  0x95, 0x06,       //   Report Count (6)
  0x75, 0x08,       //   Report Size (8)
  0x15, 0x00,       //   Logical Minimum (0)
  0x25, 0x65,       //   Logical Maximum (101)
  0x05, 0x07,       //   Usage Page (Key Codes)
  0x19, 0x00,       //   Usage Minimum (0)
  0x29, 0x65,       //   Usage Maximum (101)
  0x81, 0x00,       //   Input (Data, Array)

  0xc0              // End Collection
]);

// HID Information value: version 1.11, country code 0, flags 0x02 (normally connectable)
const HID_INFORMATION = Buffer.from([0x11, 0x01, 0x00, 0x02]);

// PnP ID: vendor source (USB), vendor ID, product ID, version
const PNP_ID = Buffer.from([
  0x02,             // Vendor ID Source (USB Implementer's Forum)
  0x6b, 0x1d,       // Vendor ID
  0x00, 0x00,       // Product ID
  0x01, 0x00        // Product Version
]);

// Protocol Mode: Report Protocol (1) vs Boot Protocol (0)
const PROTOCOL_MODE_REPORT = 0x01;

// Object paths
const APP_PATH = '/com/ble/keyboard';
const SERVICE_PATH = `${APP_PATH}/service0`;
const DEVINFO_SERVICE_PATH = `${APP_PATH}/service1`;
const BATTERY_SERVICE_PATH = `${APP_PATH}/service2`;
const AGENT_PATH = `${APP_PATH}/agent`;
const ADV_PATH = `${APP_PATH}/advertisement`;

module.exports = {
  DBUS_OM_IFACE,
  DBUS_PROP_IFACE,
  BLUEZ_SERVICE,
  ADAPTER_IFACE,
  GATT_MANAGER_IFACE,
  GATT_SERVICE_IFACE,
  GATT_CHAR_IFACE,
  GATT_DESC_IFACE,
  LE_ADVERTISING_MANAGER_IFACE,
  LE_ADVERTISEMENT_IFACE,
  AGENT_MANAGER_IFACE,
  AGENT_IFACE,
  HID_SERVICE_UUID,
  DEVICE_INFO_SERVICE_UUID,
  BATTERY_SERVICE_UUID,
  HID_REPORT_MAP_UUID,
  HID_REPORT_UUID,
  HID_INFORMATION_UUID,
  PROTOCOL_MODE_UUID,
  REPORT_REFERENCE_DESC_UUID,
  CCC_DESC_UUID,
  PNP_ID_UUID,
  MANUFACTURER_NAME_UUID,
  BATTERY_LEVEL_UUID,
  APPEARANCE_KEYBOARD,
  HID_REPORT_MAP,
  HID_INFORMATION,
  PNP_ID,
  PROTOCOL_MODE_REPORT,
  APP_PATH,
  SERVICE_PATH,
  DEVINFO_SERVICE_PATH,
  BATTERY_SERVICE_PATH,
  AGENT_PATH,
  ADV_PATH,
};