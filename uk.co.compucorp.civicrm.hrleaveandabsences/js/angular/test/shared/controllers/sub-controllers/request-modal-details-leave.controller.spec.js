/* eslint-env amd, jasmine */

define([
  'common/angular',
  'common/lodash',
  'common/moment',
  'leave-absences/mocks/data/absence-period.data',
  'leave-absences/mocks/data/absence-type.data',
  'leave-absences/mocks/data/leave-request.data',
  'leave-absences/mocks/helpers/helper',
  'leave-absences/mocks/helpers/request-modal-helper',
  'common/mocks/services/hr-settings-mock',
  'leave-absences/mocks/apis/absence-type-api-mock',
  'leave-absences/mocks/apis/leave-request-api-mock',
  'leave-absences/mocks/apis/option-group-api-mock',
  'leave-absences/mocks/apis/public-holiday-api-mock',
  'leave-absences/mocks/apis/work-pattern-api-mock',
  'leave-absences/manager-leave/app'
], function (angular, _, moment, absencePeriodData, absenceTypeData, leaveRequestData, helper, requestModalHelper) {
  'use strict';

  describe('RequestModalDetailsLeaveController', function () {
    var $componentController, $provide, $log, $rootScope, controller, leaveRequest,
      LeaveRequestInstance, selectedAbsenceType;

    var date2016 = '01/12/2016';
    var date2016InServerFormat = moment(helper.getUTCDate(date2016)).format('YYYY-MM-D'); // Must match the date of `date2016`

    beforeEach(module('common.mocks', 'leave-absences.templates', 'leave-absences.mocks', 'manager-leave', function (_$provide_) {
      $provide = _$provide_;
    }));

    beforeEach(inject(function (_PublicHolidayAPIMock_, _WorkPatternAPIMock_, _OptionGroupAPIMock_, _LeaveRequestAPIMock_) {
      $provide.value('PublicHolidayAPI', _PublicHolidayAPIMock_);
      $provide.value('WorkPatternAPI', _WorkPatternAPIMock_);
      $provide.value('LeaveRequestAPI', _LeaveRequestAPIMock_);
      $provide.value('api.optionGroup', _OptionGroupAPIMock_);
    }));

    beforeEach(inject(['HR_settingsMock', function (_HRSettingsMock_) {
      $provide.value('HR_settings', _HRSettingsMock_);
    }]));

    beforeEach(inject(function (
      _$componentController_, _$log_, _$rootScope_, _LeaveRequestInstance_) {
      $componentController = _$componentController_;
      $log = _$log_;
      $rootScope = _$rootScope_;
      LeaveRequestInstance = _LeaveRequestInstance_;

      spyOn($log, 'debug');
    }));

    describe('on initialize', function () {
      beforeEach(function () {
        selectedAbsenceType = _.assign(absenceTypeData.all().values[0], {
          remainder: 0
        });
        leaveRequest = LeaveRequestInstance.init();

        compileComponent({
          request: leaveRequest,
          selectedAbsenceType: selectedAbsenceType
        });

        $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
        $rootScope.$digest();
      });

      it('is initialized', function () {
        expect($log.debug).toHaveBeenCalled();
      });

      it('has leave type as "leave"', function () {
        expect(controller.isLeaveType('leave')).toBeTruthy();
      });
    });

    describe('calculateBalanceChange()', function () {
      var returnValue;
      var expectedReturnValue = 'somevalue';

      beforeEach(function () {
        controller.request.calculateBalanceChange = jasmine.createSpy();
        controller.request.calculateBalanceChange.and.returnValue(expectedReturnValue);

        returnValue = controller.calculateBalanceChange();
      });

      it('calculates balance change', function () {
        expect(controller.request.calculateBalanceChange)
          .toHaveBeenCalledWith(controller.selectedAbsenceType.calculation_unit_name);
      });

      it('returns the promise returned by balance change function', function () {
        expect(returnValue).toBe(expectedReturnValue);
      });
    });

    describe('canCalculateChange()', function () {
      beforeEach(function () {
        leaveRequest = LeaveRequestInstance.init();

        compileComponent({
          request: leaveRequest,
          selectedAbsenceType: selectedAbsenceType
        });
      });

      describe('when unit is in days', function () {
        beforeEach(function () {
          controller.selectedAbsenceType.calculation_unit_name = 'days';
        });

        describe('when there is no from date', function () {
          beforeEach(function () {
            controller.request.from_date = false;
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when there is no to date', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = false;
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when there is no from date type', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = '03/10/2017';
            controller.request.from_date_type = false;
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when there is no to date type', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = '03/10/2017';
            controller.request.from_date_type = 'half_day_am';
            controller.request.to_date_type = false;
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when from date, from date type, to date, to date type, all are set', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = '03/10/2017';
            controller.request.from_date_type = 'half_day_am';
            controller.request.to_date_type = 'half_day_am';
          });

          it('change can be calculated', function () {
            expect(controller.canCalculateChange()).toBe(true);
          });
        });
      });

      describe('when unit is in hours', function () {
        beforeEach(function () {
          controller.selectedAbsenceType.calculation_unit_name = 'hours';
        });

        afterEach(function () {
          controller.selectedAbsenceType.calculation_unit_name = 'days';
        });

        describe('when there is no from date', function () {
          beforeEach(function () {
            controller.request.from_date = false;
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when there is no to date', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = false;
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when from date amount is not a number', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = '03/10/2017';
            controller.request.from_date_amount = 'not a number';
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when to date amount is not a number', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = '03/10/2017';
            controller.request.from_date_amount = 1;
            controller.request.to_date_amount = 'not a number';
          });

          it('change cannot be calculated', function () {
            expect(controller.canCalculateChange()).toBe(false);
          });
        });

        describe('when from date and to date is present, and from and to date amount are numbers ', function () {
          beforeEach(function () {
            controller.request.from_date = '03/10/2017';
            controller.request.to_date = '03/10/2017';
            controller.request.from_date_amount = 1;
            controller.request.to_date_amount = 1;
          });

          it('change can be calculated', function () {
            expect(controller.canCalculateChange()).toBe(true);
          });
        });
      });
    });

    describe('can submit', function () {
      describe('when the leave request has all the details parameters defined', function () {
        beforeEach(function () {
          var leaveRequest = LeaveRequestInstance.init({
            from_date: date2016InServerFormat,
            to_date: date2016InServerFormat,
            from_date_type: 1,
            to_date_type: 1,
            from_date_amount: 1,
            to_date_amount: 1
          });

          compileComponent({
            mode: 'edit',
            request: leaveRequest
          });
        });

        it('allows the request to be submitted', function () {
          expect(controller.canSubmit()).toBe(true);
        });
      });

      describe('when the leave request does not have all details parameters defined', function () {
        beforeEach(function () {
          var leaveRequest = LeaveRequestInstance.init({
            from_date: date2016InServerFormat,
            to_date: date2016InServerFormat
          });

          compileComponent({
            mode: 'edit',
            request: leaveRequest
          });
        });

        it('does not allow the request to be submitted', function () {
          expect(controller.canSubmit()).toBe(false);
        });
      });
    });

    /**
     * Compiles and initializes the component's controller. It returns the
     * parameters used to initialize the controller plus default parameter
     * values.
     *
     * @param {Object} params - the values to initialize the component. Defaults
     * to an empty object.
     *
     * @return {Object}
     */
    function compileComponent (params) {
      params = params || {};

      requestModalHelper.addDefaultComponentParams(params);

      controller = $componentController(
        'leaveRequestPopupDetailsTab',
        null,
        params
      );

      $rootScope.$digest();

      return params;
    }
  });
});
