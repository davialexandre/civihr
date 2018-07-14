var argv = require('yargs').argv;

module.exports = function (config) {
  var civicrmPath = '../../../../../';
  var civihrPath = 'tools/extensions/civihr/';
  var extPath = civihrPath + 'contactsummary/';

  config.set({
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
      extPath + 'js/test/globals.js',

      // manual loading of requirejs as to avoid interference with the global dependencies above
      civihrPath + 'uk.co.compucorp.civicrm.hrcore/node_modules/requirejs/require.js',
      civihrPath + 'uk.co.compucorp.civicrm.hrcore/node_modules/karma-requirejs/lib/adapter.js',

      // all the common/ dependencies
      civihrPath + 'org.civicrm.reqangular/dist/reqangular.min.js',

      // External extensions files
      { pattern: civihrPath + 'uk.co.compucorp.civicrm.hrleaveandabsences/js/angular/src/**/!(*.spec).js', included: false },

      // the application modules
      { pattern: extPath + 'js/src/contact-summary/**/*.js', included: false },

      // the mocked components files
      { pattern: extPath + 'js/test/mocks/**/*.js', included: false },

      // the test files
      { pattern: extPath + 'js/test/**/*.spec.js', included: false },

      // angular templates
      extPath + 'views/**/*.html',

      // the requireJS config file that bootstraps the whole test suite
      extPath + 'js/test/test-main.js'
    ],
    exclude: [
      extPath + 'js/src/contact-summary.js'
    ],
    // Used to transform angular templates in JS strings
    preprocessors: (function (obj) {
      obj[extPath + 'views/**/*.html'] = ['ng-html2js'];
      return obj;
    })({}),
    ngHtml2JsPreprocessor: {
      prependPrefix: '/base/',
      moduleName: 'contact-summary.templates'
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
      outputFile: 'contactsummary.xml'
    }
  });
};
