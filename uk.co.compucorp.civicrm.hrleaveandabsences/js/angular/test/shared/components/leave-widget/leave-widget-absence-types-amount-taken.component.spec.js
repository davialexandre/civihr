/* eslint-env amd, jasmine */

define([
  'common/lodash',
  'common/moment',
  'leave-absences/mocks/helpers/controller-on-changes',
  'leave-absences/mocks/data/option-group.data',
  'leave-absences/mocks/apis/absence-period-api-mock',
  'leave-absences/mocks/apis/absence-type-api-mock',
  'leave-absences/mocks/apis/leave-request-api-mock',
  'leave-absences/mocks/apis/option-group-api-mock',
  'leave-absences/shared/components/leave-widget/leave-widget.component'
], function (_, moment, controllerOnChanges, OptionGroupData) {
  describe('leaveWidgetAbsenceTypesAmountTaken', function () {
    var $componentController, $provide, $rootScope, $scope, ctrl,
      absenceTypes, absencePeriod, LeaveRequest, leaveRequestStatuses;
    var childComponentName = 'leave-widget-absence-types-amount-taken';
    var contactId = 101;

    beforeEach(module('leave-absences.components.leave-widget',
      'leave-absences.mocks', function (_$provide_) {
        $provide = _$provide_;
      }));

    beforeEach(inject(function (AbsencePeriodAPIMock, AbsenceTypeAPIMock,
      LeaveRequestAPIMock, OptionGroupAPIMock) {
      $provide.value('AbsencePeriodAPI', AbsencePeriodAPIMock);
      $provide.value('AbsenceTypeAPI', AbsenceTypeAPIMock);
      $provide.value('LeaveRequestAPI', LeaveRequestAPIMock);
    }));

    beforeEach(inject(function (_$componentController_, _$rootScope_,
      AbsencePeriod, AbsenceType, _LeaveRequest_) {
      $componentController = _$componentController_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      LeaveRequest = _LeaveRequest_;
      leaveRequestStatuses = OptionGroupData
        .getCollection('hrleaveandabsences_leave_request_status');

      AbsencePeriod.all().then(function (periods) {
        absencePeriod = periods[0];
      });
      AbsenceType.all().then(function (_absenceTypes_) {
        absenceTypes = _absenceTypes_;
      });

      $rootScope.$digest();
      spyOn($scope, '$emit').and.callThrough();
      spyOn(LeaveRequest, 'all').and.callThrough();
    }));

    beforeEach(function () {
      ctrl = $componentController('leaveWidgetAbsenceTypesAmountTaken', {
        $scope: $scope
      });
      controllerOnChanges.setupController(ctrl);
    });

    it('should be defined', function () {
      expect(ctrl).toBeDefined();
    });

    describe('on init', function () {
      it('sets leave requests equal to an empty array', function () {
        expect(ctrl.leaveRequests).toEqual([]);
      });

      it('fires a leave widget child is loading event', function () {
        expect($scope.$emit).toHaveBeenCalledWith(
          'LeaveWidget::childIsLoading', childComponentName);
      });
    });

    describe('bindings and dependencies', function () {
      describe('when contact id and absence period are passed', function () {
        var absenceTypeIds, leaveRequestStatusIds;

        beforeEach(function () {
          absenceTypeIds = absenceTypes.map(function (absenceType) {
            return absenceType.id;
          });
          leaveRequestStatusIds = leaveRequestStatuses.map(function (status) {
            return status.value;
          });
          controllerOnChanges.mockChange('absenceTypes', absenceTypes);
          controllerOnChanges.mockChange('absencePeriod', absencePeriod);
          controllerOnChanges.mockChange('contactId', contactId);
          controllerOnChanges.mockChange('leaveRequestStatuses',
            leaveRequestStatuses);
          $rootScope.$digest();
        });

        it('gets leave requests of the specified absence types', function () {
          expect(LeaveRequest.all).toHaveBeenCalledWith({
            contact_id: contactId,
            from_date: { '>=': absencePeriod.start_date },
            to_date: { '<=': absencePeriod.end_date },
            status_id: { IN: leaveRequestStatusIds },
            type_id: { IN: absenceTypeIds }
          }, null, null, null, false);
        });

        describe('after loading dependencies', function () {
          var expectedAbsenceTypes = [];
          var leaveRequests = [];

          beforeEach(function () {
            LeaveRequest.all({
              contact_id: contactId,
              from_date: { '>=': absencePeriod.start_date },
              to_date: { '<=': absencePeriod.end_date },
              status_id: { IN: [1, 2, 3] },
              type_id: { IN: [1, 2, 3] }
            }, null, null, null, false)
              .then(function (response) {
                leaveRequests = response.list;

                mapAbsenceTypeBalances();
              });
            $rootScope.$digest();

            /**
             * Finds and stores the balance for each absence type.
             */
            function mapAbsenceTypeBalances () {
              expectedAbsenceTypes = absenceTypes.map(function (absenceType) {
                var balance = leaveRequests
                  .filter(function (request) {
                    return +request.type_id === +absenceType.id;
                  })
                  .reduce(function (balance, request) {
                    return balance + request.balance_change;
                  }, 0);

                return _.assign({ balance: Math.abs(balance) }, absenceType);
              });
            }
          });

          it('stores the leave requests', function () {
            expect(ctrl.leaveRequests).toEqual(leaveRequests);
          });

          it('maps the total balance for each absence type', function () {
            expect(ctrl.absenceTypes).toEqual(expectedAbsenceTypes);
          });

          it('fires a leave widget child is ready event', function () {
            expect($scope.$emit).toHaveBeenCalledWith(
              'LeaveWidget::childIsReady', childComponentName);
          });
        });
      });
    });
  });
});
