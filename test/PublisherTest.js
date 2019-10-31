import {expect, sinon} from './TestHelper';
import R from 'ramda';
import Publisher from '../src/Publisher';

describe('Publisher', () => {
  let transport;

  const defaultOpts = {
    publishInterval: 3000,
    maximumBatchSize: 10,
    maximumBufferSize: 40
  };

  beforeEach(() => {
    transport = {process: sinon.stub().resolves()};
    defaultOpts.transports = [transport];
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
});
