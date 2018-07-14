/* eslint-env amd */

define([
  'common/lodash',
  'leave-absences/mocks/data/calendar-feed-config.data',
  'leave-absences/mocks/module',
  'common/angularMocks'
], function (_, calendarFeedConfigData, mocks) {
  'use strict';

  mocks.factory('CalendarFeedConfigAPIMock', [
    '$q',
    function ($q) {
      var methods = {
        all: all
      };

      /**
       * Returns mocked data for all() method
       *
       * @return {Promise} resolves with an array of feed objects
       */
      function all () {
        return $q.resolve()
          .then(function () {
            return calendarFeedConfigData.all().values;
          });
      }

      return methods;
    }
  ]);
});
