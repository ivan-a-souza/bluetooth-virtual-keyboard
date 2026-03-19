const logger = require('../../src/shared/logger');

describe('logger', () => {
  let logSpy, errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('log()', () => {
    it('should call console.log with [LOG] prefix', () => {
      logger.log('hello', 'world');
      expect(logSpy).toHaveBeenCalledWith('[LOG]', 'hello', 'world');
    });

    it('should call console.log with single argument', () => {
      logger.log('msg');
      expect(logSpy).toHaveBeenCalledWith('[LOG]', 'msg');
    });
  });

  describe('error()', () => {
    it('should call console.error with [ERR] prefix', () => {
      logger.error('bad', 'thing');
      expect(errorSpy).toHaveBeenCalledWith('[ERR]', 'bad', 'thing');
    });

    it('should call console.error with single argument', () => {
      logger.error('err');
      expect(errorSpy).toHaveBeenCalledWith('[ERR]', 'err');
    });
  });
});
