/* eslint-env amd, jasmine */

define([
  'common/lodash',
  'common/mocks/data/contact.data',
  'leave-absences/mocks/data/absence-period.data',
  'leave-absences/mocks/data/absence-type.data',
  'leave-absences/mocks/data/leave-balance-report.data',
  'common/models/contact',
  'common/models/session.model',
  'common/mocks/services/api/contact-mock',
  'common/mocks/services/api/option-group-mock',
  'leave-absences/mocks/apis/absence-period-api-mock',
  'leave-absences/mocks/apis/absence-type-api-mock',
  'leave-absences/mocks/apis/entitlement-api-mock',
  'leave-absences/shared/models/absence-period.model',
  'leave-absences/shared/models/absence-type.model',
  'leave-absences/shared/models/entitlement.model',
  'leave-absences/shared/components/leave-balance-tab.component',
  'leave-absences/shared/config',
  'common/services/pub-sub'
], function (_, contactMockData, absencePeriodMock, absenceTypeMock, reportMockData) {
  describe('LeaveBalanceReport.component', function () {
    var $componentController, $provide, $q, $rootScope, $scope, AbsencePeriod,
      AbsenceType, Contact, ctrl, leaveBalanceReport, notificationService, pubSub,
      Session, sharedSettings;
    var loggedInContactId = 101;
    var filters = { any_filter: 'any value' };
    var userRole = 'admin';

    beforeEach(module('common.services', 'leave-absences.mocks', 'leave-absences.models',
      'leave-absences.components',
      function (_$provide_) {
        $provide = _$provide_;
      }
    ));

    beforeEach(inject(function (_AbsencePeriodAPIMock_, _AbsenceTypeAPIMock_, _EntitlementAPIMock_) {
      $provide.value('AbsencePeriodAPI', _AbsencePeriodAPIMock_);
      $provide.value('AbsenceTypeAPI', _AbsenceTypeAPIMock_);
      $provide.value('EntitlementAPI', _EntitlementAPIMock_);
      $provide.value('checkPermissions', function (permission) {
        var returnValue = false;

        if (userRole === 'admin') {
          returnValue = permission === sharedSettings.permissions.admin.administer;
        }
        if (userRole === 'manager') {
          returnValue = permission === sharedSettings.permissions.ssp.manage;
        }

        return $q.resolve(returnValue);
      });
    }));

    beforeEach(inject(['shared-settings', 'api.contact.mock', 'api.optionGroup.mock', function (_sharedSettings_, _ContactAPIMock_, _OptionGroupAPIMock_) {
      sharedSettings = _sharedSettings_;

      $provide.value('api.contact', _ContactAPIMock_);
      $provide.value('api.optionGroup', _OptionGroupAPIMock_);
    }]));

    beforeEach(inject(
      function (_$componentController_, _$q_, _$rootScope_, _AbsencePeriod_, _AbsenceType_,
        _Contact_, _LeaveBalanceReport_, _pubSub_, _Session_, _notificationService_) {
        $componentController = _$componentController_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        AbsencePeriod = _AbsencePeriod_;
        AbsenceType = _AbsenceType_;
        Contact = _Contact_;
        leaveBalanceReport = _LeaveBalanceReport_;
        notificationService = _notificationService_;
        pubSub = _pubSub_;
        Session = _Session_;

        spyOn(AbsencePeriod, 'all').and.callThrough();
        spyOn(AbsenceType, 'all').and.callThrough();
        spyOn(AbsenceType, 'loadCalculationUnits').and.callThrough();
        spyOn(Contact, 'all').and.callThrough();
        spyOn(leaveBalanceReport, 'all').and.callThrough();
        spyOn(notificationService, 'error');
        spyOn(Session, 'get').and.returnValue($q.resolve({ contactId: loggedInContactId }));
      }
    ));

    describe('on init', function () {
      beforeEach(function () {
        setupController();
      });

      it('sets absence periods to an empty array', function () {
        expect(ctrl.absencePeriods).toEqual([]);
      });

      it('sets absence types equal to an empty array', function () {
        expect(ctrl.absenceTypes).toEqual([]);
      });

      it('sets lookup contacts equal to an empty array', function () {
        expect(ctrl.lookupContacts).toEqual([]);
      });

      it('sets loading component to true', function () {
        expect(ctrl.loading.component).toBe(true);
      });

      it('sets loading report to true', function () {
        expect(ctrl.loading.report).toBe(true);
      });

      it('sets the logged in contact id to null', function () {
        expect(ctrl.loggedInContactId).toBe(null);
      });

      it('sets pagination page to 1', function () {
        expect(ctrl.pagination.page).toBe(1);
      });

      it('sets pagination size to 50', function () {
        expect(ctrl.pagination.size).toBe(50);
      });

      it('sets report to an empty array', function () {
        expect(ctrl.report).toEqual([]);
      });

      it('sets report count to 0', function () {
        expect(ctrl.reportCount).toBe(0);
      });

      describe('on user role load', function () {
        describe('when user is Admin', function () {
          beforeEach(function () {
            userRole = 'admin';

            setupController();
            $rootScope.$digest();
          });

          it('sets Admin role', function () {
            expect(ctrl.userRole).toBe('admin');
          });
        });

        describe('when user is Manager', function () {
          beforeEach(function () {
            userRole = 'manager';

            setupController();
            $rootScope.$digest();
          });

          it('sets Manager role', function () {
            expect(ctrl.userRole).toBe('manager');
          });
        });
      });

      describe('absence types', function () {
        beforeEach(function () {
          setupController();
          $rootScope.$digest();
        });

        it('loads the absence types', function () {
          expect(AbsenceType.all).toHaveBeenCalledWith();
        });

        it('populates calculation units to loaded absence types', function () {
          expect(AbsenceType.loadCalculationUnits).toHaveBeenCalled();
        });

        it('stores the absence types', function () {
          expect(ctrl.absenceTypes[0]).toEqual(
            jasmine.objectContaining(absenceTypeMock.all().values[0]));
        });
      });

      describe('absence periods', function () {
        beforeEach(function () {
          setupController();
          $rootScope.$digest();
        });

        it('loads the absence periods sorted by title', function () {
          expect(AbsencePeriod.all).toHaveBeenCalledWith({
            options: { sort: 'title ASC' }
          });
        });

        it('stores the absence periods', function () {
          expect(ctrl.absencePeriods.length).toEqual(absencePeriodMock.all().values.length);
        });
      });

      describe('contacts', function () {
        beforeEach(function () {
          setupController();
          $rootScope.$digest();
        });

        it('loads the contacts sorted by sort name', function () {
          expect(Contact.all).toHaveBeenCalledWith(null, null, 'sort_name ASC');
        });

        it('stores the absence periods', function () {
          expect(ctrl.lookupContacts.length).toEqual(contactMockData.all.values.length);
        });
      });

      describe('session', function () {
        beforeEach(function () {
          $rootScope.$digest();
        });

        it('sets loading report to true', function () {
          expect(ctrl.loading.report).toBe(true);
        });

        it('loads the session', function () {
          expect(Session.get).toHaveBeenCalled();
        });

        describe('when finishing loading the session', function () {
          beforeEach(function () { $rootScope.$digest(); });

          it('stores the currently logged in contact id', function () {
            expect(ctrl.loggedInContactId).toBe(loggedInContactId);
          });
        });
      });

      describe('when finished initializing', function () {
        beforeEach(function () { $rootScope.$digest(); });

        it('stops loading the component', function () {
          expect(ctrl.loading.component).toBe(false);
        });
      });
    });

    describe('on leave balance filters updated event', function () {
      beforeEach(function () {
        setupController();
        spyOn(ctrl, 'loadReportCurrentPage');

        ctrl.pagination.page = 202;

        $rootScope.$broadcast('LeaveBalanceFilters::update', filters);
      });

      it('loads the first page of the report', function () {
        expect(ctrl.loadReportCurrentPage).toHaveBeenCalled();
        expect(ctrl.pagination.page).toBe(1);
      });
    });

    describe('loadReportCurrentPage()', function () {
      beforeEach(function () {
        setupController();
        $rootScope.$digest();
        $rootScope.$broadcast('LeaveBalanceFilters::update', filters);
      });

      it('sets loading report to true', function () {
        expect(ctrl.loading.report).toBe(true);
      });

      it('loads the balance report for contacts, on selected absence period and type, on page 1, with a limited amount of records, without caching', function () {
        expect(leaveBalanceReport.all).toHaveBeenCalledWith(
          filters, ctrl.pagination, undefined, undefined, false);
      });

      describe('finishing loading the report page', function () {
        var reportCount, expectedReport;

        beforeEach(function () {
          var balanceReport = reportMockData.all().values;
          reportCount = reportMockData.all().count;

          // sets the balance report in an expected manner.
          // each record's .absence_types to be an index so it can be displayed
          // on the report in a specific order.
          expectedReport = _.values(balanceReport).map(function (record) {
            record = Object.assign({}, record);

            record.absence_types = _.indexBy(record.absence_types, function (type) {
              return type.id;
            });

            return record;
          });

          $rootScope.$digest();
        });

        it('sets loading report to false', function () {
          expect(ctrl.loading.report).toBe(false);
        });

        it('stores the the total number of records', function () {
          expect(ctrl.reportCount).toBe(reportCount);
        });

        it('stores the report', function () {
          expect(ctrl.report.length).toEqual(expectedReport.length);
        });

        it('indexes the leave balance absence types by id', function () {
          expect(ctrl.report).toEqual(expectedReport);
        });
      });

      describe('error loading the leave balance', function () {
        var error = {
          error_code: 'not-found',
          error_message: 'Not Found.',
          is_error: 1
        };

        beforeEach(function () {
          leaveBalanceReport.all.and.returnValue($q.reject(error));
          setupController();
          $rootScope.$digest();
          $rootScope.$broadcast('LeaveBalanceFilters::update', filters);
          $rootScope.$digest();
        });

        it('sets loading report to false', function () {
          expect(ctrl.loading.report).toBe(false);
        });

        it('throws an error notification', function () {
          expect(notificationService.error).toHaveBeenCalledWith('Error', error.error_message);
        });
      });
    });

    describe('when a new leave request is created', function () {
      beforeEach(function () {
        setupController();
        spyOn(ctrl, 'loadReportCurrentPage');
        $rootScope.$digest();
        pubSub.publish('LeaveRequest::new', jasmine.any(Object));
        $rootScope.$digest();
      });

      it('reloads the report', function () {
        expect(ctrl.loadReportCurrentPage).toHaveBeenCalled();
      });
    });

    /**
     * Setups the leaveBalanceTab controller for testing purposes.
     */
    function setupController () {
      $scope = $rootScope.$new();

      ctrl = $componentController('leaveBalanceTab', { $scope: $scope });
    }
  });
});
