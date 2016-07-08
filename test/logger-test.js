// @flow

import proxyquire from 'proxyquire';

import {
  describe,
  beforeEach,
  it,
  jasmine,
  expect
} from './jasmine.js';


describe('logger', () => {
  let logger, fs, s, mostRecentWrite;

  beforeEach(() => {
    s = {
      write: jasmine.createSpy('write')
    };

    mostRecentWrite = () => {
      const mostRecent = s
        .write
        .calls
        .mostRecent()
        .args[0];

      return JSON.parse(mostRecent);
    };

    fs = {
      createWriteStream: jasmine
        .createSpy('createWriteStream')
        .and
        .returnValue(s)
    };

    logger = proxyquire
      .noPreserveCache()
      .noCallThru()('../source/logger', {
        fs,
        os: {
          hostname: () => 'host'
        }
      }).default;
  });

  it('should be a funtion', () => {
    expect(logger)
      .toEqual(jasmine.any(Function));
  });

  it('should not write for lower levels', () => {
    const inst = logger(
      {
        path: 'foo/bar/log.txt',
        level: 50,
        name: 'log',
        serializers: {}
      }
    );

    inst.info({foo: 'bar'});

    expect(s.write)
      .not
      .toHaveBeenCalled();
  });

  describe('creating an instance', () => {
    let inst;

    beforeEach(() => {
      inst = logger(
        {
          path: 'foo/bar/log.txt',
          level: 30,
          name: 'log',
          serializers: {
            sock: sock => {
              if (!sock)
                return false;

              if (sock === 3)
                return false;

              return {
                id: sock.id
              };
            }
          }
        }
      );
    });

    it('should return a logger object', () => {
      expect(
        inst
      )
      .toEqual({
        child: jasmine.any(Function),
        info: jasmine.any(Function),
        error: jasmine.any(Function)
      });
    });

    it('should create a writeStream', () => {
      expect(fs.createWriteStream)
        .toHaveBeenCalledOnceWith('foo/bar/log.txt', {
          flags: 'a',
          encoding: 'utf8'
        });
    });

    it('should log out info', () => {
      inst.info({
        foo: 'bar'
      }, 'It\'s loggin time!');

      expect(mostRecentWrite())
        .toEqual({
          name: 'log',
          level: 30,
          pid: jasmine.any(Number),
          v: 0,
          hostname: 'host',
          foo: 'bar',
          msg: 'It\'s loggin time!',
          time: jasmine.any(String)
        });
    });

    it('should log for error', () => {
      inst.error(
        { foo: 'bar'
      });

      expect(mostRecentWrite())
        .toEqual({
          name: 'log',
          level: 50,
          pid: jasmine.any(Number),
          v: 0,
          hostname: 'host',
          foo: 'bar',
          time: jasmine.any(String)
        });
    });

    it('should utilize serializers', () => {
      inst.info({
        sock: {
          id: 5,
          bar: 'baz'
        }
      });

      expect(mostRecentWrite())
        .toEqual({
          name: 'log',
          level: 30,
          pid: jasmine.any(Number),
          v: 0,
          hostname: 'host',
          sock: {
            id: 5
          },
          time: jasmine.any(String)
        });
    });

    it('should keep existing if serializer does not match', () => {
      inst.info({
        sock: 3
      });

      expect(mostRecentWrite())
        .toEqual({
          name: 'log',
          level: 30,
          pid: jasmine.any(Number),
          v: 0,
          hostname: 'host',
          sock: 3,
          time: jasmine.any(String)
        });
    });

    it('should create a child logger', () => {
      inst
        .child({
          fromParent: true
        })
        .info({
          bar: 'baz'
        });

      expect(mostRecentWrite())
        .toEqual({
          name: 'log',
          level: 30,
          pid: jasmine.any(Number),
          v: 0,
          hostname: 'host',
          fromParent: true,
          bar: 'baz',
          time: jasmine.any(String)
        });
    });
  });
});
