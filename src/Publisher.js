const objectValues = obj => Object.keys(obj).map(k => obj[k]);

export default function Publisher({
  publishInterval = 3000, // in milliseconds
  maximumBatchSize = 50,
  maximumBufferSize = 1000,
  maximumConsecutiveRetries = 10,
  transports = []
} = {}) {
  const addTransport = (transport, {position} = {}) => {
    // In normal languages we could just do `position || transports.length`. In
    // javascript however 0 is treated as false which sets the position to
    // transports.length.
    if (position === undefined) position = transports.length;
    transports.splice(position, 0, transport);
  };

  const buckets = {};
  const retries = {};

  const send = ({transports, payload}) => {
    if (transports.length === 0) return Promise.reject();

    return transports[0].process({payload}).catch(() =>
      send({
        payload,
        transports: transports.slice(1)
      })
    );
  };

  const isEmptyPayload = payload =>
    Object.keys(payload).length === 0 ||
    objectValues(payload).every(items => items.length === 0);

  const flush = () => {
    const payload = {};
    Object.keys(buckets).forEach(key => {
      payload[key] = buckets[key].splice(0, maximumBatchSize);
    });
    if (!isEmptyPayload(payload)) {
      return send({transports, payload})
        .then(() => {
          // On succesful send, reset all retry counts
          Object.keys(retries).forEach(bucketKey => (retries[bucketKey] = 0));
          return Promise.resolve();
        })
        .catch(() => {
          Object.keys(payload).forEach(key => {
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

  let started = false;
  let timer = null;
  let flushInProgress = false;

  const start = () => {
    if (started) throw new Error('Publisher is already started');
    started = true;
    timer = setInterval(() => {
      if (!flushInProgress) {
        flushInProgress = true;
        flush().then(
          () => (flushInProgress = false),
          () => (flushInProgress = false)
        );
      }
    }, publishInterval);
    window.addEventListener('unload', flush);
  };

  const stop = () => {
    started = false;
    clearInterval(timer);
  };

  const addToBucket = (bucketKey, item) => {
    if (!buckets[bucketKey]) {
      if (!retries[bucketKey]) {
        retries[bucketKey] = 0;
      }
      buckets[bucketKey] = [];
    }
    buckets[bucketKey].push(item);
    buckets[bucketKey].splice(maximumBufferSize);
  };

  return {start, stop, addToBucket, flush, buckets, addTransport, transports};
}
