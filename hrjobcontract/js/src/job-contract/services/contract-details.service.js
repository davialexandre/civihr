/* eslint-env amd */

define([
  'common/angular'
], function (angular) {
  'use strict';

  contractDetailsService.__name = 'contractDetailsService';
  contractDetailsService.$inject = ['$filter', '$resource', 'settings', '$q', 'utilsService', '$log'];

  function contractDetailsService ($filter, $resource, settings, $q, utilsService, $log) {
    $log.debug('Service: contractDetailsService');

    var ContractDetails = $resource(settings.pathRest, {
      action: 'get',
      entity: 'HRJobDetails',
      json: {}
    });

    return {
      validateDates: function (params) {
        if ((!params || typeof params !== 'object') ||
          (!params.contact_id) ||
          (!params.period_start_date)) {
          return null;
        }

        params.period_start_date = convertToDateString(params.period_start_date);
        params.period_end_date = convertToDateString(params.period_end_date);

        params.sequential = 0;
        params.debug = settings.debug;

        var deffered = $q.defer();
        var val;

        ContractDetails.save({
          action: 'validatedates',
          json: params
        },
          null,
          function (data) {
            if (utilsService.errorHandler(data, 'Unable to fetch API "validatedates" response', deffered)) {
              return;
            }

            val = data.values;
            deffered.resolve(val);
          });
        return deffered.promise;
      },
      getOne: function (params) {
        if ((!params || typeof params !== 'object') ||
          (!params.jobcontract_id && !params.jobcontract_revision_id) ||
          (params.jobcontract_id && typeof +params.jobcontract_id !== 'number') ||
          (params.jobcontract_revision_id && typeof +params.jobcontract_revision_id !== 'number')) {
          return null;
        }

        params.sequential = 1;
        params.debug = settings.debug;

        var deffered = $q.defer();
        var val;

        ContractDetails.get({
          json: params
        }, function (data) {
          if (utilsService.errorHandler(data, 'Unable to fetch contract details', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to fetch contract details');
        });

        return deffered.promise;
      },
      getOptions: function (fieldName, callAPI) {
        var deffered = $q.defer();
        var data;

        if (!callAPI) {
          data = settings.CRM.options.HRJobDetails || {};

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

        if (crmFields && crmFields.HRJobDetails) {
          deffered.resolve(crmFields.HRJobDetails);
        } else {
          params.sequential = 1;

          ContractDetails.get({
            action: 'getfields',
            json: params
          },
          function (data) {
            if (!data.values) {
              deffered.reject('Unable to fetch contract details fields');
            }

            deffered.resolve(data.values);
          }, function () {
            deffered.reject('Unable to fetch contract details fields');
          });
        }

        return deffered.promise;
      },
      save: function (contractDetails) {
        if (!contractDetails || typeof contractDetails !== 'object') {
          return null;
        }

        contractDetails.period_start_date = convertToDateString(contractDetails.period_start_date);
        contractDetails.period_end_date = convertToDateString(contractDetails.period_end_date);

        var deffered = $q.defer();
        var params = angular.extend({
          sequential: 1,
          debug: settings.debug
        }, contractDetails);
        var val;

        ContractDetails.save({
          action: 'create',
          json: params
        },
        null,
        function (data) {
          if (utilsService.errorHandler(data, 'Unable to create contract details', deffered)) {
            return;
          }

          val = data.values;
          deffered.resolve(val.length === 1 ? val[0] : null);
        },
        function () {
          deffered.reject('Unable to create contract details');
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

          if (typeof model.location !== 'undefined') {
            model.location = null;
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

    /**
     * If parameter passed is a Date object, it converts it into a string
     *
     * @param {Date} dateObj
     * @param {string/any}
     */
    function convertToDateString (dateObj) {
      var dateString = $filter('formatDate')(dateObj, 'YYYY-MM-DD');

      return dateString !== 'Unspecified' ? dateString : dateObj;
    }
  }

  return contractDetailsService;
});
