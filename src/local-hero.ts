import DefaultHero, {
  ConnectionToHeroCore,
  IConnectionToCoreOptions,
  IHeroCreateOptions,
} from '@ulixee/hero';
import TransportBridge from '@ulixee/net/lib/TransportBridge.js';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler.js';
import type Core from '@ulixee/hero-core';

interface CreateConnectionResponse {
  connection: ConnectionToHeroCore;
  Core: typeof Core;
}

async function createConnectionToCore(
  options?: Omit<IConnectionToCoreOptions, 'host'>
): Promise<CreateConnectionResponse> {
  const Core = (await import('@ulixee/hero-core')).default;
  const bridge = new TransportBridge();
  Core.addConnection(bridge.transportToClient);
  const connection = new ConnectionToHeroCore(bridge.transportToCore, { ...options });
  ShutdownHandler.register(() => connection.disconnect());
  return { connection, Core };
}

export default class LocalHero extends DefaultHero {
  static Core?: typeof Core;

  static async create(createOptions: IHeroCreateOptions = {}): Promise<LocalHero> {
    const localCreateOptions = createOptions;
    let connectionOptions: IConnectionToCoreOptions | undefined;
    if (localCreateOptions.connectionToCore instanceof ConnectionToHeroCore) {
      connectionOptions = localCreateOptions.connectionToCore.options;
    } else {
      connectionOptions = localCreateOptions.connectionToCore;
    }
    const createConnectionResp = await createConnectionToCore(connectionOptions);
    localCreateOptions.connectionToCore = createConnectionResp.connection;
    this.Core = createConnectionResp.Core;
    return new LocalHero(localCreateOptions);
  }

  constructor(createOptions: IHeroCreateOptions = {}) {
    super(createOptions);
  }
}
