// Generated by dts-bundle v0.7.3
// Dependencies for this module:
//   ../../../@clusterws/cws
//   ../../../http
//   ../../../https
//   ../../../tls

import { WebSocket } from '@clusterws/cws';
import * as HTTP from 'http';
import * as HTTPS from 'https';
import { SecureContextOptions } from 'tls';

export default class ClusterWS {
    static middleware: typeof Middleware;
    constructor(configurations: Configurations);
}

export class BrokerClient {
    constructor(url: string);
    on(event: string, listener: Listener): void;
    send(message: string | Buffer): boolean;
}

export class Scaler {
    constructor(horizontalScaleOptions: HorizontalScaleOptions);
}

export class Broker {
    constructor(options: Options, port: number, securityKey: string, serverId: string);
}

export class PubSubEngine {
    constructor(loopInterval: number);
    on(name: string, listener: Listener): void;
    getAllChannels(): string[];
    register(userId: string, listener: Listener): void;
    deRegister(userId: string, channels: string[]): void;
    subscribe(channelName: string, userId: string): any;
    unsubscribe(channelName: string, userId: string): void;
    publish(channel: string, message: Message, id?: string): void;
}

export class Socket {
    id: string;
    constructor(worker: Worker, socket: WebSocket);
    on(event: string, listener: Listener): void;
    send(event: string, message: Message, eventType?: string): void;
    disconnect(code?: number, reason?: string): void;
    terminate(): void;
}

export class WSServer extends EventEmitter {
    pubSub: PubSubEngine;
    middleware: {
        [key: string]: Listener;
    };
    constructor(options: Options, internalSecurityKey: string);
    setMiddleware(name: Middleware, listener: Listener): void;
    publish(channelName: string, message: Message, id?: string): void;
    subscribe(channelName: string, id: string): void;
    unsubscribe(channelName: string, id: string): void;
}

export class Worker {
    options: Options;
    wss: WSServer;
    server: HTTP.Server | HTTPS.Server;
    constructor(options: Options, internalSecurityKey: string);
}

export function masterProcess(options: Options): void;
export function workerProcess(options: Options): void;

export class EventEmitter {
    on(event: 'connection', listener: (socket: Socket) => void): void;
    on(event: string, listener: Listener): void;
    emit(event: string, message: Message): void;
    emit(event: string, ...args: any[]): void;
    exist(event: string): boolean;
    removeEvent(event: string): void;
    removeEvents(): void;
}

export function random(min: number, max: number): number;
export function logError<T>(data: T): any;
export function logReady<T>(data: T): any;
export function logWarning<T>(data: T): any;
export function isFunction<T>(fn: T): boolean;
export function generateKey(length: number): string;

export enum Middleware {
    onSubscribe = "onSubscribe",
    onUnsubscribe = "onUnsubscribe",
    onWorkerMessage = "onWorkerMessage",
    verifyConnection = "verifyConnection"
}
export type Message = any;
export type Listener = (...args: any[]) => void;
export type ListenerMany = (eventName: string, ...args: any[]) => void;
export type WorkerFunction = () => void;
export type HorizontalScaleOptions = {
    key?: string;
    serverId?: string;
    brokersUrls?: string[];
    masterOptions?: {
        port: number;
        tlsOptions?: SecureContextOptions;
    };
};
export type Configurations = {
    worker: WorkerFunction;
    port?: number;
    host?: string;
    wsPath?: string;
    workers?: number;
    brokers?: number;
    useBinary?: boolean;
    tlsOptions?: SecureContextOptions;
    pingInterval?: number;
    brokersPorts?: number[];
    restartWorkerOnFail?: boolean;
    horizontalScaleOptions?: HorizontalScaleOptions;
    encodeDecodeEngine?: EncodeDecodeEngine;
};
export type Options = {
    worker: WorkerFunction;
    port: number;
    host: string | null;
    wsPath: string;
    workers: number;
    brokers: number;
    useBinary: boolean;
    brokersPorts: number[];
    tlsOptions: SecureContextOptions | null;
    pingInterval: number;
    restartWorkerOnFail: boolean;
    horizontalScaleOptions: HorizontalScaleOptions | null;
    encodeDecodeEngine: EncodeDecodeEngine | null;
};
export type EncodeDecodeEngine = {
    encode: (message: Message) => Message;
    decode: (message: Message) => Message;
};

