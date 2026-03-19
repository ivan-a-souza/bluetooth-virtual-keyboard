# Bluetooth Virtual Keyboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Transforms a Linux computer into a **Bluetooth Low Energy (BLE) keyboard** for another computer, using **Node.js + BlueZ via D-Bus**.

> Objective: Use the computer's physical keyboard to type on another computer/phone as if the computer were a Bluetooth peripheral.

---

## Overview

This version is organized using **Clean Architecture**, separating:

- **domain**: core keyboard rules, HID mapping, and state management
- **application**: use cases, orchestration, and system verification
- **infrastructure**: reading from `/dev/input/eventX`, integration with BlueZ and D-Bus
- **shared**: common utilities

The implementation interacts directly with **BlueZ via D-Bus** (no `bleno` required):
- **GATT Application** with HID over GATT (HOGP) service (`0x1812`)
- **LE Advertising** to make the device discoverable
- **Agent** for pairing (NoInputNoOutput)
- **Report Map** compatible with HID Boot Protocol (standard keyboard)

---

## System Requirements

### Operating System
This implementation is designed for **Linux** with **BlueZ**.

It is **not designed for Windows or macOS**.

### Hardware
You will need:

- A laptop or computer with a **Bluetooth adapter** compatible with BLE
- Access to the local keyboard via `/dev/input/eventX`
- Privileges to access the input device and register Bluetooth services

### Runtime
- **Node.js 18+** (required)
- **pnpm** installed
- **BlueZ** installed on the system
- **D-Bus** running

---

## Project Dependencies

### Node.js Dependencies

| Package | Usage |
| --- | --- |
| [`dbus-next`](https://www.npmjs.com/package/dbus-next) | D-Bus integration in Node.js |
| [`commander`](https://www.npmjs.com/package/commander) | Command-line argument parsing |

### Dev Dependencies

| Package | Usage |
| --- | --- |
| [`jest`](https://www.npmjs.com/package/jest) | Testing framework |

### System Dependencies

Install the following packages on Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y \
  bluetooth \
  bluez \
  dbus \
  libbluetooth-dev \
  build-essential \
  evtest
```

---

## Project Structure

```text
bluetooth-virtual-keyboard/
  package.json
  jest.config.js
  README.md
  .gitignore
  src/
    main.js
    shared/
      logger.js
    domain/
      linuxKeyMap.js
      keyboardState.js
    application/
      keyboardInputService.js
      systemCheck.js
    infrastructure/
      input/
        evdevInputReader.js
      bluetooth/
        bluezConstants.js
        bluezHidServer.js
  tests/
    domain/
      keyboardState.test.js
      linuxKeyMap.test.js
    application/
      keyboardInputService.test.js
      systemCheck.test.js
    infrastructure/
      input/
        evdevInputReader.test.js
      bluezHidServer.test.js
    shared/
      logger.test.js
```

---

## Installation

### 1) Install Node.js dependencies

```bash
pnpm install
```

### 2) Verify system readiness

```bash
sudo node ./src/main.js --check
```

This command verifies:
- ✅ Node.js 18+
- ✅ BlueZ installed
- ✅ Bluetooth service running
- ✅ Bluetooth adapter present
- ✅ D-Bus accessible
- ✅ Input device accessible (if `--device` provided)

To verify the device as well:

```bash
sudo node ./src/main.js --check --device /dev/input/event3
```

---

## Finding the Keyboard Device

The program needs to read the keyboard from `/dev/input/eventX`.

### Option 1: List by path

```bash
ls -l /dev/input/by-path/
```

Example output:

```bash
platform-i8042-serio-0-event-kbd -> ../event3
```

In this case, the keyboard is likely `/dev/input/event3`.

### Option 2: Inspect devices

```bash
cat /proc/bus/input/devices
```

### Option 3: Test with evtest

```bash
sudo evtest
```

Choose the keyboard from the list and confirm the `eventX` number.

---

## How to Run

### Basic command

```bash
sudo node ./src/main.js --device /dev/input/event3 --name "Laptop BLE Keyboard"
```

### Example with custom name

```bash
sudo node ./src/main.js --device /dev/input/event3 --name "Ivan's Keyboard"
```

### CLI Options

| Flag | Required | Description |
| --- | --- | --- |
| `--device <path>` | Yes (except with `--check`) | Keyboard device path |
| `--name <name>` | No (default: `BLE Keyboard`) | Advertised BLE name |
| `--check` | No | Verify dependencies and exit |

> In many cases, `sudo` is required because:
> - Accessing `/dev/input/eventX` usually requires elevated privileges
> - Registering GATT/Advertising services with BlueZ requires system permissions

---

## Expected Workflow

1. Run `--check` to ensure the system is ready
2. Start the project on the Linux laptop
3. The laptop begins advertising as a BLE peripheral (HID Keyboard)
4. On the other computer/phone, scan for Bluetooth devices
5. Pair with the discovered device
6. Connect the device
7. Keys typed on the laptop are now sent to the remote host

---

## Pairing and Connection

On the destination computer/phone, open Bluetooth settings and look for the advertised name.

Then:

- Pair with the device
- Accept PIN/code if requested
- Connect as an input device

### Diagnostic Tip with bluetoothctl

On Linux, you can test like this:

```bash
bluetoothctl
```

Inside the shell:

```text
power on
agent on
default-agent
scan on
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
```

---

## Testing

### Run all tests

```bash
pnpm test
```

### Run with coverage report

```bash
pnpm run test:coverage
```

### Current Coverage

| Module | Statements | Branches | Lines |
| --- | --- | --- | --- |
| domain/ | 100% | 100% | 100% |
| application/ | 100% | 100% | 100% |
| infrastructure/input/ | 100% | 100% | 100% |
| infrastructure/bluetooth/ | 99% | 96% | 100% |
| shared/ | 100% | 100% | 100% |

---

## Internal Architecture

### 1. Capturing Keyboard Events
The `evdevInputReader` layer opens the `/dev/input/eventX` device and reads binary keyboard events from the Linux kernel (`input_event` struct, 24 bytes).

### 2. Mapping Linux Keycodes to HID
The domain layer (`linuxKeyMap`) translates ~100 Linux keycodes to **HID usage codes**, including letters, numbers, F-keys, arrows, numpad, and modifiers.

### 3. Maintaining Keyboard State
The `keyboardState` layer manages:
- Pressed keys (up to 6 simultaneous, HID Boot protocol)
- Modifiers (Shift, Ctrl, Alt, GUI) as a bitmask
- 8-byte HID report assembly

### 4. Publishing BLE Peripheral via D-Bus
The `bluezHidServer` layer registers with BlueZ:
- **GATT Application** (`ObjectManager`) with HID service (`0x1812`)
- **Characteristics**: Report Map, Input Report (notify), Protocol Mode, HID Information
- **Descriptors**: Report Reference
- **LE Advertisement** (Appearance: Keyboard, HID UUID)
- **Agent**: Auto-accept pairing agent

### 5. Sending HID Reports
When the remote host subscribes to notifications (`StartNotify`), reports are sent via direct D-Bus signal emission (`PropertiesChanged`) on the Input Report characteristic.

---

## Permissions and Keyboard Access

### Why is `sudo` usually necessary?
The project reads low-level events from `/dev/input/eventX` (owned by `root` and the `input` group) and registers D-Bus interfaces with BlueZ that require administrative privileges.

### Alternative to sudo
Add your user to the `input` group:

```bash
sudo usermod -aG input $USER
```

> However, registering GATT/Advertising services may still require `sudo`.

---

## Troubleshooting

### 1) Quick dependency check

```bash
sudo node ./src/main.js --check --device /dev/input/event3
```

### 2) Bluetooth service is down

```bash
systemctl status bluetooth
sudo systemctl restart bluetooth
```

### 3) Device does not appear for pairing

- Ensure your adapter supports BLE
- Verify advertising started in the logs
- Use `sudo btmon` to see real-time Bluetooth traffic
- Ensure there is no conflict with other Bluetooth applications
- **BlueZ Configuration**: Ensure the `--experimental` flag is enabled in the bluetooth service.

### 4) Which `/dev/input/eventX` to use?

```bash
ls -l /dev/input/by-path/
sudo evtest
```

### 5) Permission Error
Run with `sudo` or add the user to the `input` group.

### 6) Bluetooth adapter not found
```bash
dmesg | grep -i bluetooth
rfkill list
sudo rfkill unblock bluetooth
```

---

## Development Mode

### Monitor Bluetooth Traffic
```bash
sudo btmon
```

### Monitor Keyboard Events
```bash
sudo evtest /dev/input/event3
```

---

## Systemd Unit Example

In `/etc/systemd/system/bluetooth-virtual-keyboard.service`:

```ini
[Unit]
Description=Bluetooth Virtual Keyboard
After=bluetooth.service
Wants=bluetooth.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bluetooth-virtual-keyboard
ExecStart=/usr/bin/node /opt/bluetooth-virtual-keyboard/src/main.js --device /dev/input/event3 --name "Bluetooth Virtual Keyboard"
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bluetooth-virtual-keyboard
sudo systemctl start bluetooth-virtual-keyboard
```

---

## Security

This project intercepts real keyboard events and exposes a Bluetooth input interface.

Use with caution:

- Avoid running in sensitive environments without understanding the impact
- Do not expose advertising in untrusted environments
- Be mindful of bonding, trust, and pairing

---

## Quick Commands

```bash
# Install system dependencies
sudo apt install -y bluetooth bluez dbus libbluetooth-dev build-essential evtest

# Install project dependencies
pnpm install

# Verify system
sudo node ./src/main.js --check --device /dev/input/event3

# Find keyboard device
ls -l /dev/input/by-path/

# Run the app
sudo node ./src/main.js --device /dev/input/event3 --name "Bluetooth Virtual Keyboard"

# Monitor Bluetooth
sudo btmon

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage
```
