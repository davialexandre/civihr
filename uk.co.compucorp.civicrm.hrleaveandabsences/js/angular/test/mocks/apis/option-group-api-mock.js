/* eslint-env amd */

define([
  'common/lodash',
  'leave-absences/mocks/module',
  'leave-absences/mocks/data/option-group.data',
  'common/angularMocks'
], function (_, mocks, mockData) {
  'use strict';

  mocks.factory('OptionGroupAPIMock', ['$q', function ($q) {
    return {
      valuesOf: function (names) {
        return _.isArray(names)
          ? $q.resolve(_.transform(names, function (result, name) {
            result[name] = mockData.getCollection(name);
          }))
          : $q.resolve(mockData.getCollection(names));
      }
    };
  }]);
});
