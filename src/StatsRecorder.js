export default function StatsRecorder({publisher, globalTags = []}) {
  const add = item => publisher.addToBucket('stats', item);

  const buildStat = (stat, metric, value, tags) => {
    if (!tags) tags = [];

    return {stat, params: [metric, value, globalTags.concat(tags)]};
  };

  this.increment = (metric, value, tags) => {
    if (isNaN(parseInt(value))) {
      tags = value;
      value = 1;
    }

    add(buildStat('increment', metric, value, tags));
  };

  this.decrement = (metric, value, tags) => {
    if (isNaN(parseInt(value))) {
      tags = value;
      value = 1;
    }

    add(buildStat('decrement', metric, value, tags));
  };

  this.gauge = (metric, value, tags) => {
    add(buildStat('gauge', metric, value, tags));
  };

  this.histogram = (metric, value, tags) => {
    add(buildStat('histogram', metric, value, tags));
  };

  this.timing = (metric, value, tags) => {
    add(buildStat('timing', metric, value, tags));
  };

  this.set = (metric, value, tags) => {
    add(buildStat('set', metric, value, tags));
  };

  this.withTags = tags => {
    return new StatsRecorder({publisher, globalTags: globalTags.concat(tags)});
  };
}
