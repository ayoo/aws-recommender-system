"use strict"
var Q = require('q');
var uuid = require('node-uuid');
var AWS = require('aws-sdk');
var _ = require('lodash');
var sqsConsumer = require('sqs-consumer');

var sqsBase = 'https://sqs.us-east-1.amazonaws.com/YOUR_APP_ID';
var topicBase = 'arn:aws:sns:us-east-1:YOUR_APP_ID';


var initialize = function(params, messageId) {
  var deferred = Q.defer();
  if(!params.rpc) return Q();

  var sqs = new AWS.SQS();
  sqs.createQueue({
    'QueueName': messageId
  }, function (err, result) {
    if (err) return deferred.reject(err);
    deferred.resolve(result);
  });
  return deferred.promise;
}

var fireEvent = function(params, messageId, result) {
  var deferred = Q.defer();
  var sns = new AWS.SNS();
  var message = {
    header: {
      id: messageId,
      type: _.capitalize(params.type),
      action: params.action,
      rpc : params.rpc || false,
      created_by: 'AwsRecAPI v1',
      created_at: new Date().toISOString()
    },
    body: params.handler_result_func ? params.handler_result_func(result) : params.handler_args
  };
  var snsMsg = {
    Subject: '[BORG-EVENT] ' + params.type,
    Message: JSON.stringify(message),
    TopicArn: topicBase + ':' + params.type + '-event'
  };
  sns.publish(snsMsg, function(err, data) {
    if (err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}


var waitForReply = function(params, messageId) {
  var deferred = Q.defer();
  if(!params.rpc) return Q();

  var app = sqsConsumer.create({
    queueUrl: sqsBase + '/' + messageId,
    handleMessage: function (message, done) {
      console.log('Reply message received:', message);
      app.stop();
      deferred.resolve(JSON.parse(message.Body));
    }
  });
  app.on('error', function (err) {
    app.stop();
    deferred.reject(err);
  });
  app.start();

  return deferred.promise;
}

var close = function(params, messageId) {
  var deferred = Q.defer();
  if(!params.rpc) return Q();

  var sqs = new AWS.SQS();
  var queueUrl = sqsBase+'/'+messageId;
  console.log('Deleting the reply queue: ' + queueUrl);

  sqs.deleteQueue({
    'QueueUrl': queueUrl
  }, function (err, result) {
    if (err) {
      console.log('Error in close: ', err);
      return deferred.reject(err);
    }
    deferred.resolve(result);
  });
  return deferred.promise;
}

var replyToClient = function(header, status, message) {
  console.log('Replying to client: ' + status);
  var deferred = Q.defer();
  var sqs = new AWS.SQS();
  var replyParams = {
    QueueUrl: sqsBase + '/' + header.id,
    MessageBody : JSON.stringify({
      header: {
        type: header.type,
        action: header.action,
        actioned_at: new Date().toISOString(),
        status: status
      },
      body: {
        message: message
      }
    }),
    DelaySeconds: 0
  };
  sqs.sendMessage(replyParams, function(err, data) {
    if(err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var runEventHandler = function(params) {
  var messageId = '_' + uuid.v4();
  var handlerResult = null;

  return initialize(params, messageId)
    .then(function(){
      return params.handler.apply(null, params.handler_args);
    })
    .then(function(result){
      handlerResult = {header: {status:200}, body: {message: result}};
      return fireEvent(params, messageId, result);
    })
    .then(function(result){
      return waitForReply(params, messageId);
    })
    .catch(function(err) {
      console.log('Error in runEventHandler', err);
      return close(params, messageId)
        .then(function(){
          return Q.reject(err);
        });
    })
    .then(function(response) {
      return close(params, messageId)
        .then(function(){
          return !params.rpc ? handlerResult : response;
        })
    });
}

var createItem = function(tableName, item) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();
  if (!tableName) return Q.reject(new Error('table name is required'));
  if (Object.keys(item).length === 0) return Q.reject(new Error('item is required'));

  var params = {
    "TableName": tableName,
    "Item": item
  };
  table.putItem(params, function(err, data) {
    if (err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var updateItem = function(tableName, searchKey, item) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();
  if (!tableName) return Q.reject(new Error('table name is required'));
  if (!searchKey) return Q.reject(new Error('search key is required'));
  if (Object.keys(item).length === 0) return Q.reject(new Error('item is required'));

  var params = {
    "TableName": tableName,
    Key: searchKey,
    AttributeUpdates: item
  }
  table.updateItem(params, function(err, data) {
    if (err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var deleteItem = function(tableName, item) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();

  return deferred.promise;
}

var readItem = function(tableName, primaryKey) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();
  if (!tableName) return Q.reject(new Error('table name is required'));
  if (!primaryKey) return Q.reject(new Error('primary key is required'));

  var params =   {
    "TableName": tableName,
    "Key": primaryKey,
    "ConsistentRead": true,
    "ReturnConsumedCapacity": "TOTAL"
  }
  console.log('ReadItem: params: ', params);
  table.getItem(params, function(err, data) {
    if (err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var queryItem = function(tableName, searchOptions) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();
  if (!tableName) return Q.reject(new Error('table name is missing'));
  if (Object.keys(searchOptions.KeyConditions).length === 0) return Q.reject(new Error('KeyConditions is required'));

  var params = {
    "TableName": tableName,
    "IndexName": searchOptions.IndexName || Object.keys(searchOptions.KeyConditions)[0] +"-index",
    "Select": searchOptions.Select || "ALL_ATTRIBUTES",
    "Limit": searchOptions.Limit || 25,
    "ConsistentRead": searchOptions.ConsistentRead || false,
    "KeyConditions": searchOptions.KeyConditions,
    "ReturnConsumedCapacity": "TOTAL"
  };

  table.query(params, function(err, data) {
    if (err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var createBatchItems = function(tableName, items) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();
  var params = {
    "RequestItems": {},
    "ReturnConsumedCapacity": "TOTAL"
  };
  params.RequestItems[tableName] = [];
  items.forEach(function(items) {
    var item = {
      "PutRequest": {
        "Item": items
      }
    }
    params.RequestItems[tableName].push(item);
  });

  table.batchWriteItem(params, function(err, data) {
    if (err) return deferred.reject(err);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var updateBatchItems = function(tableName, searchKey, items) {
  var deferred = Q.defer();
  var table = new AWS.DynamoDB();
  //Todo Implement me
  return deferred.promise;
}

var createOrUpdateBatchItems = function(tableName, searchOptions, items) {
  return queryItem(tableName, searchOptions)
    .then(function(result){
      if (result.Items.length > 0) {
        //Todo Implement Updating Batch Item
        return Q.reject(new Error('Item in ' + tableName +' already exists'));
      } else {
        return createBatchItems(tableName, items);
      }
    });
}

module.exports = {
  runEventHandler: runEventHandler,
  replyToClient: replyToClient,
  createItem: createItem,
  updateItem: updateItem,
  deleteItem: deleteItem,
  readItem: readItem,
  queryItem: queryItem,
  createBatchItems: createBatchItems,
  updateBatchItems: updateBatchItems,
  createOrUpdateBatchItems: createOrUpdateBatchItems,
  fireEvent: fireEvent
}