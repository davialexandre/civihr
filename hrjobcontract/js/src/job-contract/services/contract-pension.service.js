/* eslint-env amd */

define([
  'common/angular'
], function (angular) {
  'use strict';

  contractPensionService.__name = 'contractPensionService';
  contractPensionService.$inject = [
    '$resource', 'settings', '$q', 'utilsService', '$log'
  ];

  function contractPensionService ($resource, settings, $q, utilsService, $log) {
    $log.debug('Service: contractPensionService');

    var ContractPension = $resource(settings.pathRest, {
      action: 'get',
      entity: 'HRJobPension',
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

        ContractPension.get({
          json: params
        },
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to fetch contract pension', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to fetch contract pension');
        });

        return deffered.promise;
      },
      getOptions: function (fieldName, callAPI) {
        var deffered = $q.defer();
        var data;

        if (!callAPI) {
          data = settings.CRM.options.HRJobPension || {};

          if (fieldName && typeof fieldName === 'string') {
            data = data[fieldName];
          }

          deffered.resolve(data || {});
        } else {
          // TODO call2API
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

        if (crmFields && crmFields.HRJobPension) {
          deffered.resolve(crmFields.HRJobPension);
        } else {
          params.sequential = 1;

          ContractPension.get({
            action: 'getfields',
            json: params
          },
          function (data) {
            if (!data.values) {
              deffered.reject('Unable to fetch contract pension fields');
            }

            deffered.resolve(data.values);
          },
          function () {
            deffered.reject('Unable to fetch contract pension fields');
          });
        }

        return deffered.promise;
      },
      save: function (contractPension) {
        if (!contractPension || typeof contractPension !== 'object') {
          return null;
        }

        var deffered = $q.defer();
        var params = angular.extend({
          sequential: 1,
          debug: settings.debug
        }, contractPension);
        var val;

        ContractPension.save({
          action: 'create',
          json: params
        },
        null,
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to create contract pension', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to create contract pension');
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

  return contractPensionService;
});
