var fs = require('fs');
var path = require('path');
var AWS = require('aws-sdk');
var Sequelize = require('sequelize');
var sendgridAPI = require('sendgrid');
var momentTZ = require('moment-timezone');
var mom = require('moment');
var timezone  = 'Pacific/Auckland';
var winston = require('winston');


var loadWorkerNames = function(names, workersPath) {
  var workers;

  if(names) {
    workers = [];
    names.forEach(function(entry){
      if (fs.existsSync(path.resolve(workersPath,entry))) {
        workers.push(entry);
      }
    });
  } else {
    workers = fs.readdirSync(workersPath);
    if(!workers.length > 0) {
      throw new Error('No worker packages are available');
    }

    workers = workers.map(function(entry){
      return entry.replace('.js','')
    });
  }

  return workers;
};

function loadLogger(settings, workerHome, envName) {
  var logDir = path.resolve(workerHome, 'log');
  if (!fs.existsSync(logDir)) {
    console.log(logDir + ' does not exist. Creating it now');
    fs.mkdir(logDir);
  }
  var logPath = path.resolve(logDir, envName+'.log');
  var logger = new winston.Logger({
    transports: [
      new winston.transports.File({
        level: 'info',
        filename: logPath,
        handleExceptions: true,
        json: false,
        maxsize: 5242880, //5MB 5242880
        maxFiles: 50,
        colorize: false
      }),
      new winston.transports.Console({
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true
      })
    ],
    exitOnError: false
  });
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath);
  }
  settings.logger = logger;
}

function loadServices(settings, services) {
  settings.services = services;
  if(settings.services.aws) {
    settings.services.aws.drivers.forEach(function(driver) {
      switch(driver.toLowerCase()) {
        case 'sqs':
          settings.sqs = new AWS.SQS({
            accessKeyId: settings.services.aws.access_key_id,
            secretAccessKey: settings.services.aws.secret_access_key,
            region: settings.services.aws.region
          });
          break;
        case 'sns':
          settings.sns = new AWS.SNS({
            accessKeyId: settings.services.aws.access_key_id,
            secretAccessKey: settings.services.aws.secret_access_key,
            region: settings.services.aws.region
          });
          break;
        case 'dynamodb':
          settings.dynamodb = new AWS.DynamoDB({
            accessKeyId: settings.services.aws.access_key_id,
            secretAccessKey: settings.services.aws.secret_access_key,
            region: settings.services.aws.region
          });
        case 's3':
          settings.s3 = new AWS.S3({
            accessKeyId: settings.services.aws.access_key_id,
            secretAccessKey: settings.services.aws.secret_access_key
          });
          s3_region = settings.services.aws.region == 'us-east-1' ? '' : '-'+settings.services.aws.region
          settings.s3.endpoint = "https://s3"+s3_region+".amazonaws.com"
          break;
      }
    });
  }

  if(settings.services.sendgrid) {
    settings.sendgrid = sendgridAPI(settings.services.sendgrid.api_user, settings.services.sendgrid.api_key);
  }
}

function loadDatabase(settings, mysql, workerHome) {
  var modelPath = path.resolve(workerHome,'models','index.js');
  var sequelizeOptions = {
    host: mysql.host,
    port: mysql.port,
    dialect: 'mysql',
    pool: {
      maxConnections: 100,
      maxIdleTime: 30,
      handleDisconnects: true
    },
    logging: mysql.logging
  };

  settings.sequelize = new Sequelize(
    mysql.database,
    mysql.username,
    mysql.password,
    sequelizeOptions);

  if (fs.existsSync(modelPath)) {
    settings.models = require(modelPath)(settings.sequelize);
  }
}

var loadSettings = function(workerName, workersPath){
  var envName =  process.env.WORKER_ENV || process.env.NODE_ENV || 'development';
  var workerHome = path.resolve(workersPath, workerName);
  var config = JSON.parse(fs.readFileSync(path.resolve(workerHome,'config.json')))[envName];
  var settings = {};

  settings.env = envName;
  settings.workerName = workerName;

  if (config.logger) {
    loadLogger(settings, workerHome, envName);
  }

  if (config.services) {
    loadServices(settings, config.services);
  }

  if (config.mysql) {
    loadDatabase(settings, config.mysql, workerHome)
  }

  return settings;
};

var validatedDate = function(dateString, format) {
  if(!format) format = 'YYYY-MM-DD HH:mm:SS';
  return moment(dateString, format).isValid() ? dateString : null;
};

var moment = function() {
  var args = _.values(arguments);
  return momentTZ.apply(this,args).tz(timezone);
};

var convertToNZT = function(dateString) {
  if(!mom(dateString).isValid()) return null;

  var date = mom(dateString);
  var offset = parseInt(date.toString().split('+')[1]/100);
  return date.add(offset, 'hours');
};

module.exports.loadWorkerNames = loadWorkerNames;
module.exports.validatedDate = validatedDate;
module.exports.loadSettings = loadSettings;
module.exports.moment = moment;
module.exports.convertToNZT = convertToNZT;
