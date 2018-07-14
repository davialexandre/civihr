/* eslint-env amd */

define(function () {
  'use strict';

  parseInteger.__name = 'parseInteger';
  parseInteger.$inject = ['$log'];

  function parseInteger ($log) {
    $log.debug('Filter: parseInteger');

    return function (input) {
      return input ? parseInt(input) : null;
    };
  }

  return parseInteger;
});
