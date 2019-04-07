import CustomTransport from './transports/CustomTransport';
import HttpTransport from './transports/HttpTransport';
import Logger from './Logger';
import Publisher from './Publisher';
import StatsRecorder from './StatsRecorder';

export default {
  Logger,
  Publisher,
  StatsRecorder,
  transports: {
    CustomTransport,
    HttpTransport
  }
};
