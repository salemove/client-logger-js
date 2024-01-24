import Breadcrumbs from './Breadcrumbs';

const merge = (obj1, obj2) => {
  const obj3 = {};
  for (const attrname in obj1) obj3[attrname] = obj1[attrname];
  for (const attrname in obj2) obj3[attrname] = obj2[attrname];
  return obj3;
};

const evaluateTags = tags => {
  const result = {};
  for (const key in tags) {
    const value = tags[key];
    if (typeof value == 'function') {
      result[key] = value();
    } else {
      result[key] = value;
    }
  }
  return result;
};

const forEachEnumerableOwnProperty = (obj, callback) => {
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) callback(k);
  }
};

const primitives = ['string', 'number', 'boolean', 'null', 'undefined'];

export default function Logger({
  publisher,
  tags = {},
  currentIsoDate = () => new Date().toISOString(),
  maxObjectDepth = 3,
  maxArrayLength = 10,
  windowConsole = window.console,
  localStorage = window.localStorage,
  liveLogsKey = 'sm.live_logs',
  liveLogsEnabled = false,
  whitelist = []
}) {
  // Keeping whitelist as array looks better. We can still get the performance of
  // hash by transforming the array into an object at Logger initialisation.
  var optimizedWhitelist = {};
  for (var i = 0; i < whitelist.length; i++) {
    optimizedWhitelist[whitelist[i]] = true;
  }

  const breadcrumbs = new Breadcrumbs();
  const add = item => publisher.addToBucket('logs', item);

  const isLiveLoggingEnabled = () =>
    windowConsole && (liveLogsEnabled || localStorage[liveLogsKey] === '1');

  const formatArray = (arr, depthLevel) => {
    if (maxObjectDepth === depthLevel) return ['-pruned-'];

    const formattedArray = [];

    for (let i = 0; i < arr.length; i++) {
      if (i === maxArrayLength) {
        const prevValue = arr[i - 1];

        // Our log consumer does not mixed objects in arrays,
        // i.e. cannot simply use '-pruned-' here.
        if (Array.isArray(prevValue)) {
          formattedArray.push(['-pruned-']);
        } else if (prevValue && typeof prevValue === 'object') {
          formattedArray.push({pruned: true});
        } else {
          formattedArray.push('-pruned-');
        }
        break;
      }

      formattedArray.push(format(arr[i], depthLevel + 1));
    }

    return formattedArray;
  };

  const formatObject = (obj, depthLevel) => {
    if (maxObjectDepth === depthLevel) return '-pruned-';
    const formatted = {};

    forEachEnumerableOwnProperty(obj, key => {
      const value = obj[key];

      if (whitelist.length === 0 || optimizedWhitelist[key]) {
        formatted[key] = format(value, depthLevel + 1);
      } else {
        // Our log consumer does not mixed objects in arrays,
        // i.e. cannot simply use '-redacted-' here.
        if (Array.isArray(value)) {
          formatted[key] = ['-redacted-'];
        } else if (value && typeof value === 'object') {
          formatted[key] = {redacted: true};
        } else {
          formatted[key] = '-redacted-';
        }
      }
    });

    return formatted;
  };

  const formatError = error => {
    return {message: error.message, stack: error.stack};
  };

  const format = (obj, depthLevel = 0) => {
    if (primitives.indexOf(typeof obj) !== -1) return obj;
    else if (typeof obj === 'function') return '<Function>';
    else if (obj === null) return null;
    else if (obj instanceof Error) return formatError(obj);
    else if (Array.isArray(obj)) return formatArray(obj, depthLevel);
    else return formatObject(obj, depthLevel);
  };

  const log = level => {
    return function () {
      if (isLiveLoggingEnabled()) {
        const writer = windowConsole[level] || windowConsole['log'];
        writer.apply(writer, arguments);
      }

      const attributes = Array.prototype.slice
        .call(arguments)
        .map(arg => format(arg, 0))
        .filter(attribute => attribute !== undefined);

      let params = evaluateTags(tags);
      params = merge(params, {
        level,
        attributes,
        timestamp: currentIsoDate()
      });

      if (level === 'error') {
        params = merge(params, {breadcrumbs: breadcrumbs.list});
      } else {
        breadcrumbs.add(params);
      }
      add(params);
    };
  };

  const findTopLevelError = args => args.filter(arg => arg instanceof Error)[0];

  this.debug = log('debug');
  this.log = log('info');
  this.info = log('info');
  this.warn = log('warn');
  this.error = function () {
    const args = Array.prototype.slice.call(arguments);
    const maybeError = findTopLevelError(args);

    if (maybeError && maybeError._acked) {
      return;
    }

    if (typeof args[0] === 'string' && !maybeError) args[0] = new Error(args[0]);

    return log('error').apply(null, args);
  };

  this.withTags = newTags => new Logger(merge(arguments[0], {tags: merge(tags, newTags)}));

  this.enableLiveLogs = () => (localStorage[liveLogsKey] = '1');
}
