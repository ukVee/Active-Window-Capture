import OBSWebSocket, {
  EventSubscription,
  OBSRequestTypes,
  OBSResponseTypes,
} from 'obs-websocket-js';

export interface OBSConnectionConfig {
  url?: string;
  password?: string;
  eventSubscriptions?: number;
}

/**
 * Thin wrapper around obs-websocket-js with a fixed RPC version (1).
 */
export class ObsClient {
  private readonly obs = new OBSWebSocket();

  async connect(config: OBSConnectionConfig = {}): Promise<void> {
    const {
      url = 'ws://127.0.0.1:4455',
      password,
      eventSubscriptions = EventSubscription.Inputs |
        EventSubscription.Scenes |
        EventSubscription.SceneItems |
        EventSubscription.Transitions,
    } = config;

    await this.obs.connect(url, password, {
      rpcVersion: 1,
      eventSubscriptions,
    });
  }

  async disconnect(): Promise<void> {
    await this.obs.disconnect();
  }

  async call<
    T extends keyof OBSRequestTypes = keyof OBSRequestTypes,
    Req extends OBSRequestTypes[T] = OBSRequestTypes[T],
    Res extends OBSResponseTypes[T] = OBSResponseTypes[T],
  >(requestType: T, requestData?: Req): Promise<Res> {
    return (await this.obs.call(requestType, requestData)) as Res;
  }

  raw(): OBSWebSocket {
    return this.obs;
  }
}
