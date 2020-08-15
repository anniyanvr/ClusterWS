import { Options } from '../index';
import { WSServer } from './wss';
import { noop, uuid } from '../utils';
import { Server as HttpServer, createServer as httpCreateServer } from 'http';
import { Server as HttpsServer, createServer as httpsCreateServer } from 'https';

export class Worker {
  public readonly id: string;
  public readonly wss: WSServer;
  public readonly server: HttpServer | HttpsServer;

  private onErrorListener: (err: Error) => void;

  constructor(private options: Options) {
    this.onErrorListener = noop;

    this.id = uuid(12);
    this.server = this.options.tlsOptions ?
      httpsCreateServer(this.options.tlsOptions) :
      httpCreateServer();

    this.wss = new WSServer({
      server: this.server,
      onError: (err: Error): void => {
        // both http errors an websocket server errors come from wss
        this.onErrorListener(err);
      },
      ...this.options
    });

    this.options.worker.call({ worker: this });
  }

  public on(event: 'error', listener: (error: Error) => void): void {
    if (event === 'error') {
      this.onErrorListener = listener;
    }
  }

  public start(cb: () => void): void {
    this.server.listen(this.options.port, this.options.host, cb);
  }

  public stop(cb: () => void): void {
    this.server.close(cb);
  }
}