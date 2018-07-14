/* eslint-env amd, jasmine */

define([
  'common/angular',
  'common/lodash',
  'common/moment',
  'leave-absences/mocks/data/absence-period.data',
  'leave-absences/mocks/data/absence-type.data',
  'leave-absences/mocks/data/leave-request.data',
  'leave-absences/mocks/data/option-group.data',
  'leave-absences/mocks/helpers/helper',
  'leave-absences/mocks/helpers/request-modal-helper',
  'common/mocks/services/hr-settings-mock',
  'leave-absences/mocks/apis/absence-type-api-mock',
  'leave-absences/mocks/apis/leave-request-api-mock',
  'leave-absences/mocks/apis/option-group-api-mock',
  'leave-absences/mocks/apis/public-holiday-api-mock',
  'leave-absences/mocks/apis/work-pattern-api-mock',
  'leave-absences/manager-leave/app'
], function (angular, _, moment, absencePeriodData, absenceTypeData, leaveRequestData, optionGroupMock, helper, requestModalHelper) {
  'use strict';

  describe('RequestModalDetailsToilController', function () {
    var $componentController, $provide, $q, $log, $rootScope, controller, leaveRequest,
      AbsenceType, AbsenceTypeAPI, LeaveRequestInstance, TOILRequestInstance;

    var date2016 = '01/12/2016';
    var date2016To = '02/12/2016'; // Must be greater than `date2016`
    var date2017 = '01/02/2017';

    beforeEach(module('common.mocks', 'leave-absences.templates', 'leave-absences.mocks', 'manager-leave', function (_$provide_) {
      $provide = _$provide_;
    }));

    beforeEach(inject(function (_AbsenceTypeAPIMock_, _WorkPatternAPIMock_, _PublicHolidayAPIMock_, _LeaveRequestAPIMock_, _OptionGroupAPIMock_) {
      $provide.value('AbsenceTypeAPI', _AbsenceTypeAPIMock_);
      $provide.value('WorkPatternAPI', _WorkPatternAPIMock_);
      $provide.value('PublicHolidayAPI', _PublicHolidayAPIMock_);
      $provide.value('LeaveRequestAPI', _LeaveRequestAPIMock_);
      $provide.value('api.optionGroup', _OptionGroupAPIMock_);
    }));

    beforeEach(inject(['HR_settingsMock', function (_HRSettingsMock_) {
      $provide.value('HR_settings', _HRSettingsMock_);
    }]));

    beforeEach(inject(function (
      _$componentController_, _$q_, _$log_, _$rootScope_, _AbsenceType_, _AbsenceTypeAPI_,
      _LeaveRequestInstance_, _TOILRequestInstance_) {
      $componentController = _$componentController_;
      $log = _$log_;
      $q = _$q_;
      $rootScope = _$rootScope_;
      AbsenceType = _AbsenceType_;
      AbsenceTypeAPI = _AbsenceTypeAPI_;
      LeaveRequestInstance = _LeaveRequestInstance_;
      TOILRequestInstance = _TOILRequestInstance_;

      spyOn($log, 'debug');
      spyOn(AbsenceTypeAPI, 'calculateToilExpiryDate').and.callThrough();
      spyOn(AbsenceType, 'canExpire').and.callThrough();
      spyOn(AbsenceType, 'calculateToilExpiryDate').and.callThrough();
    }));

    describe('on initialize', function () {
      beforeEach(function () {
        leaveRequest = TOILRequestInstance.init();

        var params = compileComponent({
          leaveType: 'toil',
          request: leaveRequest
        });

        $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
        $rootScope.$digest();

        controller.request.type_id = params.selectedAbsenceType.id;
      });

      it('is initialized', function () {
        expect($log.debug).toHaveBeenCalled();
      });

      it('has leave type as "toil"', function () {
        expect(controller.isLeaveType('toil')).toBeTruthy();
      });

      it('loads toil amounts', function () {
        expect(Object.keys(controller.toilAmounts).length).toBeGreaterThan(0);
      });

      it('defaults to a multiple day selection', function () {
        expect(controller.uiOptions.multipleDays).toBe(true);
      });

      describe('when multiple/single days mode changes', function () {
        describe('when the balance can but fails to be calculated', function () {
          beforeEach(function () {
            // This ensures the balance can be calculated
            controller.request.toil_to_accrue = 1;
            // While this ensures it fails to be calculated for some reason
            spyOn(controller, 'calculateBalanceChange').and.returnValue($q.reject());
            spyOn(controller, 'setDaysSelectionModeExtended').and.callThrough();
            controller.daysSelectionModeChangeHandler();
            $rootScope.$digest();
          });

          it('still performs the actions extended for TOIL', function () {
            expect(controller.setDaysSelectionModeExtended).toHaveBeenCalled();
          });
        });
      });

      describe('onDateChangeExtended()', function () {
        var promiseIsResolved = false;

        beforeEach(function () {
          // Resetting dates will make calculateToilExpiryDate() to reject
          controller.request.from_date = null;
          controller.request.to_date = null;
          controller.onDateChangeExtended().then(function () {
            promiseIsResolved = true;
          });
          $rootScope.$digest();
        });

        it('resolves disregarding of the result of calculateToilExpiryDate()', function () {
          expect(promiseIsResolved).toBeTruthy();
        });
      });

      describe('create', function () {
        describe('with selected duration and dates', function () {
          describe('when multiple days request', function () {
            beforeEach(function () {
              var toilAccrue = optionGroupMock.specificObject('hrleaveandabsences_toil_amounts', 'name', 'quarter_day');

              requestModalHelper.setTestDates(controller, date2016, date2016To);
              controller.request.toilDurationHours = 1;
              controller.request.updateDuration();
              controller.request.toil_to_accrue = toilAccrue.value;

              $rootScope.$apply();
            });

            it('sets expiry date', function () {
              expect(controller.expiryDate).toEqual(absenceTypeData.calculateToilExpiryDate().values.toil_expiry_date);
            });

            it('calls calculateToilExpiryDate on AbsenceType', function () {
              expect(AbsenceTypeAPI.calculateToilExpiryDate.calls.mostRecent().args[0]).toEqual(controller.request.type_id);
              expect(AbsenceTypeAPI.calculateToilExpiryDate.calls.mostRecent().args[1]).toEqual(controller.request.to_date);
            });

            describe('when user changes number of days selected', function () {
              beforeEach(function () {
                controller.daysSelectionModeChangeHandler();
              });

              it('does not reset toil attributes', function () {
                expect(controller.request.toilDurationHours).not.toEqual('0');
                expect(controller.request.toilDurationMinutes).toEqual('0');
                expect(controller.request.toil_to_accrue).not.toEqual('');
              });
            });
          });

          describe('when single days request', function () {
            beforeEach(function () {
              controller.uiOptions.multipleDays = false;
              requestModalHelper.setTestDates(controller, date2016);
            });

            it('calls calculateToilExpiryDate on AbsenceType', function () {
              expect(AbsenceTypeAPI.calculateToilExpiryDate.calls.mostRecent().args[1]).toEqual(controller.request.from_date);
            });
          });
        });
      });

      describe('edit', function () {
        var toilRequest, absenceType;

        beforeEach(function () {
          toilRequest = TOILRequestInstance.init(leaveRequestData.findBy('request_type', 'toil'));
          toilRequest.contact_id = CRM.vars.leaveAndAbsences.contactId.toString();

          compileComponent({
            leaveType: 'toil',
            mode: 'edit',
            request: toilRequest
          });
          spyOn(controller, 'performBalanceChangeCalculation').and.callThrough();

          $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
          $rootScope.$digest();

          absenceType = _.find(controller.absenceTypes, function (absenceType) {
            return absenceType.id === controller.request.type_id;
          });
        });

        it('does not calculate balance yet', function () {
          expect(controller.performBalanceChangeCalculation).not.toHaveBeenCalled();
        });

        it('sets balance', function () {
          expect(controller.balance.opening).not.toBeLessThan(0);
        });

        it('sets absence types', function () {
          expect(absenceType.id).toEqual(toilRequest.type_id);
        });

        it('shows balance', function () {
          expect(controller.uiOptions.showBalance).toBeTruthy();
        });
      });
    });

    describe('respond', function () {
      describe('by manager', function () {
        var expiryDate, originalToilToAccrue, toilRequest;

        beforeEach(function () {
          expiryDate = '2017-12-31';
          toilRequest = TOILRequestInstance.init();
          toilRequest.contact_id = CRM.vars.leaveAndAbsences.contactId.toString();
          toilRequest.toil_expiry_date = expiryDate;

          var params = compileComponent({
            leaveType: 'toil',
            request: toilRequest,
            role: 'manager'
          });

          $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
          $rootScope.$digest();
          controller.request.type_id = params.selectedAbsenceType.id;
          requestModalHelper.setTestDates(controller, date2016, date2016To);
          $rootScope.$digest();

          expiryDate = new Date(controller.request.toil_expiry_date);
          originalToilToAccrue = optionGroupMock.specificObject('hrleaveandabsences_toil_amounts', 'name', 'quarter_day');
          controller.request.toil_to_accrue = originalToilToAccrue.value;
        });

        it('sets the expiry date on the UI', function () {
          expect(controller.uiOptions.expiryDate).toEqual(expiryDate);
        });

        describe('and changes the expiry date', function () {
          var oldExpiryDate, newExpiryDate;

          beforeEach(function () {
            oldExpiryDate = controller.request.toil_expiry_date;
            controller.uiOptions.expiryDate = new Date();
            newExpiryDate = controller.convertDateToServerFormat(controller.uiOptions.expiryDate);
            controller.updateExpiryDate();
          });

          it('sets new expiry date', function () {
            expect(controller.request.toil_expiry_date).toEqual(newExpiryDate);
          });

          describe('and staff edits open request', function () {
            beforeEach(function () {
              compileComponent({
                leaveType: 'toil',
                mode: 'edit',
                request: controller.request
              });

              $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
              $rootScope.$digest();

              controller.uiOptions.expiryDate = oldExpiryDate;

              controller.updateExpiryDate();
            });

            it('has role as "staff"', function () {
              expect(controller.isRole('staff')).toBeTruthy();
            });

            it('has expired date set by manager', function () {
              expect(controller.request.toil_expiry_date).toEqual(oldExpiryDate);
            });

            it('has toil amount set by manager', function () {
              expect(controller.request.toil_to_accrue).toEqual(originalToilToAccrue.value);
            });
          });

          describe('clears expiry date', function () {
            beforeEach(function () {
              controller.clearExpiryDate();
            });

            it('resets expiry date in both UI and request', function () {
              expect(controller.request.toil_expiry_date).toBeFalsy();
              expect(controller.uiOptions.expiryDate).toBeFalsy();
            });
          });
        });
      });
    });

    describe('when TOIL Requests do not expire', function () {
      var toilRequest;

      beforeEach(function () {
        toilRequest = TOILRequestInstance.init(
          leaveRequestData.findBy('request_type', 'toil'));

        delete toilRequest.toil_expiry_date;

        AbsenceType.canExpire.and.returnValue($q.resolve(false));
        compileComponent({
          leaveType: 'toil',
          request: toilRequest
        });
        $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
        $rootScope.$digest();
      });

      describe('when request date changes', function () {
        beforeEach(function () {
          controller.request.to_date = new Date();
          controller.onDateChangeExtended();
          $rootScope.$digest();
        });

        it('does not calculate the expiry date field', function () {
          expect(AbsenceType.calculateToilExpiryDate).not.toHaveBeenCalled();
        });

        it('does not update the expiry date', function () {
          expect(controller.request.toil_expiry_date).toBeFalsy();
        });
      });

      describe('when the request had a previous expiry date', function () {
        beforeEach(function () {
          controller.request.toil_expiry_date = date2017;

          compileComponent({
            mode: 'edit',
            leaveType: 'toil',
            request: controller.request
          });
        });

        it('doesn not remove the expiry date', function () {
          expect(controller.request.toil_expiry_date).not.toBeFalsy();
        });
      });

      describe('when TOIL Requests expire and the request did not have a previous expiration date set', function () {
        var toilRequest;

        beforeEach(function () {
          toilRequest = TOILRequestInstance.init(
            leaveRequestData.findBy('request_type', 'toil'));

          delete toilRequest.toil_expiry_date;

          AbsenceType.canExpire.and.returnValue($q.resolve(true));
        });

        describe('when request date changes for manager', function () {
          beforeEach(function () {
            compileComponent({
              mode: 'edit',
              leaveType: 'toil',
              role: 'manager',
              request: toilRequest
            });
            controller.request.to_date = date2017;
            controller.onDateChangeExtended();
            $rootScope.$digest();
          });

          it('updates the toil expiry date', function () {
            expect(controller.request.toil_expiry_date).toBeDefined();
          });
        });

        describe('when request date changes for staff', function () {
          beforeEach(function () {
            compileComponent({
              mode: 'edit',
              leaveType: 'toil',
              role: 'staff',
              request: toilRequest
            });
            controller.request.to_date = date2017;
            controller.onDateChangeExtended();
            $rootScope.$digest();
          });

          it('does not update the toil expiry date', function () {
            // staff can't change the expiry date of toil requests
            expect(controller.request.toil_expiry_date).toBeUndefined();
          });
        });
      });
    });

    describe('displaying the expiry date field', function () {
      var toilRequest;

      beforeEach(function () {
        toilRequest = TOILRequestInstance.init(
          leaveRequestData.findBy('request_type', 'toil'));
      });

      describe('when the request is new', function () {
        describe('when toil requests are set to expire', function () {
          beforeEach(function () {
            AbsenceType.canExpire.and.returnValue($q.resolve(true));
            compileComponent({
              mode: 'create',
              leaveType: 'toil',
              request: toilRequest
            });
          });

          it('displays the expiry date field', function () {
            expect(controller.canDisplayToilExpirationField).toBe(true);
          });
        });

        describe('when toil requests are not set to expire', function () {
          beforeEach(function () {
            AbsenceType.canExpire.and.returnValue($q.resolve(false));
            compileComponent({
              mode: 'create',
              leaveType: 'toil',
              request: toilRequest
            });
          });

          it('does not displays the expiry date field', function () {
            expect(controller.canDisplayToilExpirationField).toBe(false);
          });
        });
      });

      describe('when the request is old', function () {
        describe('when toil requests are set to expire and previous expiry date was not set', function () {
          beforeEach(function () {
            AbsenceType.canExpire.and.returnValue($q.resolve(true));
            delete toilRequest.toil_expiry_date;
            compileComponent({
              mode: 'edit',
              leaveType: 'toil',
              request: toilRequest
            });
          });

          it('does not displays the expiry date field', function () {
            expect(controller.canDisplayToilExpirationField).toBe(false);
          });
        });

        describe('when toil requests are not set to expire and previous expiry date was set', function () {
          beforeEach(function () {
            AbsenceType.canExpire.and.returnValue($q.resolve(false));
            toilRequest.toil_expiry_date = date2017;
            compileComponent({
              mode: 'edit',
              leaveType: 'toil',
              request: toilRequest
            });
          });

          it('displays the expiry date field', function () {
            expect(controller.canDisplayToilExpirationField).toBe(true);
          });
        });
      });

      describe('when request type is not toil', function () {
        beforeEach(function () {
          compileComponent({
            leaveType: 'leave',
            request: LeaveRequestInstance.init({})
          });
        });

        it('does not displays the expiry date field', function () {
          expect(controller.canDisplayToilExpirationField).toBeFalsy();
        });
      });

      describe('when the user can manage the leave request', function () {
        beforeEach(function () {
          AbsenceType.canExpire.and.returnValue($q.resolve(false));
          compileComponent({
            role: 'manager',
            leaveType: 'toil',
            request: toilRequest
          });
        });

        it('displays the expiry date field even if toil requests do not expire', function () {
          expect(controller.canDisplayToilExpirationField).toBe(true);
        });
      });
    });

    describe('can submit', function () {
      var toilRequest;

      beforeEach(function () {
        toilRequest = TOILRequestInstance.init();

        compileComponent({
          leaveType: 'toil',
          request: toilRequest,
          role: 'manager'
        });
      });

      describe('when toil request params are defined', function () {
        beforeEach(function () {
          toilRequest.from_date = date2016;
          toilRequest.to_date = date2016To;
          toilRequest.toil_duration = 10;
          toilRequest.toil_to_accrue = 1;
        });

        it('allows the request to be submitted', function () {
          expect(controller.canSubmit()).toBe(true);
        });
      });

      describe('when toil request params are not defined', function () {
        it('does not allow the request to be submitted', function () {
          expect(controller.canSubmit()).toBe(false);
        });
      });
    });

    describe('calculateBalanceChange()', function () {
      beforeEach(function () {
        controller.request.toil_to_accrue = '1';

        compileComponent({
          leaveType: 'toil',
          request: controller.request
        });

        $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
        $rootScope.$digest();

        controller.calculateBalanceChange();
      });

      it('sets balance change amount to the toil to accrue', function () {
        expect(controller.balance.change.amount).toBe(+controller.request.toil_to_accrue);
      });
    });

    describe('canCalculateChange()', function () {
      beforeEach(function () {
        compileComponent({
          leaveType: 'toil',
          request: controller.request
        });

        controller.request.toil_to_accrue = '1';

        $rootScope.$broadcast('LeaveRequestPopup::ContactSelectionComplete');
        $rootScope.$digest();
      });

      it('returns true if toil to accrue has a value', function () {
        expect(controller.canCalculateChange()).toBe(!!controller.request.toil_to_accrue);
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
