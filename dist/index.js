"use strict";

function logError(r) {
    return process.stdout.write(`[31mError PID ${process.pid}:[0m  ${r}\n`);
}

function isFunction(r) {
    return "[object Function]" === {}.toString.call(r);
}

require("cluster");

class ClusterWS {
    constructor(r) {
        if (this.options = {
            port: r.port || (r.tlsOptions ? 443 : 80),
            host: r.host,
            worker: r.worker,
            workers: r.workers || 1,
            brokers: r.brokers || 1,
            useBinary: r.useBinary,
            tlsOptions: r.tlsOptions,
            pingInterval: r.pingInterval || 2e4,
            brokersPorts: r.brokersPorts || [],
            encodeDecodeEngine: r.encodeDecodeEngine,
            restartWorkerOnFail: r.restartWorkerOnFail,
            horizontalScaleOptions: r.horizontalScaleOptions
        }, !this.options.brokersPorts.length) for (let r = 0; r < this.options.brokers; r++) this.options.brokersPorts.push(r + 9400);
        return isFunction(this.options.worker) ? this.options.brokers !== this.options.brokersPorts.length ? logError("Number of broker ports should be the same as number of brokers") : void 0 : logError("Worker must be provided and it must be a function");
    }
}

module.exports = ClusterWS; module.exports.default = ClusterWS;
