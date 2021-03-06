var server = require('http').createServer();
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ server: server });
var express = require('express');
var webpack = require('webpack');
var compression = require('compression');
var app = express();
var MemoryFileSystem = require("memory-fs");
var memoryFs = require('./memoryFs');
var middleware = require('./middleware');
var fs = require('fs');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sessions = require('./sessions.js');
var middlewares = {};
var preLoadPackages = require('./preLoadPackages');
var utils = require('./utils');
var sandbox = require('./sandbox');
var database = require('./database');
var npm = require('./npm');
var bins = require('./bins');
var liveConnection = require('./live');

preLoadPackages([
  // Core node
  'process',

  // Webpack
  'webpack',
  'node-pre-gyp',
  'nopt',
  'rc',
  'tar-pack',

  // Loaders
  'babel-loader',
  'style-loader',
  'css-loader',
  'ts-loader',
  'coffee-loader',
  'less',
  'less-loader',
  'node-sass',
  'sass-loader',
  'babel-plugin-transform-decorators-legacy'
]);

// Init
memoryFs.fs.mkdirpSync(path.join('/', 'api', 'sandbox'));
memoryFs.fs.mkdirpSync(path.join('/', 'api', 'sandbox', 'vendors'));
setInterval(sessions.clean, 60 * 1000 * 60 * 5);
database.connect(utils.isProduction() ? process.env.MONGOHQ_URL : 'mongodb://localhost:27017/webpackbin')
  .then(utils.log('Database connected'))
  .catch(utils.log('Could not connect to database'));

// Init middleware
if (utils.isProduction()) {
  app.use(function (req, res, next) {
    if (/herokuapp/.test(req.host)) {
      return res.redirect('http://www.webpackbin.com' + req.url);
    } else {
      next();
    }
  });
}
app.use(compression())
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.resolve('public')));
app.use(sessions.middleware);

app.get('/api/bins/:id', bins.get);

app.get('/api/sandbox/', sandbox.getIndex);
app.get('/api/sandbox/*', sandbox.getFile)
app.post('/api/sandbox', sandbox.updateSandbox);

app.get('/api/packages/:packageName', npm.getPackageFromRegistry);
app.get('/api/bundles', database.searchBundles);

app.get('/api/boilerplates/:id', bins.getBoilerplate);

app.get('*', function(req, res) {
  res.send(fs.readFileSync(
    path.resolve('index.html')).toString().replace('/build/bundle.js', '/client_build.js')
  );
});

wss.on('connection', liveConnection);

module.exports = {
  server: server,
  app: app
};
