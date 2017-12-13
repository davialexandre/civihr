var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var SubTask = require('gulp-subtask')(gulp);
var gutil = require("gulp-util");
var clean = require('gulp-clean');
var color = require('gulp-color');
var file = require('gulp-file');
var backstopjs = require('backstopjs');
var fs = require('fs');
var path = require('path');
var Promise = require('es6-promise').Promise;
var cv = require('civicrm-cv')({ mode: 'sync' });

// BackstopJS tasks
(function () {
  var backstopDir = 'backstop_data/';
  var files = { config: 'site-config.json', tpl: 'backstop.tpl.json' };
  var configTpl = {
    "url": "http://%{site-host}",
    "credentials": { "name": "%{user-name}", "pass": "%{user-password}" }
  };

  gulp.task('backstopjs:reference', function (done) {
    runBackstopJS('reference').then(function () {
      done();
    });
  });

  gulp.task('backstopjs:test', function (done) {
    runBackstopJS('test').then(function () {
      done();
    });
  });

  gulp.task('backstopjs:report', function (done) {
    runBackstopJS('openReport').then(function () {
      done();
    });
  });

  gulp.task('backstopjs:approve', function (done) {
    runBackstopJS('approve').then(function () {
      done();
    });
  });

  /**
   * Checks if the site config file is in the backstopjs folder
   * If not, it creates a template for it
   *
   * @return {Boolean} [description]
   */
  function isConfigFilePresent() {
    var check = true;

    try {
      fs.readFileSync(backstopDir + files.config);
    } catch (err) {
      fs.writeFileSync(backstopDir + files.config, JSON.stringify(configTpl, null, 2));
      check = false;
    }

    return check;
  }

  /**
   * Runs backstopJS with the given command.
   *
   * It fills the template file with the list of scenarios, create a temp
   * file passed to backstopJS, then when the command is completed it removes the temp file
   *
   * @param  {string} command
   * @return {Promise}
   */
  function runBackstopJS(command) {
    var destFile = 'backstop.temp.json';

    if (!isConfigFilePresent()) {
      console.log(color(
        "No site-config.json file detected!\n" +
        "One has been created for you under " + backstopDir + "\n" +
        "Please insert the real value for each placholder and try again", "RED"
      ));

      return Promise.reject();
    }

    return new Promise(function (resolve) {
      gulp.src(backstopDir + files.tpl)
      .pipe(file(destFile, tempFileContent()))
      .pipe(gulp.dest(backstopDir))
      .on('end', function () {
        var promise = backstopjs(command, {
          configPath: backstopDir + destFile,
          filter: argv.filter
        })
        .catch(_.noop).then(function () { // equivalent to .finally()
          gulp.src(backstopDir + destFile, { read: false }).pipe(clean());
        });

        resolve(promise);
      });
    });
  }

  /**
   * Creates the content of the config temporary file that will be fed to BackstopJS
   * The content is the mix of the config template and the list of scenarios
   * under the scenarios/ folder
   *
   * @return {string}
   */
  function tempFileContent() {
    var config = JSON.parse(fs.readFileSync(backstopDir + files.config));
    var content = JSON.parse(fs.readFileSync(backstopDir + files.tpl));

    content.scenarios = scenariosList().map(function (scenario) {
      scenario.url = config.url + '/' + scenario.url;

      return scenario;
    });

    return JSON.stringify(content);
  }

  /**
   * Concatenates all the scenarios, or returns only the scenario passed as
   * an argument to the gulp task
   *
   * The first scenario of the list gets the login script to run
   *
   * @return {Array}
   */
  function scenariosList() {
    var scenariosPath = backstopDir + 'scenarios/';

    return _(fs.readdirSync(scenariosPath))
      .filter(function (scenario) {
        return argv.configFile ? scenario === argv.configFile : true;
      })
      .map(function (scenarioFile) {
        return JSON.parse(fs.readFileSync(scenariosPath + scenarioFile)).scenarios;
      })
      .flatten()
      .map(function (scenario) {
        return _.assign(scenario, { delay: scenario.delay || 6000 });
      })
      .tap(function (scenarios) {
        scenarios[0].onBeforeScript = "login";

        return scenarios;
      })
      .value();
  }
})();

// Sass
(function () {
  var bulk = require('gulp-sass-bulk-import');
  var civicrmScssRoot = require('civicrm-scssroot')();
  var sass = require('gulp-sass');
  var stripCssComments = require('gulp-strip-css-comments');

  gulp.task('sass', ['sass:sync'], function (cb) {
    var extPath = getExtensionPath();
    var customLogic = getExtensionCustomPluginLogic(extPath, 'sass')

    if (customLogic.full) {
      return customLogic.full(cb);
    }

    return gulp.src(extPath + '/scss/*.scss')
      .pipe(bulk())
      .pipe(customLogic.pre ? customLogic.pre() : gutil.noop())
      .pipe(sass({
        outputStyle: 'compressed',
        includePaths: civicrmScssRoot.getPath(),
        precision: 10
      }).on('error', sass.logError))
      .pipe(stripCssComments({ preserve: false }))
      .pipe(customLogic.post ? customLogic.post() : gutil.noop())
      .pipe(gulp.dest(extPath + '/css/'));
  });

  gulp.task('sass:sync', function () {
    civicrmScssRoot.updateSync();
  });
}());

function getExtensionCustomPluginLogic (extensionPath, pluginName) {
  var filePath = path.join(extensionPath, '/gulp-tasks/', pluginName + '.js');

  if (fs.existsSync(filePath)) {
    return require(filePath)(new SubTask(pluginName + ':' + argv.ext));
  } else {
    return {};
  }
}

function getExtensionPath () {
  var path;

  if (!argv.ext) {
    throwError('sass', 'Extension name not found in task parameters');
  }

  try {
    path = cv('path -x ' + argv.ext)[0].value;
  } catch (err) {
    throwError('sass', 'Extension "' + argv.ext + '" not found');
  }

  return path;
}

function throwError (plugin, msg) {
  throw new gutil.PluginError(plugin, {
    message: gutil.colors.red(msg),
  });
}
