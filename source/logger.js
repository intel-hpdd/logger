// @flow

//
// Copyright (c) 2018 DDN. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

import fs from 'fs';
import os from 'os';

type confT = {
  name: string,
  path: string,
  level: 30 | 50,
  serializers: {
    [key: string]: (x: any) => mixed
  }
};

export const LEVELS = {
  INFO: 30,
  ERROR: 50
};

export const serializers = {
  err(e: ?child_process$Error) {
    if (!e || !e.stack) return e;

    return {
      message: e.message,
      name: e.name,
      stack: e.stack,
      signal: e.signal,
      code: e.code
    };
  }
};

export default (config: confT) => {
  const s = fs.createWriteStream(config.path, {
    flags: 'a',
    encoding: 'utf8'
  });

  const base = {
    name: config.name,
    pid: process.pid,
    hostname: os.hostname(),
    v: 0
  };

  return createLogger(base, s, config);
};

const createLogger = (base, s, config) => ({
  child: (r: Object) => {
    return createLogger(
      {
        ...base,
        ...r
      },
      s,
      config
    );
  },
  info: getLevelLogger(config.level, LEVELS.INFO, s, config.serializers, base),
  error: getLevelLogger(config.level, LEVELS.ERROR, s, config.serializers, base)
});

const getLevelLogger = (passedLevel, expectedLevel, s, serializers, base) =>
  passedLevel <= expectedLevel
    ? parseRecord(s, serializers, expectedLevel, base)
    : (...args: any[]) => {}; // eslint-disable-line no-unused-vars

const parseRecord = (s, serializers, level, base) => (
  r: string | {},
  msg: string = ''
) => {
  if (typeof r === 'string') {
    msg = r;
    r = {};
  }

  type logObj = $Shape<{
    hostname: string,
    name: string,
    pid: number,
    v: number,
    msg: string,
    level: 30 | 50,
    time: string
  }>;

  const result: logObj = {
    ...base,
    ...r,
    msg,
    level,
    time: new Date().toISOString()
  };

  const out = Object.keys(result).reduce((x: logObj, k: string): logObj => {
    const val = result[k];
    const serialized = serializers[k] && serializers[k](val);

    return {
      ...x,
      [k]: serialized || val
    };
  }, {});

  s.write(`${JSON.stringify(out)}\n`);
};
