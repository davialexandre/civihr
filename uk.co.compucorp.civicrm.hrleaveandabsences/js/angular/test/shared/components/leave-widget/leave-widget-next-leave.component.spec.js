/* eslint-env amd, jasmine */

define([
  'common/lodash',
  'common/moment',
  'leave-absences/mocks/helpers/controller-on-changes',
  'leave-absences/mocks/data/absence-type.data',
  'leave-absences/mocks/data/option-group.data',
  'leave-absences/mocks/apis/leave-request-api-mock',
  'leave-absences/mocks/apis/option-group-api-mock',
  'leave-absences/shared/components/leave-widget/leave-widget.component'
], function (_, moment, controllerOnChanges, absenceTypesData, OptionGroupData) {
  describe('leaveWidgetNextLeave', function () {
    var $componentController, $provide, $q, $rootScope, $scope, absenceTypes,
      ctrl, LeaveRequest, leaveRequestStatuses, OptionGroup, sharedSettings;
    var childComponentName = 'leave-widget-next-leave';
    var contactId = 101;

    beforeEach(module('leave-absences.components.leave-widget',
      'leave-absences.mocks', function (_$provide_) {
        $provide = _$provide_;
      }));

    beforeEach(inject(function (LeaveRequestAPIMock, OptionGroupAPIMock) {
      $provide.value('LeaveRequestAPI', LeaveRequestAPIMock);
      $provide.value('OptionGroup', OptionGroupAPIMock);
    }));

    beforeEach(inject(['$componentController', '$q', '$rootScope', 'LeaveRequest', 'OptionGroup', 'shared-settings',
      function (_$componentController_, _$q_, _$rootScope_, _LeaveRequest_, _OptionGroup_, _sharedSettings_) {
        $componentController = _$componentController_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        absenceTypes = absenceTypesData.all().values;
        LeaveRequest = _LeaveRequest_;
        leaveRequestStatuses = OptionGroupData.getCollection(
          'hrleaveandabsences_leave_request_status');
        OptionGroup = _OptionGroup_;
        sharedSettings = _sharedSettings_;
        spyOn($scope, '$emit').and.callThrough();
        spyOn(OptionGroup, 'valuesOf').and.callThrough();
        spyOn(LeaveRequest, 'all').and.callThrough();
      }]));

    beforeEach(function () {
      ctrl = $componentController('leaveWidgetNextLeave', {
        $scope: $scope
      });
      controllerOnChanges.setupController(ctrl);
    });

    it('should be defined', function () {
      expect(ctrl).toBeDefined();
    });

    describe('on init', function () {
      it('sets balance deduction equal to 0', function () {
        expect(ctrl.balanceDeduction).toBe(0);
      });

      it('sets next leave request to NULL', function () {
        expect(ctrl.nextLeaveRequest).toBe(null);
      });

      it('sets request status equal to an empty object', function () {
        expect(ctrl.requestStatus).toEqual({});
      });

      it('fires a leave widget child is loading event', function () {
        expect($scope.$emit).toHaveBeenCalledWith(
          'LeaveWidget::childIsLoading', childComponentName);
      });
    });

    describe('when bindings are ready', function () {
      var leaveRequestAbsenceTypeIds, leaveRequestStatusIds;

      beforeEach(function () {
        leaveRequestAbsenceTypeIds = _.pluck(absenceTypes, 'id');
        leaveRequestStatusIds = _.pluck(leaveRequestStatuses, 'value');
        controllerOnChanges.mockChange('absenceTypes', absenceTypes);
        controllerOnChanges.mockChange('contactId', contactId);
        controllerOnChanges.mockChange('leaveRequestStatuses',
          leaveRequestStatuses);
        $rootScope.$digest();
      });

      it('gets the next leave request for the contact, in the absence period, with the specified statuses, and no cache', function () {
        expect(LeaveRequest.all).toHaveBeenCalledWith({
          contact_id: contactId,
          from_date: { '>=': moment().format(sharedSettings.serverDateFormat) },
          request_type: 'leave',
          status_id: { IN: leaveRequestStatusIds },
          type_id: { IN: leaveRequestAbsenceTypeIds },
          options: { limit: 1 }
        }, null, 'from_date ASC', null, false);
      });

      it('loads the leave request day types', function () {
        expect(OptionGroup.valuesOf).toHaveBeenCalledWith('hrleaveandabsences_leave_request_day_type');
      });

      describe('after loading dependencies', function () {
        var absenceType, expectedDayTypes, expectedNextLeave, expectedRequestStatus;

        beforeEach(function () {
          expectedDayTypes = _.indexBy(OptionGroupData.getCollection(
            'hrleaveandabsences_leave_request_day_type'), 'value');

          LeaveRequest.all({
            contact_id: contactId,
            from_date: { '>=': moment().format(sharedSettings.serverDateFormat) },
            request_type: 'leave',
            status_id: { IN: leaveRequestStatusIds },
            options: { limit: 1, sort: 'from_date DESC' }
          }, null, null, null, false)
            .then(function (response) {
              expectedNextLeave = response.list[0];
              absenceType = getAbsenceTypeForLeave(expectedNextLeave);
              expectedNextLeave['type_id.title'] = absenceType.title;
              expectedNextLeave['type_id.calculation_unit_name'] = absenceType.calculation_unit_name;
              expectedNextLeave.balance_change = Math.abs(expectedNextLeave.balance_change);
              expectedNextLeave.from_date = moment(expectedNextLeave.from_date);
              expectedNextLeave.to_date = moment(expectedNextLeave.to_date);
              expectedRequestStatus = getExpectedRequestStatus(expectedNextLeave);
            });
          $rootScope.$digest();
        });

        it('stores the leave request day types indexed by their value', function () {
          expect(ctrl.dayTypes).toEqual(expectedDayTypes);
        });

        it('stores the next leave request', function () {
          expect(ctrl.nextLeaveRequest).toEqual(expectedNextLeave);
        });

        it('stores the status for the request', function () {
          expect(ctrl.requestStatus).toEqual(expectedRequestStatus);
        });

        it('fires a leave widget child is ready event', function () {
          expect($scope.$emit).toHaveBeenCalledWith(
            'LeaveWidget::childIsReady', childComponentName);
        });

        describe('when there are no next leave requests', function () {
          beforeEach(function () {
            LeaveRequest.all.and.returnValue($q.resolve({
              list: []
            }));
            controllerOnChanges.mockChange('contactId', contactId);
            controllerOnChanges.mockChange('leaveRequestStatuses',
              leaveRequestStatuses);
            $rootScope.$digest();
          });

          it('sets the next leave request equal to NULL', function () {
            expect(ctrl.nextLeaveRequest).toBe(null);
          });
        });

        /**
         * Returns the status label and text color for the leave request
         * provided.
         *
         * @param {LeaveRequestInstance} LeaveRequest - the leave request
         * @return {Object}
         */
        function getExpectedRequestStatus (leaveRequest) {
          return _.find(OptionGroupData.getCollection('hrleaveandabsences_leave_request_status'),
            function (status) {
              return +status.value === +leaveRequest.status_id;
            });
        }
      });
    });

    /**
     * Returns the absence type related to the leave request.
     *
     * @param {LeaveRequestInstance} leaveRequest
     * @return {String}
     */
    function getAbsenceTypeForLeave (leaveRequest) {
      var absenceType = _.find(absenceTypes, function (type) {
        return +type.id === +leaveRequest.type_id;
      });

      return absenceType;
    }
  });
});
