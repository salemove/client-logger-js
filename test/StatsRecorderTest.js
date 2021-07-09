import {expect, sinon} from './TestHelper';
import R from 'ramda';
import StatsRecorder from '../src/StatsRecorder';

describe('StatsRecorder', () => {
  let publisher;
  let defaultOpts;

  beforeEach(() => {
    publisher = {addToBucket: sinon.stub()};
    defaultOpts = {publisher};
  });

  describe('#increment', () => {
    itBehavesLikeStandardMetric('increment');
    itBehavesLikeMetricWithDefaultValue('increment', 1);
  });

  describe('#decrement', () => {
    itBehavesLikeStandardMetric('decrement');
    itBehavesLikeMetricWithDefaultValue('decrement', 1);
  });

  describe('#gauge', () => {
    itBehavesLikeStandardMetric('gauge');
  });

  describe('#histogram', () => {
    itBehavesLikeStandardMetric('histogram');
  });

  describe('#timing', () => {
    itBehavesLikeStandardMetric('timing');
  });

  describe('#set', () => {
    itBehavesLikeStandardMetric('set');
  });

  describe('#withTags', () => {
    it('returns a new stats recorder with new tags', () => {
      const initialTags = ['foo:bar'];
      const opts = R.merge(defaultOpts, {globalTags: initialTags});
      const statsRecorder = new StatsRecorder(opts);

      const newTags = ['bar:baz'];
      const statsRecorder2 = statsRecorder.withTags(newTags);

      const metricName = 'metric-name';
      const metricValue = 1;
      statsRecorder2.increment(metricName, metricValue);

      expectStat({
        stat: 'increment',
        params: [metricName, metricValue, initialTags.concat(newTags)]
      });
    });
  });

  function itBehavesLikeStandardMetric(name) {
    it(`records '${name}' metric`, () => {
      const statsRecorder = new StatsRecorder(defaultOpts);
      const metricName = 'metric-name';
      const metricValue = 5;
      statsRecorder[name](metricName, metricValue);

      expectStat({stat: name, params: [metricName, metricValue, []]});
    });

    it(`records '${name}' metric with global tags`, () => {
      const globalTags = ['foo:bar'];
      const opts = R.merge(defaultOpts, {globalTags});
      const statsRecorder = new StatsRecorder(opts);
      const metricName = 'metric-name';
      const metricValue = 5;
      statsRecorder[name](metricName, metricValue);

      expectStat({stat: name, params: [metricName, metricValue, globalTags]});
    });

    it(`records '${name}' metric with custom tags`, () => {
      const statsRecorder = new StatsRecorder(defaultOpts);
      const metricName = 'metric-name';
      const metricValue = 5;
      const tags = ['foo:bar'];
      statsRecorder[name](metricName, metricValue, tags);

      expectStat({stat: name, params: [metricName, metricValue, tags]});
    });
  }

  function itBehavesLikeMetricWithDefaultValue(name, defaultValue) {
    it(`records '${name}' metric with default value`, () => {
      const statsRecorder = new StatsRecorder(defaultOpts);
      const metricName = 'metric-name';
      statsRecorder[name](metricName);

      expectStat({stat: name, params: [metricName, defaultValue, []]});
    });

    it(`records '${name}' metric with value of one and tags if value is not present`, () => {
      const statsRecorder = new StatsRecorder(defaultOpts);
      const metricName = 'metric-name';
      const metricTags = ['foo:bar'];
      statsRecorder[name](metricName, metricTags);

      expectStat({stat: name, params: [metricName, 1, metricTags]});
    });
  }

  function expectStat(expectedStat) {
    expect(publisher.addToBucket).to.have.been.calledWith('stats', expectedStat);
  }
});
