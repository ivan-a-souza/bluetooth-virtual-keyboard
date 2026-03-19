const { Command } = require('commander');
const { EvdevInputReader } = require('./infrastructure/input/evdevInputReader');
const { KeyboardInputService } = require('./application/keyboardInputService');
const { BluezHidServer } = require('./infrastructure/bluetooth/bluezHidServer');
const { SystemCheck } = require('./application/systemCheck');
const logger = require('./shared/logger');

const program = new Command();
program
  .option('--device <path>', 'path to /dev/input/eventX')
  .option('--name <name>', 'BLE device name', 'BLE Keyboard')
  .option('--check', 'verify system dependencies and exit');

program.parse(process.argv);
const opts = program.opts();

async function main() {
  // --check mode
  if (opts.check) {
    const checker = new SystemCheck(opts.device);
    const ok = await checker.run();
    process.exit(ok ? 0 : 1);
  }

  // Normal mode — device is required
  if (!opts.device) {
    logger.error('--device is required. Example: --device /dev/input/event3');
    logger.error('Use --check to verify system dependencies.');
    process.exit(1);
  }

  const reader = new EvdevInputReader(opts.device);
  const bt = new BluezHidServer(opts.name);
  const service = new KeyboardInputService(reader, bt);

  // Graceful shutdown
  const shutdown = () => {
    logger.log('Shutting down...');
    service.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await service.start();
    logger.log(`Keyboard "${opts.name}" is ready. Press Ctrl+C to stop.`);
  } catch (err) {
    logger.error('Failed to start:', err.message);
    logger.error('Run with --check to diagnose issues.');
    process.exit(1);
  }
}

main();
