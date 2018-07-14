/* eslint-env amd */

define([
  'common/angular'
], function (angular) {
  'use strict';

  contractHealthService.__name = 'contractHealthService';
  contractHealthService.$inject = [
    '$resource', 'settings', '$q', 'utilsService', '$log'
  ];

  function contractHealthService ($resource, settings, $q, utilsService, $log) {
    $log.debug('Service: contractHealthService');

    var ContractHealth = $resource(settings.pathRest, {
      action: 'get',
      entity: 'HRJobHealth',
      json: {}
    });

    return {
      getOne: function (params) {
        if ((!params || typeof params !== 'object') ||
          (!params.jobcontract_revision_id) ||
          (params.jobcontract_revision_id && typeof +params.jobcontract_revision_id !== 'number')) {
          return null;
        }

        params.sequential = 1;
        params.debug = settings.debug;

        var deffered = $q.defer();
        var val;

        ContractHealth.get({
          json: params
        },
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to fetch contract Health', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to fetch contract Health');
        });

        return deffered.promise;
      },
      getOptions: function (fieldName, callAPI) {
        var deffered = $q.defer();
        var params = {};
        var data;

        if (!callAPI) {
          data = settings.CRM.options.HRJobHealth || {};

          if (fieldName && typeof fieldName === 'string') {
            data = data[fieldName];
          }

          deffered.resolve(data || {});
        } else {
          params.sequential = 1;

          if (fieldName && typeof fieldName === 'string') {
            params.field = fieldName;
          }

          ContractHealth.get({
            action: 'getoptions',
            json: params
          },
          function (data) {
            if (!data.values) {
              deffered.reject('Unable to fetch contract insurance options');
            }
            deffered.resolve(data.values);
          },
          function () {
            deffered.reject('Unable to fetch contract insurance options');
          });
        }

        return deffered.promise;
      },
      getFields: function (params) {
        if (params && typeof params !== 'object') {
          return null;
        }

        if (!params || typeof params !== 'object') {
          params = {};
        }

        var deffered = $q.defer();
        var crmFields = settings.CRM.fields;

        if (crmFields && crmFields.HRJobHealth) {
          deffered.resolve(crmFields.HRJobHealth);
        } else {
          params.sequential = 1;

          ContractHealth.get({
            action: 'getfields',
            json: params
          },
          function (data) {
            if (!data.values) {
              deffered.reject('Unable to fetch contract insurance fields');
            }

            deffered.resolve(data.values);
          },
          function () {
            deffered.reject('Unable to fetch contract insurance fields');
          });
        }

        return deffered.promise;
      },
      save: function (contractHealth) {
        if (!contractHealth || typeof contractHealth !== 'object') {
          return null;
        }

        var deffered = $q.defer();
        var params = angular.extend({
          sequential: 1,
          debug: settings.debug
        }, contractHealth);
        var val;

        ContractHealth.save({
          action: 'create',
          json: params
        },
        null,
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to create contract insurance', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to create contract insurance');
        });

        return deffered.promise;
      },
      model: function (fields) {
        var deffered = $q.defer();

        function createModel (fields) {
          var i = 0;
          var len = fields.length;
          var model = {};

          for (i; i < len; i++) {
            model[fields[i].name] = '';
          }

          if (typeof model.id !== 'undefined') {
            model.id = null;
          }

          if (typeof model.jobcontract_revision_id !== 'undefined') {
            model.jobcontract_revision_id = null;
          }

          return model;
        }

        if (fields) {
          deffered.resolve(createModel(fields));
        } else {
          this.getFields().then(function (fields) {
            deffered.resolve(createModel(fields));
          });
        }

        return deffered.promise;
      }
    };
  }

  return contractHealthService;
});
