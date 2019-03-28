"use strict";

Object.defineProperty(exports, "__esModule", {
    value: !0
});

var Level, crypto = require("crypto"), cluster = require("cluster"), HTTP = require("http"), HTTPS = require("https"), cws = require("@clusterws/cws");

function isFunction(e) {
    return "[object Function]" === {}.toString.call(e);
}

function generateUid(e) {
    return crypto.randomBytes(e).toString("hex");
}

class EventEmitter {
    constructor(e) {
        this.logger = e, this.events = {};
    }
    on(e, s) {
        if (!isFunction(s)) return this.logger.error("Listener must be a function");
        this.events[e] = s;
    }
    emit(e, ...s) {
        const r = this.events[e];
        r && r(...s);
    }
    exist(e) {
        return !!this.events[e];
    }
    off(e) {
        delete this.events[e];
    }
    removeEvents() {
        this.events = {};
    }
}

!function(e) {
    e[e.Scale = 0] = "Scale", e[e.SingleProcess = 1] = "SingleProcess";
}(exports.Mode || (exports.Mode = {})), function(e) {
    e[e.onSubscribe = 0] = "onSubscribe", e[e.onUnsubscribe = 1] = "onUnsubscribe", 
    e[e.verifyConnection = 2] = "verifyConnection", e[e.onChannelOpen = 3] = "onChannelOpen", 
    e[e.onChannelClose = 4] = "onChannelClose";
}(exports.Middleware || (exports.Middleware = {}));

class Socket {
    constructor(e, s) {
        this.worker = e, this.socket = s, this.id = generateUid(8), this.channels = {}, 
        this.emitter = new EventEmitter(this.worker.options.logger), this.worker.wss.pubSub.register(this.id, e => {
            this.send(null, e, "publish");
        }), this.socket.on("message", e => {
            if (this.emitter.exist("message")) return this.emitter.emit("message", e);
            try {
                if ("string" != typeof e && (e = Buffer.from(e)), 91 !== e[0] && "[" !== e[0]) return this.emitter.exist("error") ? this.emitter.emit("error", new Error("Received message is not correct structure")) : (this.worker.options.logger.error("Received message is not correct structure"), 
                this.terminate());
                decode(this, JSON.parse(e.toString()));
            } catch (e) {
                if (this.emitter.exist("error")) return this.emitter.emit("error", e);
                this.worker.options.logger.error(e), this.terminate();
            }
        }), this.socket.on("close", (e, s) => {
            this.worker.wss.pubSub.unregister(this.id, Object.keys(this.channels)), this.emitter.emit("disconnect", e, s), 
            this.emitter.removeEvents();
        }), this.socket.on("error", e => {
            if (this.emitter.exist("error")) return this.emitter.emit("error", e);
            this.worker.options.logger.error(e), this.socket.terminate();
        });
    }
    on(e, s) {
        this.emitter.on(e, s);
    }
    send(e, s, r = "emit") {
        this.socket.send(encode(e, s, r));
    }
    sendRaw(e) {
        this.socket.send(e);
    }
    disconnect(e, s) {
        this.socket.close(e, s);
    }
    terminate() {
        this.socket.terminate();
    }
    subscribe(e) {
        if (!this.channels[e]) {
            if (this.worker.wss.middleware[exports.Middleware.onSubscribe]) return this.worker.wss.middleware[exports.Middleware.onSubscribe](this, e, s => {
                s && (this.channels[e] = !0, this.worker.wss.subscribe(this.id, e));
            });
            this.channels[e] = !0, this.worker.wss.subscribe(this.id, e);
        }
    }
    unsubscribe(e) {
        this.channels[e] && (this.worker.wss.middleware[exports.Middleware.onUnsubscribe] && this.worker.wss.middleware[exports.Middleware.onUnsubscribe](this, e), 
        delete this.channels[e], this.worker.wss.unsubscribe(this.id, e));
    }
}

function encode(e, s, r) {
    const t = {
        emit: [ "e", e, s ],
        publish: [ "p", e, s ],
        system: {
            configuration: [ "s", "c", s ]
        }
    };
    return JSON.stringify(t[r][e] || t[r]);
}

function decode(e, s) {
    const [r, t, i] = s;
    if ("e" === r) return e.emitter.emit(t, i);
    if ("p" === r) return e.channels[t] && e.worker.wss.publish(t, i, e.id);
    if ("s" === r) {
        if ("s" === t) return e.subscribe(i);
        if ("u" === t) return e.unsubscribe(i);
    }
}

class PubSubEngine {
    constructor(e, s) {
        this.logger = e, this.interval = s, this.hooks = {}, this.users = {}, this.batches = {}, 
        this.channels = {}, this.run();
    }
    addListener(e, s) {
        this.hooks[e] = s;
    }
    register(e, s) {
        this.users[e] = s;
    }
    unregister(e, s) {
        for (let r = 0, t = s.length; r < t; r++) this.unsubscribe(s[r], e);
        delete this.users[e];
    }
    subscribe(e, s) {
        return this.users[e] ? this.channels[s] ? this.channels[s].push(e) : (this.logger.debug("PubSubEngine", `'${s}' has been created`), 
        this.hooks.channelAdd && this.hooks.channelAdd(s), void (this.channels[s] = [ "broker", e ])) : this.logger.warning(`Trying to subscribe not existing user ${e}`);
    }
    unsubscribe(e, s) {
        const r = this.channels[s];
        if (r && r.length) {
            const s = r.indexOf(e);
            -1 !== s && r.splice(s, 1);
        }
        r && 1 === r.length && (this.logger.debug("PubSubEngine", `'${s}' has been removed`), 
        this.hooks.channelClose && this.hooks.channelClose(s), delete this.channels[s]);
    }
    publish(e, s, r) {
        const t = this.batches[e];
        if (t) return t.push({
            userId: r,
            message: s
        });
        this.batches[e] = [ {
            userId: r,
            message: s
        } ];
    }
    flush() {
        const e = {};
        for (const s in this.batches) if (this.batches[s]) {
            const r = this.channels[s];
            if (r) {
                const t = this.batches[s], i = t.length;
                for (let o = 0, n = r.length; o < n; o++) {
                    const n = r[o], h = [];
                    for (let e = 0; e < i; e++) t[e].userId !== n && h.push(t[e].message);
                    h.length && (e[n] || (e[n] = {}), e[n][s] = h);
                }
            }
        }
        this.batches = {};
        for (const s in e) this.users[s] && this.users[s](e[s]);
    }
    run() {
        setTimeout(() => {
            this.flush(), this.run();
        }, this.interval);
    }
}

class WSServer extends EventEmitter {
    constructor(e, s) {
        super(e.logger), this.options = e, this.middleware = {}, this.pubSub = new PubSubEngine(e.logger, 5), 
        this.pubSub.register("broker", e => {}), this.pubSub.addListener("channelAdd", e => {
            this.middleware[exports.Middleware.onChannelOpen] && this.middleware[exports.Middleware.onChannelOpen](e);
        }), this.pubSub.addListener("channelClose", e => {
            this.middleware[exports.Middleware.onChannelClose] && this.middleware[exports.Middleware.onChannelClose](e);
        });
    }
    addMiddleware(e, s) {
        this.middleware[e] = s;
    }
    publish(e, s, r) {
        this.pubSub.publish(e, s, r);
    }
    subscribe(e, s) {
        this.pubSub.subscribe(e, s);
    }
    unsubscribe(e, s) {
        this.pubSub.unsubscribe(e, s);
    }
}

class Worker {
    constructor(e, s) {
        this.options = e, this.wss = new WSServer(this.options, s), this.server = this.options.tlsOptions ? HTTPS.createServer(this.options.tlsOptions) : HTTP.createServer();
        const r = new cws.WebSocketServer({
            path: this.options.wsPath,
            server: this.server,
            verifyClient: (e, s) => this.wss.middleware[exports.Middleware.verifyConnection] ? this.wss.middleware[exports.Middleware.verifyConnection](e, s) : s(!0)
        });
        r.on("connection", e => {
            this.options.logger.debug("Worker", "new websocket connection"), this.wss.emit("connection", new Socket(this, e));
        }), this.options.autoPing && r.startAutoPing(this.options.pingInterval, !0), this.server.on("error", e => {
            this.options.logger.error(`Worker ${e.stack || e}`), this.options.mode === exports.Mode.Scale && process.exit();
        }), this.server.listen(this.options.port, this.options.host, () => {
            this.options.worker.call(this), this.options.mode === exports.Mode.Scale && process.send({
                event: "READY",
                pid: process.pid
            });
        });
    }
}

function runProcesses(e) {
    if (e.mode === exports.Mode.SingleProcess) return e.logger.info(` Running in single process on port: ${e.port}, PID ${process.pid} ${e.tlsOptions ? "(secure)" : ""}`), 
    new Worker(e, "");
    cluster.isMaster ? masterProcess(e) : childProcess(e);
}

function masterProcess(e) {
    let s;
    const r = generateUid(10), t = generateUid(20), i = [], o = [], n = (h, c, l) => {
        const u = cluster.fork();
        u.on("message", r => {
            if (e.logger.debug("Message from child", r), "READY" === r.event) {
                if (l) return e.logger.info(`${c} ${h} PID ${r.pid} has been restarted`);
                if ("Scaler" === c) {
                    s = ` Scaler on: ${e.horizontalScaleOptions.masterOptions.port}, PID ${r.pid}`;
                    for (let s = 0; s < e.brokers; s++) n(s, "Broker");
                }
                if ("Broker" === c && (i[h] = ` Broker on: ${e.brokersPorts[h]}, PID ${r.pid}`, 
                i.length === e.brokers && !i.includes(void 0))) for (let s = 0; s < e.workers; s++) n(s, "Worker");
                "Worker" === c && (o[h] = `    Worker: ${h}, PID ${r.pid}`, o.length !== e.workers || o.includes(void 0) || (e.logger.info(` Master on: ${e.port}, PID ${process.pid} ${e.tlsOptions ? "(secure)" : ""}`), 
                s && e.logger.info(s), i.forEach(e.logger.info), o.forEach(e.logger.info)));
            }
        }), u.on("exit", () => {
            e.logger.error(`${c} ${h} has exited`), e.restartWorkerOnFail && (e.logger.warning(`${c} ${h} is restarting \n`), 
            n(h, c, !0));
        }), u.send({
            id: h,
            name: c,
            serverId: r,
            securityKey: t
        });
    };
    for (let s = 0; s < e.brokers; s++) n(s, "Broker");
}

function childProcess(e) {
    process.on("message", s => {
        switch (e.logger.debug("Message from master", s), s.name) {
          case "Worker":
            return new Worker(e, s.securityKey);

          default:
            process.send({
                event: "READY",
                pid: process.pid
            });
        }
    }), process.on("uncaughtException", s => {
        e.logger.error(`${s.stack || s}`), process.exit();
    });
}

!function(e) {
    e[e.ALL = 0] = "ALL", e[e.DEBUG = 1] = "DEBUG", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", 
    e[e.ERROR = 4] = "ERROR";
}(Level || (Level = {}));

class Logger {
    constructor(e) {
        this.level = e;
    }
    debug(e, s) {
        if (this.level > Level.DEBUG) return;
        let r = s;
        "object" == typeof s && (r = JSON.stringify(s)), process.stdout.write(`[36mDebug:[0m ${e} - ${r}\n`);
    }
    info(e) {
        this.level > Level.INFO || process.stdout.write(`[32m✓ ${e}[0m\n`);
    }
    error(e) {
        this.level > Level.ERROR || process.stdout.write(`[31mError:[0m ${e}\n`);
    }
    warning() {
        this.level, Level.WARN;
    }
}

class ClusterWS {
    constructor(e) {
        if (this.options = {
            port: e.port || (e.tlsOptions ? 443 : 80),
            mode: e.mode || exports.Mode.Scale,
            host: e.host,
            logger: e.logger || new Logger(Level.INFO),
            worker: e.worker,
            wsPath: e.wsPath || null,
            workers: e.workers || 1,
            brokers: e.brokers || 1,
            autoPing: !1 !== e.autoPing,
            tlsOptions: e.tlsOptions,
            pingInterval: e.pingInterval || 2e4,
            brokersPorts: e.brokersPorts || [],
            restartWorkerOnFail: e.restartWorkerOnFail,
            horizontalScaleOptions: e.horizontalScaleOptions
        }, !this.options.brokersPorts.length) for (let e = 0; e < this.options.brokers; e++) this.options.brokersPorts.push(e + 9400);
        return isFunction(this.options.worker) ? this.options.brokers !== this.options.brokersPorts.length ? this.options.logger.error("Number of broker ports in not the same as number of brokers") : void runProcesses(this.options) : this.options.logger.error("Worker is not provided or is not a function");
    }
}

exports.ClusterWS = ClusterWS;
