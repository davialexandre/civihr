'use strict';

module.exports = function (casper, scenario) {
  var config = require('../site-config');
  var loginFormSelector = 'form#user-login-form';
  var credentials = config.credentials[scenario.credential || 'admin'];

  casper
    .then(function () {
      if (casper.exists('a[href="/user/logout"]')) {
        casper.echo('Current scenario has different login credentials from previous, logging out is necessary', 'INFO');
        casper.echo('Logging Out', 'INFO');
        return casper.evaluate(function () {
          jQuery('a[href="/user/logout"]')[0].click();
        });
      }
    })
    .then(function () {
      casper.echo('Logging in with "' + (scenario.credential || 'admin') + '" credentials before starting ...', 'INFO');
    })
    .thenOpen(config.url + '/welcome-page', function () {
      casper.then(function () {
        casper.waitForSelector(loginFormSelector, function () {
          casper.waitWhileSelector(loginFormSelector, function () {
            casper.echo('Logged in', 'INFO');
          }, function () {
            casper.echo('Login form visible and timeout reached!', 'RED_BAR');
          }, 5000);
          casper.fill(loginFormSelector, credentials, true);
        }, function () {
          casper.echo('Login form not found!', 'RED_BAR');
        }, 8000);
      });
    });
};
