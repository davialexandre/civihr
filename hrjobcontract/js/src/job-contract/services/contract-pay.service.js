/* eslint-env amd */

define([
  'common/angular'
], function (angular) {
  'use strict';

  contractPayService.__name = 'contractPayService';
  contractPayService.$inject = [
    '$resource', 'settings', '$q', 'utilsService', '$log'
  ];

  function contractPayService ($resource, settings, $q, utilsService, $log) {
    $log.debug('Service: contractPayService');

    var ContractPay = $resource(settings.pathRest, {
      action: 'get',
      entity: 'HRJobPay',
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

        ContractPay.get({
          json: params
        },
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to fetch contract pay', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to fetch contract pay');
        });

        return deffered.promise;
      },
      getOptions: function (fieldName, callAPI) {
        var deffered = $q.defer();
        var data;

        if (!callAPI) {
          data = settings.CRM.options.HRJobPay || {};

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

        if (crmFields && crmFields.HRJobPay) {
          deffered.resolve(crmFields.HRJobPay);
        } else {
          params.sequential = 1;

          ContractPay.get({
            action: 'getfields',
            json: params
          },
          function (data) {
            if (!data.values) {
              deffered.reject('Unable to fetch contract pay fields');
            }

            deffered.resolve(data.values);
          },
          function () {
            deffered.reject('Unable to fetch contract pay fields');
          });
        }

        return deffered.promise;
      },
      save: function (contractPay) {
        if (!contractPay || typeof contractPay !== 'object') {
          return null;
        }

        var deffered = $q.defer();
        var params = angular.extend({
          sequential: 1,
          debug: settings.debug
        }, contractPay);
        var val;

        ContractPay.save({
          action: 'create',
          json: params
        },
        null,
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to create contract pay', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to create contract pay');
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

          if (typeof model.annual_benefits !== 'undefined') {
            model.annual_benefits = [];
          }

          if (typeof model.annual_deductions !== 'undefined') {
            model.annual_deductions = [];
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

  return contractPayService;
});
