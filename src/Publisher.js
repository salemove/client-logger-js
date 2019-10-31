const objectValues = obj => Object.keys(obj).map(k => obj[k]);

export default function Publisher({
  publishInterval = 3000, // in milliseconds
  maximumBatchSize = 50,
  maximumBufferSize = 1000,
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
      return send({transports, payload}).catch(() => {
        Object.keys(payload).forEach(key => {
          buckets[key] = payload[key].concat(buckets[key]);
        });
        return Promise.reject();
      });
    } else {
      return Promise.resolve();
    }
  };

  let started = false;
  const start = () => {
    if (started) throw new Error('Publisher is already started');
    started = true;
    setInterval(flush, publishInterval);
    window.addEventListener('unload', flush);
  };

  const addToBucket = (bucketKey, item) => {
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
    }

    buckets[bucketKey].push(item);
    buckets[bucketKey].splice(maximumBufferSize);
  };

  return {start, addToBucket, flush, buckets, addTransport, transports};
}
