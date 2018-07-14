/* eslint-env amd */

define([
  'common/angular'
], function (angular) {
  'use strict';

  utilsService.__name = 'utilsService';
  utilsService.$inject = ['apiService', 'settings', '$q', '$log', '$rootElement', '$timeout', '$uibModal', '$window', 'AbsencePeriod'];

  function utilsService (API, settings, $q, $log, $rootElement, $timeout, $modal, $window, AbsencePeriod) {
    return {

      /**
       * Returns a promise that resolves to an array with including all of the Absence Types.
       *
       * Each returned Absence Type includes these fields:
       * - id
       * - title
       * - default_entitlement
       * - add_public_holiday_to_entitlement
       *
       * @returns {Promise}
       */
      getAbsenceTypes: function () {
        var deffered = $q.defer();

        API.resource('AbsenceType', 'get', {
          'return': 'id,title,default_entitlement,add_public_holiday_to_entitlement'
        }).get(function (data) {
          angular.forEach(data.values, function (value) {
            value.add_public_holiday_to_entitlement = !!parseInt(value.add_public_holiday_to_entitlement);
            // The default_entitlement is return by the API as a string
            // so here we cast it to a float, to make it easy to do calculations and
            // to display the value in forms
            value.default_entitlement = parseFloat(value.default_entitlement);
          });

          deffered.resolve(data.values);
        }, function () {
          deffered.reject('Unable to fetch absence types');
        });

        return deffered.promise;
      },

      getHoursLocation: function () {
        var deffered = $q.defer();

        API.resource('HRHoursLocation', 'get', {
          sequential: 1,
          is_active: 1
        }).get(function (data) {
          deffered.resolve(data.values);
        }, function () {
          deffered.reject('Unable to fetch standard hours');
        });

        return deffered.promise;
      },
      getPayScaleGrade: function () {
        var deffered = $q.defer();

        API.resource('HRPayScale', 'get', {
          sequential: 1,
          is_active: 1
        }).get(function (data) {
          deffered.resolve(data.values);
        }, function () {
          deffered.reject('Unable to fetch standard hours');
        });

        return deffered.promise;
      },

      /**
       * Returns a promise that resolves the an int with the number of Public Holidays in the
       * current Absence Period
       *
       * @returns {Promise}
       */
      getNumberOfPublicHolidaysInCurrentPeriod: function () {
        var deffered = $q.defer();

        API.resource('PublicHoliday', 'getcountforcurrentperiod', {
          sequential: 1
        }).get(function (data) {
          var number = parseInt(data.result) || 0;

          deffered.resolve(number);
        }, function () {
          deffered.reject('Unable to fetch the number of public holidays in current period');
        });

        return deffered.promise;
      },

      prepareEntityIds: function (entityObj, contractId, revisionId) {
        function setIds (entityObj) {
          entityObj.jobcontract_id = contractId;
          delete entityObj.id;
          revisionId ? entityObj.jobcontract_revision_id = revisionId : delete entityObj.jobcontract_revision_id;
        }

        if (angular.isArray(entityObj)) {
          var i = 0;
          var len = entityObj.length;

          for (i; i < len; i++) {
            setIds(entityObj[i]);
          }

          return;
        }

        if (angular.isObject(entityObj)) {
          setIds(entityObj);
        }
      },
      errorHandler: function (data, msg, deffered) {
        var errorMsg;

        if (data.is_error) {
          errorMsg = data.error_message.split('_').join(' ');
          errorMsg = errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1);

          $log.error('Unable to save. ' + '\n' + errorMsg);

          if (deffered) {
            deffered.reject('Unable to save. ' + '\n' + errorMsg);
          }

          if (data.trace) {
            $log.error(data.trace);
          }

          return true;
        }

        if (!data.values) {
          $log.error(msg || 'Unknown Error');

          if (deffered) {
            deffered.reject(msg || 'Unknown Error');
          }
          return true;
        }
      },

      /**
       * Returns the URL to the Manage Entitlement page.
       *
       * The given contact ID is added to the URL, as the cid parameter.
       *
       * @param {int} contactId
       */
      getManageEntitlementsPageURL: function (contactId) {
        var path = 'civicrm/admin/leaveandabsences/periods/manage_entitlements';
        var returnPath = 'civicrm/contact/view';
        var returnUrl = CRM.url(returnPath, { cid: contactId, selectedChild: 'hrjobcontract' });
        return CRM.url(path, { cid: contactId, returnUrl: returnUrl });
      },

      /**
       * Redirects the user to the entitlements update screen if
       * absence periods exist and the user confirms a dialog prompt
       *
       * @param {int} contactID
       */
      updateEntitlements: function (contactID) {
        checkIfAbsencePeriodsExists()
          .then(function (exists) {
            if (!exists) {
              return;
            }

            confirmUpdateEntitlements()
              .then(function () {
                $window.location.assign(this.getManageEntitlementsPageURL(contactID));
              }.bind(this));
          }.bind(this));
      }
    };

    /**
     * Shows a confirmation dialog warning the user that, if they proceed, the staff
     * leave entitlement will be updated.
     *
     * @returns {Promise}
     */
    function confirmUpdateEntitlements () {
      var modalUpdateEntitlements = $modal.open({
        appendTo: $rootElement.find('div').eq(0),
        size: 'sm',
        templateUrl: settings.pathApp + 'views/modalDialog.html?v=' + (new Date()).getTime(),
        controller: 'ModalDialogController',
        resolve: {
          content: {
            title: 'Update leave entitlements?',
            msg: 'The system will now update the staff member leave entitlement.',
            copyConfirm: 'Proceed'
          }
        }
      });

      return modalUpdateEntitlements.result;
    }

    /**
     * Checks if any absence periods exist, and returns true if it does
     *
     * @returns {Promise}
     */
    function checkIfAbsencePeriodsExists () {
      return AbsencePeriod.all()
        .then(function (periods) {
          return !!periods.length;
        });
    }
  }

  return utilsService;
});
