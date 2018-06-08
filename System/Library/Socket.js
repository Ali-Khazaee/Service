'use strict'

var Writable = require('stream').Writable
var Readable = require('stream').Readable
var util = require('util')
var EventEmitter = require('events')
var ut = require('utjs')

var Serializer = require('./Serializer')
var Reader = require('./Reader')
var Constants = require('./Constants')

var MAX_MESSAGE_ID = Math.pow(2, 32) - 1

function Sock(Socket, Server)
{
    var opts = {}
    Sock.super_.call(this)

    this._serializer = Server._serializer
    this._reader = new Reader()
    this._opts = opts
    this._shouldReconnect = ut.isBoolean(opts.reconnect) ? opts.reconnect : Constants.RECONNECT
    this._reconnectInterval = ut.isNumber(opts.reconnectInterval) ? opts.reconnectInterval : Constants.RECONNECT_INTERVAL
    this._useQueue = ut.isBoolean(opts.useQueue) ? opts.useQueue : Constants.USE_QUEUE
    this._queueSize = ut.isNumber(opts.queueSize) ? opts.queueSize : Constants.QUEUE_SIZE
    this._messageListener = ut.isFunction(opts.messageListener) ? opts.messageListener : null
    this._messageId = 1
    this._acks = { }
    this._socketConfig = { }
    this._manuallyClosed = false
    this._queue = []
    this._streams = { }
    this._server = Server
    this.id = ut.randomString(5)
    this._socket = Socket
    this._connected = true

    this._socket.on('connect', () =>
    {
        this._connected = true
        this._flushQueue()
        this._socket.emit('drain')
        this._superEmit('socket_connect')
    })

    this._socket.on('data', (chunk) =>
    {
        var buffers = this._reader.read(chunk)

        for (var i = 0; i < buffers.length; i++)
            this._onMessage(this._serializer.deserialize(buffers[i]))
    })

    this._socket.on('close', (isError) =>
    {
        this._connected = false
        this._socket = null

        if (this._shouldReconnect && !this._manuallyClosed)
            this._reconnect()

        this._superEmit('close')
    })

    this._socket.on('error', function (err) {
        this._onError(err);
    });

    this._socket.on('timeout', function () {
        this._socket.destroy();
      this._onError(ut.error('connect TIMEOUT'));
    });

    this._socket.on('drain', function () {
      /**
       * Emitted when the write buffer of the internal socket becomes empty.
       * Can be used to throttle uploads.
       *
       * @event Sock#socket_drain
       */
      _this._superEmit('socket_drain');
    });
}

/*
1
1
2
1
1
1
3
1
1
1
1
1
*/
util.inherits(Sock, EventEmitter)

Sock.prototype._superEmit = Sock.prototype.emit

Sock.prototype._send = function (event, data, mt, opts) {
  opts = opts || {};
  var messageId = opts.messageId || this._nextMessageId();

  if (opts.cb !== undefined) {
    this._acks[messageId] = opts.cb;
  }

  var buff = this._serializer.serialize(event, data, mt, messageId);

  if (this._connected) {
    return this._socket.write(buff);
  } else if (this._useQueue) {
    if (this._queue.length + 1 > this._queueSize) {
      this._queue.shift();
    }

    this._queue.push(buff);
    return false;
  }
};

Sock.prototype._reconnect = function () {
  var _this = this;
  setTimeout(function () {
    /**
     * The socket is trying to reconnect.
     *
     * @event Sock#reconnecting
     */
    _this._superEmit('reconnecting');
    _this.connect();
  }, this._reconnectInterval);
};

Sock.prototype._onMessage = function (msg) {
  var readStream;

  switch (msg.mt) {
    case Serializer.MT_DATA:
      this._superEmit(msg.event, msg.data);
      break;
    case Serializer.MT_DATA_STREAM_OPEN:
      readStream = this._openDataStream(msg);
      this._superEmit(msg.event, readStream, msg.data);
      break;
    case Serializer.MT_DATA_STREAM_OPEN_WITH_ACK:
      readStream = this._openDataStream(msg);
      this._superEmit(msg.event, readStream, msg.data, this._ackCallback(msg.messageId));
      break;
    case Serializer.MT_DATA_STREAM:
      this._transmitDataStream(msg);
      break;
    case Serializer.MT_DATA_STREAM_CLOSE:
      this._closeDataStream(msg);
      break;
    case Serializer.MT_DATA_WITH_ACK:
      this._superEmit(msg.event, msg.data, this._ackCallback(msg.messageId));
      break;
    case Serializer.MT_ACK:
      this._acks[msg.messageId](msg.data);
      delete this._acks[msg.messageId];
      break;
    default:
      if (this._messageListener) {
        this._messageListener(msg);
      }
  }
};

Sock.prototype._openDataStream = function (msg) {
  var _this = this;
  var readStream = new Readable({
    read: function (size) {
      if (_this._socket.isPaused()) {
        _this._socket.resume();
      }
    }
  });

  this._streams[msg.messageId] = readStream;
  return readStream;
};

Sock.prototype._transmitDataStream = function (msg) {
  var readStream = this._streams[msg.messageId];

  if (!readStream.push(msg.data)) {
    this._socket.pause();
  }
};

Sock.prototype._closeDataStream = function (msg) {
  var readStream = this._streams[msg.messageId];

  readStream.push(null);
  delete this._streams[msg.messageId];
};

Sock.prototype._ackCallback = function (messageId) {
  var _this = this;

  return function ackCallback(data) {
    _this._send('', data, Serializer.MT_ACK, { messageId: messageId });
  };
};

Sock.prototype._nextMessageId = function () {
  if (++this._messageId > MAX_MESSAGE_ID) {
    this._messageId = 1;
  }

  return this._messageId;
};

Sock.prototype._flushQueue = function () {
  if (this._queue.length > 0) {
    for (var i = 0; i < this._queue.length; i++) {
      this._socket.write(this._queue[i]);
    }

    this._queue.length = 0;
  }
};

Sock.prototype._onError = function (err) {
  if (this.listenerCount('error') > 0) {
    /**
     * Error event from net.Socket or Socket.
     *
     * @event Sock#error
     */
    this._superEmit('error', err);
  } else {
    console.error('Missing error handler on `Socket`.');
    console.error(err.stack);
  }
};

module.exports = Sock;
