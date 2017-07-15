import {IPluginLoader, ILogger, IConfig, IEventBus, ISettable, IClassTypeFactory} from '@homenet/core';
import * as mqtt from 'mqtt';

interface IMqttConfig extends IConfig {
  mqtt: {
    host?: string;
  }
}

export function create(annotate: any): { MqttPublisherPluginLoader: new(...args: any[]) => IPluginLoader } {
  @annotate.plugin()
  class MqttPublisherPluginLoader implements IPluginLoader {
    private mqttConnected : boolean = false;
    private mqttClient : any;

    constructor(
            @annotate.service('IConfig') private config: IMqttConfig,
            @annotate.service('IEventBus') private events: IEventBus,
            @annotate.service('ILogger') private logger: ILogger) {
      this.init();
    }

    load() : void {
      this.logger.info('Loading MQTT publisher');
      this.events.onAny((name, e) => {
        const { data } = e;
        const topic = name.replace(/\./g, '/');
        this.mqttClient.publish(topic, e);
      });
    }

    private init() : void {
      this.logger.info('Starting MQTT publisher');

      const mqttConfig = this.config.mqtt || {};
      const host = mqttConfig.host || 'localhost';
      const mqttUri = 'mqtt://' + host;

      this.logger.info('Connecting to broker ' + mqttUri);
      const mqttClient  = mqtt.connect(mqttUri);
      this.mqttConnected = false;

      mqttClient.on('connect', () => {
        this.logger.info('MQTT connected');
        this.mqttConnected = true;
      });

      mqttClient.on('close', () => {
        this.logger.info('MQTT closed');
        this.mqttConnected = false;
      });

      mqttClient.on('offline', () => {
        this.logger.info('MQTT offline');
        this.mqttConnected = false;
      });

      this.mqttClient = mqttClient;

      // mqttClient.on('error', console.error);
      // mqttClient.on('message', console.log);
      // mqttClient.on('message', (topic, message) => {});
    }
  }

  return { MqttPublisherPluginLoader };
}
