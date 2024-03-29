function CustomTransport(processFn) {
  if (!processFn) throw new Error('processFn must be specificed when using CustomTransport');
  this.process = processFn;
}

function HttpTransport(_ref) {
  var url = _ref.url,
    method = _ref.method,
    headers = _ref.headers,
    encode = _ref.encode;
  if (!url) throw new Error('url must be specificed when using HttpTransport');
  if (!method) method = 'POST';
  if (!headers) headers = {};
  if (!encode) encode = function encode(payload) {
    return JSON.stringify(payload);
  };

  // XMLHttpRequest is only used when Fetch API is not supported
  var sendUsingXMLHttpRequest = function sendUsingXMLHttpRequest(_ref2) {
    var payload = _ref2.payload;
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      Object.keys(headers).forEach(function (key) {
        xhr.setRequestHeader(key, headers[key]);
      });
      xhr.onload = function () {
        if (xhr.status < 200 || status >= 300) {
          reject();
        } else {
          resolve();
        }
      };
      xhr.onerror = function () {
        return reject();
      };
      xhr.send(encode(payload));
    });
  };

  /**
   * We prefer Fetch API beacuse it has `keepalive` flag. The keepalive option
   * can be used to allow the request to outlive the page. Fetch with the
   * keepalive flag is a replacement for the sendBeacon API.
   */
  var sendUsingFetchAPI = function sendUsingFetchAPI(_ref3) {
    var payload = _ref3.payload;
    return window.fetch(url, {
      method: method,
      headers: headers,
      keepalive: true,
      body: encode(payload)
    });
  };
  this.process = window.fetch ? sendUsingFetchAPI : sendUsingXMLHttpRequest;
}

function _typeof(o) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
    return typeof o;
  } : function (o) {
    return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
  }, _typeof(o);
}
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _createForOfIteratorHelper(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (!it) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;
      var F = function () {};
      return {
        s: F,
        n: function () {
          if (i >= o.length) return {
            done: true
          };
          return {
            done: false,
            value: o[i++]
          };
        },
        e: function (e) {
          throw e;
        },
        f: F
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var normalCompletion = true,
    didErr = false,
    err;
  return {
    s: function () {
      it = it.call(o);
    },
    n: function () {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    },
    e: function (e) {
      didErr = true;
      err = e;
    },
    f: function () {
      try {
        if (!normalCompletion && it.return != null) it.return();
      } finally {
        if (didErr) throw err;
      }
    }
  };
}

function Breadcrumbs() {
  var _this = this;
  this.list = [];
  this.add = function (crumb) {
    if (_this.list.length === 10) {
      _this.list = _this.list.slice(1);
    }
    _this.list.push(crumb);
  };
}

var merge = function merge(obj1, obj2) {
  var obj3 = {};
  for (var attrname in obj1) obj3[attrname] = obj1[attrname];
  for (var _attrname in obj2) obj3[_attrname] = obj2[_attrname];
  return obj3;
};
var evaluateTags = function evaluateTags(tags) {
  var result = {};
  for (var key in tags) {
    var value = tags[key];
    if (typeof value == 'function') {
      result[key] = value();
    } else {
      result[key] = value;
    }
  }
  return result;
};
var forEachEnumerableOwnProperty = function forEachEnumerableOwnProperty(obj, callback) {
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) callback(k);
  }
};
var primitives = ['string', 'number', 'boolean', 'null', 'undefined'];
function Logger(_ref) {
  var _arguments = arguments;
  var publisher = _ref.publisher,
    _ref$tags = _ref.tags,
    tags = _ref$tags === void 0 ? {} : _ref$tags,
    _ref$currentIsoDate = _ref.currentIsoDate,
    currentIsoDate = _ref$currentIsoDate === void 0 ? function () {
      return new Date().toISOString();
    } : _ref$currentIsoDate,
    _ref$maxObjectDepth = _ref.maxObjectDepth,
    maxObjectDepth = _ref$maxObjectDepth === void 0 ? 3 : _ref$maxObjectDepth,
    _ref$maxArrayLength = _ref.maxArrayLength,
    maxArrayLength = _ref$maxArrayLength === void 0 ? 10 : _ref$maxArrayLength,
    _ref$windowConsole = _ref.windowConsole,
    windowConsole = _ref$windowConsole === void 0 ? window.console : _ref$windowConsole,
    _ref$localStorage = _ref.localStorage,
    localStorage = _ref$localStorage === void 0 ? window.localStorage : _ref$localStorage,
    _ref$liveLogsKey = _ref.liveLogsKey,
    liveLogsKey = _ref$liveLogsKey === void 0 ? 'sm.live_logs' : _ref$liveLogsKey,
    _ref$liveLogsEnabled = _ref.liveLogsEnabled,
    liveLogsEnabled = _ref$liveLogsEnabled === void 0 ? false : _ref$liveLogsEnabled,
    _ref$whitelist = _ref.whitelist,
    whitelist = _ref$whitelist === void 0 ? {} : _ref$whitelist;
  var isWhiteListEmpty = Object.keys(whitelist).length === 0;
  var breadcrumbs = new Breadcrumbs();
  var add = function add(item) {
    return publisher.addToBucket('logs', item);
  };
  var isLiveLoggingEnabled = function isLiveLoggingEnabled() {
    return windowConsole && (liveLogsEnabled || localStorage[liveLogsKey] === '1');
  };
  var formatArray = function formatArray(arr, depthLevel) {
    var whiteListPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    if (maxObjectDepth === depthLevel) return ['-pruned-'];
    var formattedArray = [];
    for (var i = 0; i < arr.length; i++) {
      if (i === maxArrayLength) {
        var prevValue = arr[i - 1];

        // Our log consumer does not mixed objects in arrays,
        // i.e. cannot simply use '-pruned-' here.
        if (Array.isArray(prevValue)) {
          formattedArray.push(['-pruned-']);
        } else if (prevValue && _typeof(prevValue) === 'object') {
          formattedArray.push({
            pruned: true
          });
        } else {
          formattedArray.push('-pruned-');
        }
        break;
      }
      formattedArray.push(format(arr[i], depthLevel + 1, whiteListPath));
    }
    return formattedArray;
  };
  var getValueByPath = function getValueByPath(obj, path) {
    var result = obj;
    var _iterator = _createForOfIteratorHelper(path),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var part = _step.value;
        if (result && result.hasOwnProperty(part)) {
          result = result[part];
        } else {
          return undefined;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return result;
  };
  var formatObject = function formatObject(obj, depthLevel) {
    var whiteListPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    if (depthLevel === maxObjectDepth) {
      return '-pruned-';
    }
    var formatted = {};
    forEachEnumerableOwnProperty(obj, function (key) {
      var value = obj[key];
      if (isWhiteListEmpty || getValueByPath(whitelist, [].concat(_toConsumableArray(whiteListPath), [key]))) {
        formatted[key] = format(value, depthLevel + 1, [].concat(_toConsumableArray(whiteListPath), [key]));
      } else {
        // Our log consumer does not like mixed objects in arrays,
        // i.e. cannot simply use '-redacted-' here.
        if (Array.isArray(value)) {
          formatted[key] = ['-redacted-'];
        } else if (value && _typeof(value) === 'object') {
          formatted[key] = {
            redacted: true
          };
        } else {
          formatted[key] = '-redacted-';
        }
      }
    });
    return formatted;
  };
  var formatError = function formatError(error) {
    return {
      message: error.message,
      stack: error.stack
    };
  };
  var format = function format(obj) {
    var depthLevel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var whiteListPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    if (primitives.indexOf(_typeof(obj)) !== -1) return obj;else if (typeof obj === 'function') return '<Function>';else if (obj === null) return null;else if (obj instanceof Error) return formatError(obj);else if (Array.isArray(obj)) return formatArray(obj, depthLevel, whiteListPath);else return formatObject(obj, depthLevel, whiteListPath);
  };
  var log = function log(level) {
    return function () {
      if (isLiveLoggingEnabled()) {
        var writer = windowConsole[level] || windowConsole['log'];
        writer.apply(writer, arguments);
      }
      var attributes = Array.prototype.slice.call(arguments).map(function (arg) {
        return format(arg, 0);
      }).filter(function (attribute) {
        return attribute !== undefined;
      });
      var params = evaluateTags(tags);
      params = merge(params, {
        level: level,
        attributes: attributes,
        timestamp: currentIsoDate()
      });
      if (level === 'error') {
        params = merge(params, {
          breadcrumbs: breadcrumbs.list
        });
      } else {
        breadcrumbs.add(params);
      }
      add(params);
    };
  };
  var findTopLevelError = function findTopLevelError(args) {
    return args.filter(function (arg) {
      return arg instanceof Error;
    })[0];
  };
  this.debug = log('debug');
  this.log = log('info');
  this.info = log('info');
  this.warn = log('warn');
  this.error = function () {
    var args = Array.prototype.slice.call(arguments);
    var maybeError = findTopLevelError(args);
    if (maybeError && maybeError._acked) {
      return;
    }
    if (typeof args[0] === 'string' && !maybeError) args[0] = new Error(args[0]);
    return log('error').apply(null, args);
  };
  this.withTags = function (newTags) {
    return new Logger(merge(_arguments[0], {
      tags: merge(tags, newTags)
    }));
  };
  this.enableLiveLogs = function () {
    return localStorage[liveLogsKey] = '1';
  };
}

var objectValues = function objectValues(obj) {
  return Object.keys(obj).map(function (k) {
    return obj[k];
  });
};
function Publisher() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
    _ref$publishInterval = _ref.publishInterval,
    publishInterval = _ref$publishInterval === void 0 ? 3000 : _ref$publishInterval,
    _ref$maximumBatchSize = _ref.maximumBatchSize,
    maximumBatchSize = _ref$maximumBatchSize === void 0 ? 50 : _ref$maximumBatchSize,
    _ref$maximumBufferSiz = _ref.maximumBufferSize,
    maximumBufferSize = _ref$maximumBufferSiz === void 0 ? 1000 : _ref$maximumBufferSiz,
    _ref$maximumConsecuti = _ref.maximumConsecutiveRetries,
    maximumConsecutiveRetries = _ref$maximumConsecuti === void 0 ? 10 : _ref$maximumConsecuti,
    _ref$transports = _ref.transports,
    transports = _ref$transports === void 0 ? [] : _ref$transports;
  var addTransport = function addTransport(transport) {
    var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      position = _ref2.position;
    // In normal languages we could just do `position || transports.length`. In
    // javascript however 0 is treated as false which sets the position to
    // transports.length.
    if (position === undefined) position = transports.length;
    transports.splice(position, 0, transport);
  };
  var buckets = {};
  var retries = {};
  var send = function send(_ref3) {
    var transports = _ref3.transports,
      payload = _ref3.payload;
    if (transports.length === 0) return Promise.reject();
    return transports[0].process({
      payload: payload
    })["catch"](function () {
      return send({
        payload: payload,
        transports: transports.slice(1)
      });
    });
  };
  var isEmptyPayload = function isEmptyPayload(payload) {
    return Object.keys(payload).length === 0 || objectValues(payload).every(function (items) {
      return items.length === 0;
    });
  };
  var flush = function flush() {
    var payload = {};
    Object.keys(buckets).forEach(function (key) {
      payload[key] = buckets[key].splice(0, maximumBatchSize);
    });
    if (!isEmptyPayload(payload)) {
      return send({
        transports: transports,
        payload: payload
      }).then(function () {
        // On succesful send, reset all retry counts
        Object.keys(retries).forEach(function (bucketKey) {
          return retries[bucketKey] = 0;
        });
        return Promise.resolve();
      })["catch"](function () {
        Object.keys(payload).forEach(function (key) {
          retries[key]++;
          if (retries[key] < maximumConsecutiveRetries) {
            buckets[key] = payload[key].concat(buckets[key]);
          } else {
            // Reset retries when maximumConsecutiveRetries is reached
            retries[key] = 0;
          }
        });
        return Promise.reject();
      });
    } else {
      return Promise.resolve();
    }
  };
  var started = false;
  var timer = null;
  var flushInProgress = false;
  var start = function start() {
    if (started) throw new Error('Publisher is already started');
    started = true;
    timer = setInterval(function () {
      if (!flushInProgress) {
        flushInProgress = true;
        flush().then(function () {
          return flushInProgress = false;
        }, function () {
          return flushInProgress = false;
        });
      }
    }, publishInterval);
    window.addEventListener('unload', flush);
  };
  var stop = function stop() {
    started = false;
    clearInterval(timer);
  };
  var addToBucket = function addToBucket(bucketKey, item) {
    if (!buckets[bucketKey]) {
      if (!retries[bucketKey]) {
        retries[bucketKey] = 0;
      }
      buckets[bucketKey] = [];
    }
    buckets[bucketKey].push(item);
    buckets[bucketKey].splice(maximumBufferSize);
  };
  return {
    start: start,
    stop: stop,
    addToBucket: addToBucket,
    flush: flush,
    buckets: buckets,
    addTransport: addTransport,
    transports: transports
  };
}

function StatsRecorder(_ref) {
  var publisher = _ref.publisher,
    _ref$globalTags = _ref.globalTags,
    globalTags = _ref$globalTags === void 0 ? [] : _ref$globalTags;
  var add = function add(item) {
    return publisher.addToBucket('stats', item);
  };
  var buildStat = function buildStat(stat, metric, value, tags) {
    if (!tags) tags = [];
    return {
      stat: stat,
      params: [metric, value, globalTags.concat(tags)]
    };
  };
  this.increment = function (metric, value, tags) {
    if (isNaN(parseInt(value))) {
      tags = value;
      value = 1;
    }
    add(buildStat('increment', metric, value, tags));
  };
  this.decrement = function (metric, value, tags) {
    if (isNaN(parseInt(value))) {
      tags = value;
      value = 1;
    }
    add(buildStat('decrement', metric, value, tags));
  };
  this.gauge = function (metric, value, tags) {
    add(buildStat('gauge', metric, value, tags));
  };
  this.histogram = function (metric, value, tags) {
    add(buildStat('histogram', metric, value, tags));
  };
  this.timing = function (metric, value, tags) {
    add(buildStat('timing', metric, value, tags));
  };
  this.set = function (metric, value, tags) {
    add(buildStat('set', metric, value, tags));
  };
  this.withTags = function (tags) {
    return new StatsRecorder({
      publisher: publisher,
      globalTags: globalTags.concat(tags)
    });
  };
}

var transports = {
  CustomTransport: CustomTransport,
  HttpTransport: HttpTransport
};

export { Logger, Publisher, StatsRecorder, transports };
