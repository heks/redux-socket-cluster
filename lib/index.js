'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.maintainSocket = exports.reduxSocket = exports.socketClusterReducer = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _isFinite = require('babel-runtime/core-js/number/is-finite');

var _isFinite2 = _interopRequireDefault(_isFinite);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _es6Promisify = require('es6-promisify');

var _es6Promisify2 = _interopRequireDefault(_es6Promisify);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// constants
var CLOSED = 'closed';
var CONNECTING = 'connecting';
var OPEN = 'open';
var AUTHENTICATED = 'authenticated';
var PENDING = 'pending';
var UNAUTHENTICATED = 'unauthenticated';

var CONNECT_REQUEST = '@@socketCluster/CONNECT_REQUEST';
var CONNECT_SUCCESS = '@@socketCluster/CONNECT_SUCCESS';
var CONNECT_ERROR = '@@socketCluster/CONNECT_ERROR';
var AUTH_REQUEST = '@@socketCluster/AUTH_REQUEST';
var AUTH_SUCCESS = '@@socketCluster/AUTH_SUCCESS';
var AUTH_ERROR = '@@socketCluster/AUTH_ERROR';
var SUBSCRIBE_REQUEST = '@@socketCluster/SUBSCRIBE_REQUEST';
var SUBSCRIBE_SUCCESS = '@@socketCluster/SUBSCRIBE_SUCCESS';
var UNSUBSCRIBE = '@@socketCluster/UNSUBSCRIBE';
var SUBSCRIBE_ERROR = '@@socketCluster/SUBSCRIBE_ERROR';
var KICKOUT = '@@socketCluster/KICKOUT';
var DISCONNECT = '@@socketCluster/DISCONNECT';
var DEAUTHENTICATE = '@@socketCluster/DEAUTHENTICATE';

// Reducer
var initialState = {
  id: null,
  socketState: CLOSED,
  authState: PENDING,
  authToken: null,
  authError: null,
  error: null,
  pendingSubs: [],
  subs: []
};

var socketClusterReducer = exports.socketClusterReducer = function socketClusterReducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments[1];

  switch (action.type) {
    case DEAUTHENTICATE:
      return (0, _extends3.default)({}, state, {
        authState: UNAUTHENTICATED,
        authToken: null
      });
    case DISCONNECT:
      return initialState;
    case CONNECT_REQUEST:
      return (0, _extends3.default)({}, state, {
        socketState: CONNECTING
      });
    case CONNECT_ERROR:
      return (0, _extends3.default)({}, state, {
        error: action.error
      });
    case CONNECT_SUCCESS:
      return (0, _extends3.default)({}, state, {
        id: action.payload.id,
        socketState: action.payload.socketState,
        authState: action.payload.authState,
        error: action.error
      });
    case AUTH_REQUEST:
      return (0, _extends3.default)({}, state, {
        authState: PENDING
      });
    case AUTH_SUCCESS:
      return (0, _extends3.default)({}, state, {
        authState: AUTHENTICATED,
        authToken: action.payload.authToken
      });
    case AUTH_ERROR:
      return (0, _extends3.default)({}, state, {
        authState: UNAUTHENTICATED,
        authError: action.error
      });
    case SUBSCRIBE_REQUEST:
      return (0, _extends3.default)({}, state, {
        pendingSubs: state.pendingSubs.concat(action.payload.channelName)
      });
    case SUBSCRIBE_SUCCESS:
      return (0, _extends3.default)({}, state, {
        pendingSubs: state.pendingSubs.filter(function (sub) {
          return sub !== action.payload.channelName;
        }),
        subs: state.subs.concat(action.payload.channelName)
      });
    case SUBSCRIBE_ERROR:
      return (0, _extends3.default)({}, state, {
        pendingSubs: state.pendingSubs.filter(function (sub) {
          return sub !== action.payload.channelName;
        }),
        error: action.error
      });
    case UNSUBSCRIBE:
      return (0, _extends3.default)({}, state, {
        subs: state.subs.filter(function (sub) {
          return sub !== action.payload.channelName;
        }),
        error: action.error
      });
    case KICKOUT:
      return (0, _extends3.default)({}, state, {
        error: action.error
      });
    default:
      return state;
  }
};

// keep in outer context so we can check if it exists in the maintainSocket HOC
var initialized = false;
var instances = 0;
var destructionId = void 0;
var destroyer = void 0;
var options = {};
var hocOptions = {};
var socket = void 0;
var hocOptionsDefaults = { keepAlive: 15000 };

var reduxSocket = exports.reduxSocket = function reduxSocket() {
  var scOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var _hocOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return function (ComposedComponent) {
    var _class, _temp;

    return _temp = _class = function (_Component) {
      (0, _inherits3.default)(SocketClustered, _Component);

      function SocketClustered(props, context) {
        (0, _classCallCheck3.default)(this, SocketClustered);

        var _this = (0, _possibleConstructorReturn3.default)(this, (SocketClustered.__proto__ || (0, _getPrototypeOf2.default)(SocketClustered)).call(this, props, context));

        var madeHocOptions = typeof _hocOptions === 'function' ? _hocOptions(props) : _hocOptions;
        var AuthEngine = madeHocOptions.AuthEngine,
            onDisconnect = madeHocOptions.onDisconnect,
            socketCluster = madeHocOptions.socketCluster;

        options = AuthEngine ? (0, _extends3.default)({}, scOptions, { authEngine: new AuthEngine(context.store) }) : scOptions;
        hocOptions = (0, _extends3.default)({}, hocOptionsDefaults, madeHocOptions);
        socket = socketCluster.create(options);
        destroyer = function destroyer() {
          socket.disconnect();
          socket.destroy();
          if (onDisconnect) {
            onDisconnect(true, scOptions, madeHocOptions, socket);
          }
          initialized = false;
        };
        return _this;
      }

      (0, _createClass3.default)(SocketClustered, [{
        key: 'componentWillMount',
        value: function componentWillMount() {
          if (!initialized) {
            // apply callback here so it happens on the same tick
            var _hocOptions2 = hocOptions,
                onConnect = _hocOptions2.onConnect;

            if (onConnect) {
              onConnect(options, hocOptions, socket);
            }
            this.handleConnection();
            this.handleError();
            this.handleSubs();
            this.handleAuth();
            initialized = true;
          } else if (destructionId) {
            // a second instance of the HOC was used or the first is revisited
            window.clearTimeout(destructionId);
            destructionId = undefined;
          }
          instances++;
        }
      }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
          // if this is the last place the socket was used, try to destroy it
          if (--instances === 0) {
            var _hocOptions3 = hocOptions,
                keepAlive = _hocOptions3.keepAlive;

            if ((0, _isFinite2.default)(keepAlive)) {
              destructionId = window.setTimeout(destroyer, keepAlive);
            }
          }
        }
      }, {
        key: 'render',
        value: function render() {
          return _react2.default.createElement(ComposedComponent, this.props);
        }
      }, {
        key: 'handleSubs',
        value: function handleSubs() {
          var dispatch = this.context.store.dispatch;

          socket.on('subscribeStateChange', function (channelName, oldState, newState) {
            if (newState === PENDING) {
              dispatch({ type: SUBSCRIBE_REQUEST, payload: { channelName: channelName } });
            }
          });
          socket.on('subscribeRequest', function (channelName) {
            dispatch({ type: SUBSCRIBE_REQUEST, payload: { channelName: channelName } });
          });
          socket.on('subscribe', function (channelName) {
            dispatch({ type: SUBSCRIBE_SUCCESS, payload: { channelName: channelName } });
          });
          socket.on('subscribeFail', function (error, channelName) {
            dispatch({ type: SUBSCRIBE_ERROR, payload: { channelName: channelName }, error: error });
          });
          // only sends a messsage to error, unsub does the rest, takes in (error, channelName)
          socket.on('kickOut', function (error) {
            dispatch({ type: KICKOUT, error: error });
          });
          socket.on('unsubscribe', function (channelName) {
            dispatch({ type: UNSUBSCRIBE, payload: { channelName: channelName } });
          });
        }
      }, {
        key: 'handleConnection',
        value: function handleConnection() {
          var dispatch = this.context.store.dispatch;
          // handle case where socket was opened before the HOC

          if (socket.state === OPEN) {
            if (!socket.id || socket.authState !== AUTHENTICATED) {
              dispatch({
                type: CONNECT_SUCCESS,
                payload: {
                  id: socket.id,
                  authState: socket.authState,
                  socketState: socket.state
                }
              });
            }
          } else {
            dispatch({ type: CONNECT_REQUEST, payload: { socketState: socket.state } });
          }

          socket.on('connect', function (status) {
            var _hocOptions4 = hocOptions,
                onConnect = _hocOptions4.onConnect;

            if (onConnect) {
              onConnect(options, hocOptions, socket);
            }
            dispatch({
              type: CONNECT_SUCCESS,
              payload: {
                id: status.id,
                authState: socket.authState,
                socketState: socket.state
              },
              error: status.authError
            });
          });
          socket.on('disconnect', function () {
            dispatch({ type: DISCONNECT });
            var _hocOptions5 = hocOptions,
                onDisconnect = _hocOptions5.onDisconnect;

            if (onDisconnect) {
              // did not time out, so first param is false
              onDisconnect(false, options, hocOptions, socket);
            }
          });
          // triggers while in connecting state
          socket.on('connectAbort', function () {
            dispatch({ type: DISCONNECT });
          });
        }
      }, {
        key: 'handleError',
        value: function handleError() {
          var dispatch = this.context.store.dispatch;

          socket.on('error', function (error) {
            dispatch({ type: CONNECT_ERROR, error: error.message });
          });
        }
      }, {
        key: 'handleAuth',
        value: function () {
          var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
            var dispatch, _options, authTokenName, loadToken, authenticate, authToken, authStatus;

            return _regenerator2.default.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    dispatch = this.context.store.dispatch;
                    _options = options, authTokenName = _options.authTokenName;

                    socket.on('authenticate', function (authToken) {
                      dispatch({ type: AUTH_SUCCESS, payload: { authToken: authToken } });
                    });
                    socket.on('deauthenticate', function () {
                      dispatch({ type: DEAUTHENTICATE });
                    });

                    if (!(authTokenName && socket.authState !== AUTHENTICATED)) {
                      _context.next = 15;
                      break;
                    }

                    dispatch({ type: AUTH_REQUEST });
                    loadToken = (0, _es6Promisify2.default)(socket.auth.loadToken.bind(socket.auth));
                    authenticate = (0, _es6Promisify2.default)(socket.authenticate.bind(socket));
                    _context.next = 10;
                    return loadToken(authTokenName);

                  case 10:
                    authToken = _context.sent;
                    _context.next = 13;
                    return authenticate(authToken);

                  case 13:
                    authStatus = _context.sent;

                    if (authStatus.authError) {
                      dispatch({ type: AUTH_ERROR, error: authStatus.authError.message });
                    }

                  case 15:
                  case 'end':
                    return _context.stop();
                }
              }
            }, _callee, this);
          }));

          function handleAuth() {
            return _ref.apply(this, arguments);
          }

          return handleAuth;
        }()
      }]);
      return SocketClustered;
    }(_react.Component), _class.contextTypes = {
      store: _propTypes2.default.object.isRequired
    }, _temp;
  };
};

var maintainSocket = exports.maintainSocket = function maintainSocket(ComposedComponent) {
  return function (_Component2) {
    (0, _inherits3.default)(MaintainSocket, _Component2);

    function MaintainSocket() {
      (0, _classCallCheck3.default)(this, MaintainSocket);
      return (0, _possibleConstructorReturn3.default)(this, (MaintainSocket.__proto__ || (0, _getPrototypeOf2.default)(MaintainSocket)).apply(this, arguments));
    }

    (0, _createClass3.default)(MaintainSocket, [{
      key: 'componentWillMount',
      value: function componentWillMount() {
        window.clearTimeout(destructionId);
        instances++;
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        if (--instances === 0) {
          var _options2 = options,
              keepAlive = _options2.keepAlive;

          if ((0, _isFinite2.default)(keepAlive)) {
            destructionId = window.setTimeout(destroyer, keepAlive);
          }
        }
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2.default.createElement(ComposedComponent, this.props);
      }
    }]);
    return MaintainSocket;
  }(_react.Component);
};