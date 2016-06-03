var gulp = require('gulp');
var gutil = require('gulp-util');
var fs = require('fs');
var path = require('path');
var taskListing = require('gulp-task-listing');
var argv = require('yargs').argv;
var runSequence = require('run-sequence');
var rimraf = require('rimraf');
var zip = require('gulp-zip');
var shell = require('gulp-shell');
var execSync = require('child_process').execSync;

var BUILD_DIR = 'build';
var BASE_FILES = ['package.json'];

function getLambda() {
  if (!argv.lambda) {
    throw new Error('handler is missing! Please provide lambda option: --lambda some-lambda-name');
  }
  return argv.lambda;
}

function getWorker() {
  if (!argv.worker) {
    throw new Error('worker is missing! Please provide worker option: --worker some-worker-name');
  }
  return argv.worker;
}

function getPyWorker() {
  if (!argv.pyworker) {
    throw new Error('pyworker is missing! Please provide pyworker option: --pyworker some-worker-name');
  }
  return argv.pyworker;
}

gulp.task('copy-package-json-lambda', function(cb) {
  var filename = path.resolve(__dirname, 'lambdas', getLambda(), 'package.json');
  var packageJson = JSON.parse(fs.readFileSync(filename));
  if (packageJson.dependencies.awsrec) {
    packageJson.dependencies.awsrec = 'file:../lib-awsrec';
  }
  fs.writeFile('build/package.json', JSON.stringify(packageJson, null, 2), cb);
});

gulp.task('copy-lambda', function() {
  var lambdaName = getLambda();
  return gulp.src(['lambdas/' + lambdaName + '/**/*', '!node_modules'],
                  {base: './lambdas/'+ lambdaName})
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy-lambda-index', function() {
  var file = 'index.js';
  return gulp.src('./lambdas/'+file)
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy-worker', function() {
  var workerName = getWorker();
  return gulp.src(['workers/' + workerName + '/**/*', 'workers/index.js', '!node_modules'],
                  {base: './workers'})
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy-pyworker', function() {
  var workerName = getPyWorker();
  return gulp.src([
        'pyworkers/' + workerName + '/**/*',
        'pyworkers/' + workerName + '/.ebextensions/**/*',
        '!pyworkers/' + workerName + '/venv/**'],
    {base: './pyworkers/' + workerName})
    .pipe(gulp.dest(BUILD_DIR));
});
gulp.task('copy-cron', function() {
  var workerName = getWorker();
  return gulp.src(['workers/' + workerName + '/cron.yaml'],
                  {base: './workers/' + workerName})
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy-libs-worker', function() {
  return gulp.src([
        'lib-utils/**/*',
        '!lib-utils/{node_modules,node_modules/**}',
        'lib-awsrec/**/*',
        '!lib-awsrec/{node_modules,node_modules/**}'
      ],
      {base: '.'}
    )
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy-cron-to-root', function() {
  var worker = getWorker();
  return gulp.src('./workers/' + worker+ '/cron.yaml', {base: './workers/' + worker}).
    pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy-package-json-worker', function(cb) {
  var filename = path.resolve(__dirname, 'workers', getWorker(), 'package.json');
  var packageJson = JSON.parse(fs.readFileSync(filename));
  if (packageJson.dependencies['lib-utils']) {
    packageJson.dependencies['lib-utils'] = 'file:./lib-utils';
  }
  fs.writeFile('build/package.json', JSON.stringify(packageJson, null, 2), cb);
});

gulp.task('install-node-modules', shell.task(['cd build;npm install --production']));

gulp.task('zip-lambda', function(cb) {
  // change date format from 20:12:23 for time string to 20-12:23 because
  // colons are replaced with a slash and truncate miliseconds part
  var now = new Date().toISOString().replace(/:/g, '-').replace(/\.\d*Z$/, 'Z')
  var gitBranch = execSync('git branch', {encoding: 'utf-8'})
    .split('\n').filter(function(br) {
      return br.match(/^\* .*$/);
    })[0].slice(2);
  var filename = [BUILD_DIR, getLambda(), now, gitBranch].join('-') + '.zip';

  return gulp.src([BUILD_DIR + '/**/*', BUILD_DIR + '/.*/*'], {base: BUILD_DIR})
    .pipe(zip(filename))
    .pipe(gulp.dest('.'));
});

gulp.task('zip-worker', function(cb) {
  // change date format from 20:12:23 for time string to 20-12:23 because
  // colons are replaced with a slash and truncate miliseconds part
  var now = new Date().toISOString().replace(/:/g, '-').replace(/\.\d*Z$/, 'Z')
  var gitBranch = execSync('git branch', {encoding: 'utf-8'})
    .split('\n').filter(function(br) {
      return br.match(/^\* .*$/);
    })[0].slice(2);
  var filename = [BUILD_DIR, getWorker(), now, gitBranch].join('-') + '.zip';

  return gulp.src([BUILD_DIR + '/**/*', BUILD_DIR + '/.*/*'], {base: BUILD_DIR})
    .pipe(zip(filename))
    .pipe(gulp.dest('.'));
});

gulp.task('zip-pyworker', function(cb) {
  // change date format from 20:12:23 for time string to 20-12:23 because
  // colons are replaced with a slash and truncate miliseconds part
  var now = new Date().toISOString().replace(/:/g, '-').replace(/\.\d*Z$/, 'Z')
  var gitBranch = execSync('git branch', {encoding: 'utf-8'})
    .split('\n').filter(function(br) {
      return br.match(/^\* .*$/);
    })[0].slice(2);
  var filename = [BUILD_DIR, getPyWorker(), now, gitBranch].join('-') + '.zip';

  return gulp.src([BUILD_DIR + '/**/*', BUILD_DIR + '/.*/*'], {base: BUILD_DIR})
    .pipe(zip(filename))
    .pipe(gulp.dest('.'));
});

gulp.task('build-clean', function(cb) {
  rimraf(BUILD_DIR, cb);
});

gulp.task('build', function() {
  if (argv.lambda) {
    runSequence('build-clean', 'copy-lambda', 'copy-package-json-lambda', 'install-node-modules', 'zip-lambda');
  } else if (argv.worker) {
    runSequence('build-clean', 'copy-worker', 'copy-package-json-worker', 'copy-libs-worker', 'copy-cron-to-root', 'zip-worker');
  } else if (argv.pyworker) {
    runSequence('build-clean', 'copy-pyworker', 'zip-pyworker');
  } else {
    gutil.log('No build type specified');
  }
});

gulp.task('help', taskListing);

gulp.task('default', ['help']);
