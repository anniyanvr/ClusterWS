// ClusterWS Full Functionality Template
const { ClusterWS, WSEngine } = require('@clusterws/server');

new ClusterWS({
  port: 3000,
  host: '127.0.0.1',
  worker: worker,
  scaleOptions: {
    scaleOff: true, // will run single instance with no brokers
    brokers: {
      instances: 2, // set to 0 if dont wont brokers
      // allow to pass array of 'path' or 'host:port'
      brokersLinks: []
    },
    workers: {
      instances: 6
    },
  },
  websocketOptions: {
    path: '/socket',
    engine: WSEngine.CWS, // before using WSEngine.WS install 'ws' module
    autoPing: true,
    pingInterval: 20000,
    appLevelPing: true // mostly used for browser will send ping in app level
  },
  tlsOptions: { /** default node.js tls options */ }
});

async function worker() {
  const wss = this.wss;
  const server = this.server;

  wss.on('connection', (ws) => {
    wss.pubSub.register(ws, (message) => {
      // by default ClusterWs does not register websocket to pubSub engine
      // ws.onPublish will register websocket
      // and receive messages per tick such as { channel: [msg1, msg2, mgs3], channel2: [msg1, ...] ...}
      // user is responsible for encoding and sending it to the receiver

      // on client side this message will look like "['p', {'channel': [...], 'channel2': [...], ...}]"
      return ws.send(JSON.stringify(['p', message]));
    })

    ws.on('message', (message) => {
      // you have full control over how to handel which events
      // this is one of the ways to encode data
      //
      // simple example protocol to handle pubSub communication and the rest of events
      // only for messages received from client
      // (you will need to do some thing similar on client side)
      //
      // PubSub messages will look like 
      // ['p', 'channel', 'message']  publish message to channel
      // ['s', 'channel']  subscribe to channel
      // ['u', 'channel']  unsubscribe from channel
      //
      // can add simple server client events
      // ['e', 'event', 'message'] emit event with specific message

      const parsedMessage = JSON.parse(message);

      // received publish event
      if (parsedMessage[0] === 'p') {
        const channel = parsedMessage[1];
        const message = parsedMessage[2];
        // here can be done validation
        // also can check if this user subscribed to
        // this channel to be able publish
        return ws.publish(channel, message, ws);


        // also can publish including sender it self with
        // return wss.publish(channel, message);
      }

      // receive subscribe event
      if (parsedMessage[0] === 's') {
        const channel = parsedMessage[1];
        return ws.subscribe(channel);
      }

      if (parsedMessage[0] === 'u') {
        const channel = parsedMessage[1];
        return ws.unsubscribe(channel);
      }

      if (parsedMessage[0] === 'e') {
        const event = parsedMessage[1];
        const message = parsedMessage[2];

        // example hello world event
        if (event === 'hello world') {
          return ws.send(JSON.stringify(['e', 'back hello world', message]))
        }
        // handle rest of your events
      }
    });

    ws.on('error', (err) => {
      // handle on error

      // if socket is registered to pub sub
      // you need to manually unregister
      wss.pubSub.unregister(ws);
    });

    ws.on('close', (code, reason) => {
      // handle on close

      // if socket is registered to pub sub
      // you need to manually unregister
      wss.pubSub.unregister(ws);
    });

    ws.on('pong', () => {
      // handle on pong received
    });
  });

  // server.on('error', (err) => {
  //   console.log('Error while creating server', err);
  //   server.close();
  // });

  // you can easily add almost any http 
  //  library (express, koa, etc..) with on `request` handler
  server.on('request', app);
  server.run(() => {
    console.log('Server is running');
  });

  // server.close(() => {
  //   console.log('Server has been closed');
  // });
}

