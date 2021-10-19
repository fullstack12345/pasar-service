let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let bodyParser = require('body-parser');

let indexRouter = require('./routes/index');
let indexRouterV2 = require('./routes/indexV2');
let indexRouterV3 = require('./routes/indexV3');
let pasarApi = require('./routes/pasarApi');
let stickerApi = require('./routes/stickerApi');
let jobs = require('./jobs');
let log4js = require('log4js');

let app = express();

app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/feeds/api/v1', indexRouter);
app.use('/feeds/api/v2', indexRouterV2);
app.use('/feeds/api/v3', indexRouterV3);
app.use('/pasar/api/v1', pasarApi);
app.use('/sticker/api/v1', stickerApi);

log4js.configure({
    appenders: { pasar: { type: 'dateFile', filename: 'logs/pasar.log', pattern: ".yyyy-MM-dd.log", compress: true, }},
    categories: { default: { appenders: ['pasar'], level: 'info'}},
    pm2: true,
    pm2InstanceVar: 'INSTANCE_ID'
});
global.logger = log4js.getLogger('pasar');

jobs.run()

module.exports = app;
