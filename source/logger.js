// @flow

//
// INTEL CONFIDENTIAL
//
// Copyright 2013-2017 Intel Corporation All Rights Reserved.
//
// The source code contained or described herein and all documents related
// to the source code ("Material") are owned by Intel Corporation or its
// suppliers or licensors. Title to the Material remains with Intel Corporation
// or its suppliers and licensors. The Material contains trade secrets and
// proprietary and confidential information of Intel or its suppliers and
// licensors. The Material is protected by worldwide copyright and trade secret
// laws and treaty provisions. No part of the Material may be used, copied,
// reproduced, modified, published, uploaded, posted, transmitted, distributed,
// or disclosed in any way without Intel's prior express written permission.
//
// No license under any patent, copyright, trade secret or other intellectual
// property right is granted to or conferred upon you by disclosure or delivery
// of the Materials, either expressly, by implication, inducement, estoppel or
// otherwise. Any license under such intellectual property rights must be
// express and approved by Intel in writing.

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
  (passedLevel <= expectedLevel
    ? parseRecord(s, serializers, expectedLevel, base)
    : () => {});

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
