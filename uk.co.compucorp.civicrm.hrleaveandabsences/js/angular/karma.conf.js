var argv = require('yargs').argv;

module.exports = function (config) {
  var civicrmPath = '../../../../../../';
  var civihrPath = 'tools/extensions/civihr/';
  var extPath = civihrPath + 'uk.co.compucorp.civicrm.hrleaveandabsences/';

  config.set({
    browserNoActivityTimeout: 100000,
    basePath: civicrmPath,
    browsers: ['ChromeHeadless'],
    frameworks: ['jasmine'],
    files: [
      // the global dependencies
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/jquery-ui/jquery-ui.js',
      'bower_components/lodash-compat/lodash.min.js',
      'bower_components/select2/select2.min.js',
      'bower_components/jquery-validation/dist/jquery.validate.min.js',
      'packages/jquery/plugins/jquery.mousewheel.min.js',
      'packages/jquery/plugins/jquery.blockUI.js',
      'js/Common.js',
      'js/crm.ajax.js',

      // Global variables that need to be accessible in the test environment
      extPath + 'js/angular/test/globals.js',

      // manual loading of requirejs as to avoid interference with the global dependencies above
      civihrPath + 'uk.co.compucorp.civicrm.hrcore/node_modules/requirejs/require.js',
      civihrPath + 'uk.co.compucorp.civicrm.hrcore/node_modules/karma-requirejs/lib/adapter.js',

      // all the common/ dependencies
      civihrPath + 'org.civicrm.reqangular/dist/reqangular.min.js',

      // all the common/ mocked dependencies
      civihrPath + 'org.civicrm.reqangular/dist/reqangular.mocks.min.js',

      // the application modules
      { pattern: extPath + 'js/angular/src/leave-absences/**/*.js', included: false },

      // the mocked components files
      { pattern: extPath + 'js/angular/test/mocks/**/*.js', included: false },

      // the test files
      { pattern: extPath + 'js/angular/test/**/*.spec.js', included: false },

      // angular templates
      extPath + '**/*.html',

      // the requireJS config file that bootstraps the whole test suite
      extPath + 'js/angular/test/test-main.js'
    ],
    exclude: [
      extPath + 'js/angular/src/my-leave.js'
    ],
    // Used to transform angular templates in JS strings
    preprocessors: (function (obj) {
      obj[extPath + '**/*.html'] = ['ng-html2js'];
      return obj;
    })({}),
    ngHtml2JsPreprocessor: {
      prependPrefix: '/base/',
      moduleName: 'leave-absences.templates'
    },
    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--headless',
          '--disable-gpu',
          // Without a remote debugging port, Google Chrome exits immediately.
          '--remote-debugging-port=9222'
        ]
      }
    },
    reporters: argv.reporters ? argv.reporters.split(',') : ['spec'],
    specReporter: {
      suppressSkipped: true
    },
    junitReporter: {
      outputDir: extPath + 'test-reports',
      useBrowserName: false,
      outputFile: 'hrleaveandabsences.xml'
    }
  });
};
