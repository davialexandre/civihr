/* eslint-env amd, jasmine */

define([
  'common/lodash',
  'common/moment',
  'common/angular',
  'leave-absences/mocks/data/absence-type.data',
  'common/angularMocks',
  'leave-absences/shared/config',
  'leave-absences/absence-tab/app',
  'common/mocks/services/api/contract-mock',
  'leave-absences/mocks/apis/absence-type-api-mock',
  'common/mocks/services/hr-settings-mock'
], function (_, moment, angular, absenceTypeMocked) {
  'use strict';

  describe('contactEntitlements', function () {
    var contactId = 202;
    var $componentController, $log, $rootScope, controller, $provide,
      ContractAPIMock, HRSettingsMock;

    beforeEach(module('leave-absences.templates', 'absence-tab', 'common.mocks', 'leave-absences.mocks', function (_$provide_) {
      $provide = _$provide_;
    }));

    beforeEach(inject(['api.contract.mock', 'HR_settings', function (_ContractAPIMock_, _HRSettingsMock_) {
      $provide.value('api.contract', _ContractAPIMock_);

      ContractAPIMock = _ContractAPIMock_;
      HRSettingsMock = _HRSettingsMock_;
    }]));

    beforeEach(inject(function (_$componentController_, _$log_, _$rootScope_, _Contract_) {
      $componentController = _$componentController_;
      $log = _$log_;
      $rootScope = _$rootScope_;

      spyOn($log, 'debug');
    }));

    describe('basic tests', function () {
      beforeEach(function () {
        compileComponent();
      });

      it('is initialized', function () {
        expect($log.debug).toHaveBeenCalled();
      });

      it('has a contact to load for', function () {
        expect(controller.contactId).toEqual(contactId);
      });

      it('has loaded contracts', function () {
        expect(controller.contracts).toEqual(jasmine.any(Array));
      });

      describe('contract', function () {
        var contract, mockedContract;

        beforeEach(function () {
          contract = controller.contracts[0];
          mockedContract = ContractAPIMock.mockedContracts()[0].info.details;
        });

        it('has position', function () {
          expect(contract.position).toEqual(mockedContract.position);
        });

        it('has start date', function () {
          expect(contract.start_date).toEqual(formatDate(mockedContract.period_start_date));
        });

        it('has end date', function () {
          expect(contract.end_date).toEqual(formatDate(mockedContract.period_end_date));
        });

        it('has absences', function () {
          expect(contract.absences).toEqual(jasmine.any(Array));
        });

        describe('absence', function () {
          var absence, mockedAbsence;

          beforeEach(function () {
            absence = contract.absences[0];
            mockedAbsence = ContractAPIMock.mockedContracts()[0].info.leave[0];
          });

          it('has amount', function () {
            expect(absence.amount).toEqual(mockedAbsence.leave_amount);
          });

          it('has the calculation unit name', function () {
            expect(absence.calculation_unit).toMatch(/days|hours/);
          });
        });
      });
    });

    describe('when there are no entitlements for the loaded absence types', function () {
      beforeEach(function () {
        // giving a fake ID ensures such an entitlement doesn't exist
        compileComponent([{ id: 'just-created-absence-type-' + Math.random() }]);
      });

      it('filters the absence type with non-existing entitlements', function () {
        expect(controller.absenceTypes.length).toBe(0);
      });
    });

    /**
     * Compiles the controller
     *
     * @param {Array} absenceTypes
     */
    function compileComponent (absenceTypes) {
      absenceTypes = absenceTypes ||
        absenceTypeMocked.getAllAndTheirCalculationUnits();
      controller = $componentController('contractEntitlements', null, {
        absenceTypes: absenceTypes,
        contactId: contactId
      });

      $rootScope.$digest();
    }

    /**
     * Formats the date according to user settings
     *
     * @param {object} date
     * @return {string}
     */
    function formatDate (date) {
      var dateFormat = HRSettingsMock.DATE_FORMAT.toUpperCase();

      return date ? moment(date).format(dateFormat) : '';
    }
  });
});
