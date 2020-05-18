import {expect, sinon} from './TestHelper';
import R from 'ramda';
import Publisher from '../src/Publisher';

describe('Publisher', () => {
  let transport;

  const defaultOpts = {
    publishInterval: 3000,
    maximumBatchSize: 10,
    maximumBufferSize: 40,
    maximumConsecutiveRetries: 10
  };

  beforeEach(() => {
    transport = {process: sinon.stub().resolves()};
    defaultOpts.transports = [transport];
    global.window = {addEventListener: sinon.stub()};
  });

  afterEach(() => {
    delete global['window'];
  });

  it('does not send anything when there are no buckets', () => {
    const publisher = new Publisher(defaultOpts);

    return publisher.flush().then(() => {
      expect(transport.process.callCount).to.eql(0);
    });
  });

  it('does not send anything when buckets are empty', () => {
    const publisher = new Publisher(defaultOpts);

    publisher.addToBucket('bucket', 'item');
    return publisher
      .flush()
      .then(() => transport.process.reset())
      .then(() => publisher.flush())
      .then(() => expect(transport.process.callCount).to.eql(0));
  });

  it('re-enqueues failed items', () => {
    transport.process.returns(Promise.reject());
    const publisher = new Publisher(defaultOpts);

    publisher.addToBucket('logs', 'first-log');
    return publisher
      .flush()
      .catch(() => expect(publisher.buckets['logs']).to.eql(['first-log']));
  });

  it('does not re-enqueue payload if maximumConsecutiveRetries is reached', () => {
    transport.process.returns(Promise.reject());
    const maximumConsecutiveRetries = 2;
    const maximumBatchSize = 10;
    const opts = R.merge(defaultOpts, {
      maximumConsecutiveRetries,
      maximumBatchSize
    });
    const publisher = new Publisher(opts);

    R.times(() => {
      publisher.addToBucket('logs', 'item');
    }, 25);
    return publisher
      .flush()
      .catch(() => publisher.flush())
      .catch(() => expect(publisher.buckets['logs'].length).to.eql(15));
  });

  it('re-enqueues payload after maximumConsecutiveRetries is reset', () => {
    transport.process.returns(Promise.reject());
    const maximumConsecutiveRetries = 2;
    const maximumBatchSize = 10;
    const opts = R.merge(defaultOpts, {
      maximumConsecutiveRetries,
      maximumBatchSize
    });
    const publisher = new Publisher(opts);

    R.times(() => {
      publisher.addToBucket('logs', 'item');
    }, 40);
    // Try send 10 logs
    return (
      publisher
        .flush()
        // fails, try again
        .catch(() => publisher.flush())
        // fails, try again, payload discarded
        .catch(() => publisher.flush())
        // fails, does not discard
        .catch(() => expect(publisher.buckets['logs'].length).to.eql(30))
    );
  });

  it('re-enqueues logs after a succesful request', () => {
    transport.process.returns(Promise.reject());
    const maximumConsecutiveRetries = 2;
    const maximumBatchSize = 10;
    const opts = R.merge(defaultOpts, {
      maximumConsecutiveRetries,
      maximumBatchSize
    });
    const publisher = new Publisher(opts);

    R.times(() => {
      publisher.addToBucket('logs', 'item');
    }, 40);

    return (
      publisher
        .flush()
        // flush fails
        .catch(() => {
          // Payload is put back in buckets
          transport.process.returns(Promise.resolve());
          return publisher.flush().then(() => {
            // Flush succeeds, next 10 logs are tried
            transport.process.returns(Promise.reject());
            return (
              publisher
                .flush()
                // Flush fails, payload is put back in buckets
                .catch(() =>
                  expect(publisher.buckets['logs'].length).to.eql(30)
                )
            );
          });
        })
    );
  });

  it('does not re-enqueue successfully sent items', () => {
    const publisher = new Publisher(defaultOpts);

    publisher.addToBucket('logs', 'first-log');
    return publisher
      .flush()
      .then(() => expect(publisher.buckets['logs']).to.eql([]));
  });

  it('sends maximally maximumBatchSize of items from each bucket', () => {
    const maximumBatchSize = 3;
    const opts = R.merge(defaultOpts, {maximumBatchSize});
    const publisher = new Publisher(opts);

    R.times(() => {
      publisher.addToBucket('bucket1', 'item');
      publisher.addToBucket('bucket2', 'item');
    }, maximumBatchSize + 1);

    return publisher.flush().then(() => {
      expect(transport.process.callCount).to.eql(1);
      expect(publisher.buckets['bucket1'].length).to.eql(1);
      expect(publisher.buckets['bucket2'].length).to.eql(1);
    });
  });

  it('discards items over maximumBufferSize per bucket', () => {
    const maximumBufferSize = 5;
    const publisher = new Publisher(R.merge(defaultOpts, {maximumBufferSize}));

    const items = R.times(n => `item-${n}`, maximumBufferSize + 1);
    items.forEach(item => publisher.addToBucket('bucket', item));

    expect(publisher.buckets['bucket']).to.eql(
      R.take(maximumBufferSize, items)
    );
  });

  it('does not send payload over a secondary transport when primary succeeds', () => {
    const primary = {process: sinon.stub().resolves()};
    const secondary = {process: sinon.stub().rejects()};
    const transports = [primary, secondary];
    const publisher = new Publisher(R.merge(defaultOpts, {transports}));

    publisher.addToBucket('logs', 'first-log');
    return publisher.flush().then(() => {
      expect(primary.process.callCount).to.eql(1);
      expect(secondary.process.callCount).to.eql(0);
    });
  });

  it('sends payload over a secondary transport when primary fails', () => {
    const primary = {process: sinon.stub().rejects()};
    const secondary = {process: sinon.stub().resolves()};
    const transports = [primary, secondary];
    const publisher = new Publisher(R.merge(defaultOpts, {transports}));

    publisher.addToBucket('logs', 'first-log');
    return publisher.flush().then(() => {
      expect(primary.process.callCount).to.eql(1);
      expect(secondary.process.callCount).to.eql(1);
    });
  });

  it('adds a new transport', () => {
    const transport1 = 'transport-1';
    const transport2 = 'transport-2';
    const publisher = new Publisher(R.merge(defaultOpts, {transports: []}));
    publisher.addTransport(transport1);
    publisher.addTransport(transport2);

    expect(publisher.transports).to.eql([transport1, transport2]);
  });

  it('adds a new transport to the first position', () => {
    const transport1 = 'transport-1';
    const transport2 = 'transport-2';
    const publisher = new Publisher(R.merge(defaultOpts, {transports: []}));
    publisher.addTransport(transport2);
    publisher.addTransport(transport1, {position: 0});

    expect(publisher.transports).to.eql([transport1, transport2]);
  });

  const delay = (millis, value) =>
    new Promise((resolve, reject) =>
      setTimeout(resolve.bind(null, value), millis)
    );

  const createControlledTransport = () => {
    let latestProcessController;
    const storePromiseControl = () =>
      new Promise(
        (resolve, reject) => (latestProcessController = {resolve, reject})
      );
    const controlledPromise = {
      then: sinon.stub().callsFake(storePromiseControl),
      catch: sinon.stub().callsFake(storePromiseControl)
    };

    const transport = {process: sinon.stub().returns(controlledPromise)};
    const getLatestProcessController = () => latestProcessController;

    return {transport, getLatestProcessController};
  };

  it('does not start another flush while a previous one is pending', () => {
    const publishInterval = 1;
    const {getLatestProcessController, transport} = createControlledTransport();
    const publisher = new Publisher(
      R.merge(defaultOpts, {transports: [transport], publishInterval})
    );

    publisher.addToBucket('logs', 'first-log');

    publisher.start();
    return delay(publishInterval + 1)
      .then(() => {
        expect(transport.process.callCount).to.eql(1);
        publisher.addToBucket('logs', 'second-log');
        return delay(publishInterval + 1);
      })
      .then(() => {
        // transport process has not resolved
        expect(transport.process.callCount).to.eql(1);
        getLatestProcessController().resolve();
        return delay(publishInterval + 1);
      })
      .then(() => {
        expect(transport.process.callCount).to.eql(2);
        publisher.stop();
      });
  });
});
