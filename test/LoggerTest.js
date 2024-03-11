import {expect, sinon} from './TestHelper';
import R from 'ramda';
import Logger from '../src/Logger';
import memo from 'memo-is';

describe('Logger', () => {
  let publisher;
  let logger;
  let windowConsole;
  let localStorage;
  const currentIsoDate = () => 'current-iso-date';
  const maxArrayLength = 3;
  const loggerOpts = memo().is(() => ({maxArrayLength}));

  beforeEach(() => {
    windowConsole = {info: sinon.stub()};
    localStorage = {};
    publisher = {addToBucket: sinon.stub()};
    const opts = R.merge({publisher, currentIsoDate, windowConsole, localStorage}, loggerOpts());
    // Don't rely on browser's implementaion of Array.prototype.reduce
    Array.prototype.reduce = () => undefined;
    logger = new Logger(opts);
  });

  ['debug', 'info', 'warn'].forEach(level => {
    describe(`#${level}`, () => {
      it('adds a log with one string argument', () => {
        const message = 'a message';

        logger[level](message);
        expectLog({level, attributes: [message]});
      });

      it('adds a log with multiple string arguments', () => {
        const message1 = 'message one';
        const message2 = 'message two';

        logger[level](message1, message2);
        expectLog({level, attributes: [message1, message2]});
      });

      it('stringifies function arguments', () => {
        const fn = function () {
          whatever();
        };

        logger[level](fn);
        expectLog({level, attributes: ['<Function>']});
      });

      it('keeps null unchanged', () => {
        logger[level]({a: null});
        expectLog({level, attributes: [{a: null}]});
      });

      it('prunes deeply nested objects', () => {
        const message = 'a message';

        logger[level](message, {
          a: [{deeply: {nested: 'b'}, shallow: 'c'}]
        });
        expectLog({
          level,
          attributes: [message, {a: [{deeply: '-pruned-', shallow: 'c'}]}]
        });
      });

      it('prunes long arrays in an object', () => {
        const message = 'a message';
        const zeroTo50 = Array.from(Array(50).keys());
        const obj = {
          simple_array: zeroTo50,
          array_with_objects: zeroTo50.map(key => ({key})),
          array_with_arrays: zeroTo50.map(key => [key])
        };

        logger[level](message, obj);
        expectLog({
          level,
          attributes: [
            message,
            {
              simple_array: [0, 1, 2, '-pruned-'],
              array_with_objects: [{key: 0}, {key: 1}, {key: 2}, {pruned: true}],
              array_with_arrays: [[0], [1], [2], ['-pruned-']]
            }
          ]
        });
      });

      it('prunes nested arrays that exceed depth limit', () => {
        const message = 'a message';

        let recursive_object = {};
        recursive_object.f = recursive_object;

        logger[level](message, {
          a: {b: {c: [[{d: recursive_object}], {f: 'string'}]}}
        });
        expectLog({
          level,
          attributes: [message, {a: {b: {c: ['-pruned-']}}}]
        });
      });

      context('when nested whitelist is passed', () => {
        loggerOpts.is(() => ({
          whitelist: {
            allowed_value: true,
            some_object: {
              foo: true
            },
            other_object: true
          }
        }));

        it('redacts various types of fields', () => {
          const message = 'a message';

          logger[level](message, {
            allowed_value: 'allowed_value',
            some_not_allowed_value: 'some_not_allowed_value',
            some_object: {foo: 'foo', bar: ['bar'], baz: 'baz'},
            other_object: {baz: 'baz'}
          });
          expectLog({
            level,
            attributes: [
              message,
              {
                allowed_value: 'allowed_value',
                some_not_allowed_value: '-redacted-',
                other_object: {baz: '-redacted-'},
                some_object: {bar: ['-redacted-'], baz: '-redacted-', foo: 'foo'}
              }
            ]
          });
        });
      });

      it('extracts error information from error object', () => {
        const error = new Error('oh snap');

        logger[level](error);
        expectLog({
          level,
          attributes: [{message: error.message, stack: error.stack}]
        });
      });

      it('extracts error information from error object from second argument', () => {
        const message = 'some message';
        const error = new Error('oh snap');

        logger[level](message, error);
        expectLog({
          level,
          attributes: [message, {message: error.message, stack: error.stack}]
        });
      });

      context('when tags are specified', () => {
        loggerOpts.is(() => ({tags: {foo: 'bar'}}));

        it('includes tags in the log', () => {
          const message = 'a message';

          logger[level](message);
          expectLog({level, attributes: [message], foo: 'bar'});
        });
      });

      context('when tag value is a function', () => {
        loggerOpts.is(() => ({tags: {foo: () => 'bar'}}));

        it('evaluates the tag value when adding a log', () => {
          const message = 'a message';

          logger[level](message);
          expectLog({level, attributes: [message], foo: 'bar'});
        });
      });
    });
  });

  describe('#log', () => {
    it('is alias for info', () => {
      const message = 'a message';

      logger.log(message);
      expectLog({level: 'info', attributes: [message]});
    });
  });

  describe('#error', () => {
    it('adds stacktrace when first argument is a string', () => {
      const message = 'some kind of error';

      logger.error(message);
      expectLog({
        level: 'error',
        attributes: [
          {
            message: message,
            stack: sinon.match('Error: some kind of error')
          }
        ]
      });
    });

    it('adds previous log as breadcrumb to errors', () => {
      const genericMessage = 'a message';
      logger.info(genericMessage);

      const message = 'some kind of error';
      logger.error(message);
      expectLog({
        level: 'error',
        attributes: [
          {
            message: message,
            stack: sinon.match('Error: some kind of error')
          }
        ],
        breadcrumbs: [
          {
            level: 'info',
            attributes: [genericMessage],
            timestamp: currentIsoDate()
          }
        ]
      });
    });

    it('does not add log if error has _acked flag', () => {
      const error = new Error('error');
      error._acked = true;

      logger.error(error);
      logger.error('message', error);

      expect(publisher.addToBucket).to.not.have.been.called;
    });
  });

  describe('#withTags', () => {
    loggerOpts.is(() => ({tags: {foo: 'bar'}}));

    it('creates a logger with new tags', () => {
      const message = 'a message';
      const newLogger = logger.withTags({bar: 'baz'});

      newLogger.info(message);
      expectLog({
        level: 'info',
        attributes: [message],
        foo: 'bar',
        bar: 'baz'
      });
    });
  });

  describe('#enableLiveLogs', () => {
    beforeEach(() => {
      logger.enableLiveLogs();
    });

    it('forwards all logs also to Window Console', () => {
      logger.info('hello', {foo: 'bar'});
      expect(windowConsole.info).to.have.calledWith('hello', {
        foo: 'bar'
      });
    });

    it('saves live logging preference in local storage', () => {
      expect(localStorage['sm.live_logs']).to.eql('1');
    });
  });

  context('when liveLogsEnabled is set to true', () => {
    loggerOpts.is(() => ({liveLogsEnabled: true}));

    it('forwards all logs also to Window Console', () => {
      logger.info('hello', {foo: 'bar'});
      expect(windowConsole.info).to.have.calledWith('hello', {
        foo: 'bar'
      });
    });
  });

  context('when localStorage has live logs set to 1', () => {
    beforeEach(() => {
      localStorage['sm.live_logs'] = '1';
    });

    it('forwards all logs also to Window Console', () => {
      logger.info('hello', {foo: 'bar'});
      expect(windowConsole.info).to.have.calledWith('hello', {
        foo: 'bar'
      });
    });
  });

  function expectLog(expectedLog) {
    expect(publisher.addToBucket).to.have.been.calledWith(
      'logs',
      sinon.match(R.merge({timestamp: currentIsoDate()}, expectedLog))
    );
  }
});
