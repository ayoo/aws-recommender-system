/**
 * - Simple runner script that starts a master and forks all available workers
 */

var cluster = require('cluster');
var workerHelper = require('lib-utils').Helper;
var path = require('path');

if(cluster.isMaster) {
  var workers = process.env.WORKERS ? process.env.WORKERS.split(',') : null;
  var workerMap = {};
  //Start all available workers
  workerHelper.loadWorkerNames(workers, __dirname).forEach(function(workerName){
    startWorker(workerName);
  });

  //restart the worker if it was stopped abruptly
  cluster.on('exit', function(worker, code, signal) {
    var workerName = workerMap[worker.id];
    console.log('restarting a worker #' + workerName);
    startWorker(workerName);

  });

  function startWorker(workerName){
    var worker = cluster.fork();
    workerMap[worker.id] = workerName;
    worker.send(workerName);
  }

} else {
  process.on('message', function(workerName){
    var worker = require(path.resolve(workerName, 'worker'));
    worker.start(workerHelper.loadSettings(workerName, __dirname));
  });
}
