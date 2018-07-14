/* eslint-env amd, jasmine */

(function (CRM) {
  define([
    'common/angular',
    'common/lodash',
    'common/moment',
    'leave-absences/mocks/helpers/helper',
    'leave-absences/mocks/data/absence-period.data',
    'leave-absences/mocks/data/absence-type.data',
    'leave-absences/mocks/data/entitlement.data',
    'leave-absences/mocks/data/leave-request.data',
    'leave-absences/mocks/data/option-group.data',
    'common/angularMocks',
    'common/mocks/services/hr-settings-mock',
    'common/services/pub-sub',
    'leave-absences/mocks/apis/absence-period-api-mock',
    'leave-absences/mocks/apis/absence-type-api-mock',
    'leave-absences/mocks/apis/entitlement-api-mock',
    'leave-absences/mocks/apis/leave-request-api-mock',
    'leave-absences/my-leave/app'
  ], function (angular, _, moment, helper, absencePeriodData, absenceTypeData, entitlementMock, leaveRequestMock, optionGroupMock) {
    'use strict';

    describe('staffLeaveReport', function () {
      var contactId = CRM.vars.leaveAndAbsences.contactId;
      var isUserAdmin = false;
      var requestSortParam = 'from_date ASC';
      var absenceTypesIDs = absenceTypeData.all().values.map(function (absenceType) {
        return absenceType.id
      });

      var $componentController, $q, $log, $provide, $rootScope, controller;
      var AbsencePeriod, AbsenceType, Entitlement, LeaveRequest,
        LeaveRequestInstance, OptionGroup, pubSub, HRSettings, sharedSettings;

      beforeEach(module('common.services', 'leave-absences.templates',
        'my-leave', 'leave-absences.mocks', 'leave-absences.settings',
        function (_$provide_) {
          $provide = _$provide_;
        }));

      beforeEach(inject(function (_$componentController_, _$q_, _$log_, _$rootScope_) {
        $componentController = _$componentController_;
        $q = _$q_;
        $log = _$log_;
        $rootScope = _$rootScope_;

        spyOn($log, 'debug');
      }));

      beforeEach(inject(function (AbsencePeriodAPIMock, AbsenceTypeAPIMock,
        EntitlementAPIMock, LeaveRequestAPIMock) {
        $provide.value('AbsencePeriodAPI', AbsencePeriodAPIMock);
        $provide.value('AbsenceTypeAPI', AbsenceTypeAPIMock);
        $provide.value('EntitlementAPI', EntitlementAPIMock);
        $provide.value('LeaveRequestAPI', LeaveRequestAPIMock);
        $provide.value('checkPermissions', function () { return $q.resolve(isUserAdmin); });
      }));

      beforeEach(inject(['shared-settings', 'HR_settingsMock', 'api.optionGroup.mock',
        function (_sharedSettings_, HRSettingsMock, _OptionGroupAPIMock_) {
          sharedSettings = _sharedSettings_;

          $provide.value('HR_settings', HRSettingsMock);
          $provide.value('api.optionGroup', _OptionGroupAPIMock_);
          HRSettings = HRSettingsMock;
        }]
      ));

      beforeEach(inject(function ($componentController, _AbsencePeriod_, _AbsenceType_,
        _Entitlement_, _LeaveRequest_, _LeaveRequestInstance_, _OptionGroup_, _pubSub_) {
        AbsencePeriod = _AbsencePeriod_;
        AbsenceType = _AbsenceType_;
        Entitlement = _Entitlement_;
        LeaveRequest = _LeaveRequest_;
        LeaveRequestInstance = _LeaveRequestInstance_;
        OptionGroup = _OptionGroup_;
        pubSub = _pubSub_;

        spyOn(AbsencePeriod, 'all').and.callThrough();
        spyOn(AbsenceType, 'all').and.callThrough();
        spyOn(AbsenceType, 'loadCalculationUnits').and.callThrough();
        spyOn(Entitlement, 'all').and.callThrough();
        spyOn(Entitlement, 'breakdown').and.callThrough();
        spyOn(LeaveRequest, 'all').and.callThrough();
        spyOn(LeaveRequest, 'balanceChangeByAbsenceType').and.callThrough();
        spyOn(OptionGroup, 'valuesOf').and.callFake(function () {
          return $q.resolve(optionGroupMock.getCollection('hrleaveandabsences_leave_request_status'));
        });
      }));

      beforeEach(function () {
        compileComponent();
      });

      describe('initialization', function () {
        it('is initialized', function () {
          expect($log.debug).toHaveBeenCalled();
        });

        it('holds the date format', function () {
          expect(controller.dateFormat).toBeDefined();
          expect(controller.dateFormat).toBe(HRSettings.DATE_FORMAT);
        });

        it('has all the sections collapsed', function () {
          expect(Object.values(controller.sections).every(function (section) {
            return section.open === false;
          })).toBe(true);
        });

        describe('data loading', function () {
          xdescribe('before data is loaded', function () {
            // TODO: check why it doesn't work
            it('is in loading mode', function () {
              expect(controller.loading.page).toBe(true);
              expect(controller.loading.content).toBe(false);
            });
          });

          describe('after data is loaded', function () {
            it('is out of loading mode', function () {
              expect(controller.loading.page).toBe(false);
              expect(controller.loading.content).toBe(false);
            });

            it('has fetched the leave request statuses', function () {
              expect(OptionGroup.valuesOf).toHaveBeenCalledWith('hrleaveandabsences_leave_request_status');
              expect(controller.leaveRequestStatuses.length).not.toBe(0);
            });

            it('has fetched the absence types', function () {
              expect(AbsenceType.all).toHaveBeenCalledWith();
              expect(AbsenceType.loadCalculationUnits).toHaveBeenCalled();
              expect(controller.absenceTypes.length).not.toBe(0);
            });

            it('has indexed absence types', function () {
              expect(controller.absenceTypesIndexed[controller.absenceTypes[0].id])
                .toEqual(controller.absenceTypes[0]);
            });

            describe('absence periods', function () {
              it('has fetched the absence periods', function () {
                expect(AbsencePeriod.all).toHaveBeenCalled();
                expect(controller.absencePeriods.length).not.toBe(0);
              });

              it('sorts absence periods by start_date', function () {
                var extractStartDate = function (period) {
                  return period.start_date;
                };
                var absencePeriodSortedByDate = _.sortBy(absencePeriodData.all().values, 'start_date').map(extractStartDate);

                expect(controller.absencePeriods.map(extractStartDate)).toEqual(absencePeriodSortedByDate);
              });
            });

            it('has automatically selected the period, choosing the current one', function () {
              expect(controller.selectedPeriod).not.toBe(null);
              expect(controller.selectedPeriod).toBe(_.find(controller.absencePeriods, function (period) {
                return period.current === true;
              }));
            });

            describe('entitlements', function () {
              it('has fetched all the entitlements', function () {
                expect(Entitlement.all).toHaveBeenCalled();
                expect(controller.entitlements.length).not.toBe(0);
              });

              it('has fetched the entitlements for the current contact and selected period', function () {
                expect(Entitlement.all.calls.argsFor(0)[0]).toEqual({
                  contact_id: contactId,
                  period_id: controller.selectedPeriod.id
                });
              });

              it('has fetched current and future remainder of the entitlements', function () {
                expect(Entitlement.all.calls.argsFor(0)[1]).toEqual(true);
              });

              it('has stored the entitlement, remainder in each absence type which has entitlement', function () {
                _.forEach(controller.absenceTypes, function (absenceType) {
                  var entitlement = _.find(controller.entitlements, function (entitlement) {
                    return entitlement.type_id === absenceType.id;
                  });

                  if (entitlement) {
                    expect(absenceType.entitlement).toEqual(entitlement['value']);
                    expect(absenceType.remainder).toEqual(entitlement['remainder']);
                  }
                });
              });

              it('display only the absence types which has entitlement or allows negative balance or allows accrual requests', function () {
                _.forEach(controller.absenceTypesFiltered, function (absenceType) {
                  expect((absenceType.entitlement === 0) && (absenceType.allow_overuse === '0') &&
                    (absenceType.allow_accruals_request === '0')).toBe(false);
                });
              });

              it('has stored the 0 value for entitlement, remainder for absence types which does not have entitlement', function () {
                _.forEach(controller.absenceTypes, function (absenceType) {
                  var entitlement = _.find(controller.entitlements, function (entitlement) {
                    return entitlement.type_id === absenceType.id;
                  });

                  if (!entitlement) {
                    expect(absenceType.entitlement).toEqual(0);
                    expect(absenceType.remainder).toEqual({ current: 0, future: 0 });
                  }
                });
              });
            });

            describe('balance changes', function () {
              var mockData;

              beforeEach(function () {
                mockData = leaveRequestMock.balanceChangeByAbsenceType().values;
              });

              it('has fetched the balance changes for the current contact and selected period', function () {
                var args = LeaveRequest.balanceChangeByAbsenceType.calls.argsFor(0);

                expect(args[0]).toEqual(contactId);
                expect(args[1]).toEqual(controller.selectedPeriod.id);
              });

              describe('public holidays', function () {
                it('has fetched the balance changes for the public holidays', function () {
                  var args = LeaveRequest.balanceChangeByAbsenceType.calls.argsFor(0);
                  expect(args[3]).toEqual(true);
                });

                it('has stored them in each absence type', function () {
                  _.forEach(controller.absenceTypes, function (absenceType) {
                    var balanceChanges = absenceType.balanceChanges.holidays;

                    expect(balanceChanges).toBeDefined();
                    expect(balanceChanges).toBe(mockData[absenceType.id]);
                  });
                });
              });

              describe('approved requests', function () {
                it('has fetched the balance changes for the approved requests', function () {
                  var args = LeaveRequest.balanceChangeByAbsenceType.calls.argsFor(1);
                  expect(args[2]).toEqual([ valueOfRequestStatus(sharedSettings.statusNames.approved) ]);
                });

                it('has stored them in each absence type', function () {
                  _.forEach(controller.absenceTypes, function (absenceType) {
                    var balanceChanges = absenceType.balanceChanges.approved;

                    expect(balanceChanges).toBeDefined();
                    expect(balanceChanges).toBe(mockData[absenceType.id]);
                  });
                });
              });

              describe('open requests', function () {
                it('has fetched the balance changes for the open requests', function () {
                  var args = LeaveRequest.balanceChangeByAbsenceType.calls.argsFor(2);

                  expect(args[2]).toEqual([
                    valueOfRequestStatus(sharedSettings.statusNames.awaitingApproval),
                    valueOfRequestStatus(sharedSettings.statusNames.moreInformationRequired)
                  ]);
                });

                it('has stored them in each absence type', function () {
                  _.forEach(controller.absenceTypes, function (absenceType) {
                    var balanceChanges = absenceType.balanceChanges.pending;

                    expect(balanceChanges).toBeDefined();
                    expect(balanceChanges).toBe(mockData[absenceType.id]);
                  });
                });
              });
            });
          });
        });
      });

      describe('period label', function () {
        var label, period;

        describe('when the period is current', function () {
          beforeEach(function () {
            period = _(controller.absencePeriods).find(function (period) {
              return period.current;
            });
            label = controller.labelPeriod(period);
          });

          it('labels it as such', function () {
            expect(label).toBe('Current Period (' + period.title + ')');
          });
        });

        describe('when the period is not current', function () {
          beforeEach(function () {
            period = _(controller.absencePeriods).filter(function (period) {
              return !period.current;
            }).sample();
            label = controller.labelPeriod(period);
          });

          it('returns the title as it is', function () {
            expect(label).toBe(period.title);
          });
        });
      });

      describe('when refreshing the data with a new absence period', function () {
        var newPeriod;

        beforeEach(function () {
          newPeriod = _(controller.absencePeriods).filter(function (period) {
            return period !== controller.selectedPeriod;
          }).sample();

          controller.selectedPeriod = newPeriod;
        });

        describe('basic tests', function () {
          beforeEach(function () {
            Entitlement.all.calls.reset();
            LeaveRequest.balanceChangeByAbsenceType.calls.reset();

            controller.refresh();
          });

          it('goes into loading mode', function () {
            expect(controller.loading.content).toBe(true);
          });

          it('reloads the entitlements', function () {
            expect(Entitlement.all).toHaveBeenCalled();
            expect(Entitlement.all.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
              period_id: newPeriod.id
            }));
          });

          it('reloads all the balance changes', function () {
            var args = LeaveRequest.balanceChangeByAbsenceType.calls.argsFor(_.random(0, 2));

            expect(LeaveRequest.balanceChangeByAbsenceType).toHaveBeenCalledTimes(3);
            expect(args[1]).toEqual(newPeriod.id);
          });
        });

        describe('open sections', function () {
          beforeEach(function () {
            controller.sections.approved.open = true;
            controller.sections.entitlements.open = true;

            controller.refresh();
            $rootScope.$digest();
          });

          it('reloads all data for sections already opened', function () {
            expect(LeaveRequest.all).toHaveBeenCalledWith(jasmine.objectContaining({
              from_date: { from: newPeriod.start_date },
              to_date: { to: newPeriod.end_date },
              status_id: valueOfRequestStatus('approved'),
              type_id: { IN: absenceTypesIDs }
            }), null, requestSortParam, null, false);
            expect(Entitlement.breakdown).toHaveBeenCalledWith(jasmine.objectContaining({
              period_id: newPeriod.id
            }), jasmine.any(Array));
          });
        });

        describe('closed sections', function () {
          beforeEach(function () {
            controller.sections.holidays.data = [jasmine.any(Object), jasmine.any(Object)];
            controller.sections.pending.data = [jasmine.any(Object), jasmine.any(Object)];

            controller.refresh();
            $rootScope.$digest();
          });

          it('removes all cached data for sections that are closed', function () {
            expect(controller.sections.holidays.data.length).toBe(0);
            expect(controller.sections.pending.data.length).toBe(0);
          });
        });

        describe('after loading', function () {
          beforeEach(function () {
            $rootScope.$digest();
          });

          it('goes out of loading mode', function () {
            expect(controller.loading.content).toBe(false);
          });
        });
      });

      describe('when opening a section', function () {
        beforeEach(function () {
          _.forEach(controller.sections, function (section) {
            section.open = false;
          });
        });

        describe('basic tests', function () {
          beforeEach(function () {
            openSection('approved', false);
          });

          it('marks the section as open', function () {
            expect(controller.sections.approved.open).toBe(true);
          });

          it('puts the section in loading mode', function () {
            expect(controller.sections.approved.loading).toBe(true);
          });

          describe('after the data has been loaded', function () {
            beforeEach(function () {
              $rootScope.$digest();
            });

            it('puts the section out of loading mode', function () {
              expect(controller.sections.approved.loading).toBe(false);
            });
          });
        });

        describe('data caching', function () {
          describe('when the section had not been opened yet', function () {
            beforeEach(function () {
              openSection('approved');
            });

            it('makes a request to fetch the data', function () {
              expect(LeaveRequest.all).toHaveBeenCalled();
            });
          });

          describe('when the section had already been opened', function () {
            beforeEach(function () {
              controller.sections.approved.data = [
                LeaveRequestInstance.init(helper.createRandomLeaveRequest(), true),
                LeaveRequestInstance.init(helper.createRandomLeaveRequest(), true)
              ];

              openSection('approved');
            });

            it('does not make another request to fetch the data', function () {
              expect(LeaveRequest.all).not.toHaveBeenCalled();
            });
          });
        });

        describe('section: Public Holidays', function () {
          beforeEach(function () {
            openSection('holidays');
          });

          it('fetches all leave requests linked to a public holiday', function () {
            expect(LeaveRequest.all).toHaveBeenCalledWith(jasmine.objectContaining({
              public_holiday: true,
              type_id: { IN: absenceTypesIDs }
            }), null, requestSortParam, null, false);
          });

          it('caches the data', function () {
            expect(controller.sections.holidays.data.length).not.toBe(0);
          });
        });

        describe('section: Approved Requests', function () {
          beforeEach(function () {
            openSection('approved');
          });

          it('fetches all approved leave requests', function () {
            expect(LeaveRequest.all).toHaveBeenCalledWith(jasmine.objectContaining({
              status_id: valueOfRequestStatus('approved'),
              type_id: { IN: absenceTypesIDs }
            }), null, requestSortParam, null, false);
          });

          it('caches the data', function () {
            expect(controller.sections.approved.data.length).not.toBe(0);
          });
        });

        describe('section: Open Requests', function () {
          beforeEach(function () {
            openSection('pending');
          });

          it('fetches all pending leave requests', function () {
            expect(LeaveRequest.all.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
              status_id: { in: [
                valueOfRequestStatus(sharedSettings.statusNames.awaitingApproval),
                valueOfRequestStatus(sharedSettings.statusNames.moreInformationRequired)
              ] },
              type_id: { IN: absenceTypesIDs }
            }));
          });

          it('caches the data', function () {
            expect(controller.sections.pending.data.length).not.toBe(0);
          });
        });

        describe('section: Cancelled and Other', function () {
          beforeEach(function () {
            openSection('other');
          });

          it('fetches all cancelled/rejected leave requests', function () {
            expect(LeaveRequest.all).toHaveBeenCalledWith(jasmine.objectContaining({
              status_id: { in: [
                valueOfRequestStatus(sharedSettings.statusNames.rejected),
                valueOfRequestStatus(sharedSettings.statusNames.cancelled)
              ] },
              type_id: { IN: absenceTypesIDs }
            }), null, requestSortParam, null, false);
          });

          it('caches the data', function () {
            expect(controller.sections.other.data.length).not.toBe(0);
          });
        });

        describe('breakdown-based sections', function () {
          describe('section: Period Entitlement', function () {
            beforeEach(function () {
              openSection('entitlements');
            });

            it('fetches the entitlements breakdown', function () {
              expect(Entitlement.breakdown).toHaveBeenCalled();
            });

            it('passes to the Model the entitlements already stored', function () {
              expect(Entitlement.breakdown).toHaveBeenCalledWith(jasmine.any(Object), controller.entitlements);
            });

            it('caches the data', function () {
              expect(controller.sections.entitlements.data.length).not.toBe(0);
            });

            describe('cached data format', function () {
              var expectedFormat;

              beforeEach(function () {
                var entitlements = controller.entitlements;

                expectedFormat = Array.prototype.concat.apply([], entitlements.map(function (entitlement) {
                  return entitlement.breakdown;
                }));
              });

              it('groups and flattens all breakdown entries before caching them', function () {
                expect(controller.sections.entitlements.data.length).toBe(expectedFormat.length);
              });
            });

            describe('absence type reference in breakdown', function () {
              it('stores the absence type_id in every breakdown entry', function () {
                controller.entitlements.forEach(function (entitlement) {
                  var entries = entitlementBreakdownEntries(entitlement);

                  expect(entries.every(function (breakdownEntry) {
                    return breakdownEntry.type_id === entitlement.type_id;
                  })).toBe(true);
                });
              });

              function entitlementBreakdownEntries (entitlement) {
                return controller.sections.entitlements.data.filter(function (entry) {
                  return _.contains(entitlement.breakdown, entry);
                });
              }
            });
          });

          describe('section: Expired', function () {
            var dataReturnedFromAPI;

            beforeEach(function () {
              dataReturnedFromAPI = entitlementMock.breakdown().values;

              openSection('expired');
            });

            it('fetches all expired balance changes', function () {
              expect(Entitlement.breakdown).toHaveBeenCalledWith(jasmine.objectContaining({
                expired: true
              }));
            });

            it('fetches all expired toil requests', function () {
              expect(LeaveRequest.all).toHaveBeenCalledWith({
                contact_id: controller.contactId,
                from_date: {from: controller.selectedPeriod.start_date},
                to_date: {to: controller.selectedPeriod.end_date},
                request_type: 'toil',
                type_id: { IN: absenceTypesIDs },
                expired: true
              }, null, requestSortParam, null, false);
            });

            it('does not pass to the Model the entitlements already stored', function () {
              expect(Entitlement.breakdown).not.toHaveBeenCalledWith(jasmine.any(Object), controller.entitlements);
            });

            it('caches the data', function () {
              expect(controller.sections.expired.data.length).not.toBe(0);
            });

            describe('cached data format', function () {
              var expectedFormat;

              beforeEach(function () {
                expectedFormat = Array.prototype.concat.apply([], dataReturnedFromAPI.map(function (entitlement) {
                  return entitlement.breakdown;
                }));
              });

              it('groups and flattens all breakdown and expired TOIL entries before caching them', function () {
                expect(controller.sections.expired.data.length).toBe(expectedFormat.length + leaveRequestMock.all().values.length);
              });
            });
          });
        });
      });

      describe('when closing a section', function () {
        beforeEach(function () {
          controller.sections.approved.open = true;
        });

        describe('basic tests', function () {
          beforeEach(function () {
            controller.toggleSection('approved');
            $rootScope.$digest();
          });

          it('marks the section as closed', function () {
            expect(controller.sections.approved.open).toBe(false);
          });
        });
      });

      describe('when a new leave request is created', function () {
        beforeEach(function () {
          spyOn(controller, 'refresh').and.callThrough();
          pubSub.publish('LeaveRequest::new', jasmine.any(Object));
          openSection('pending');
        });

        it('refreshes the report', function () {
          expect(controller.refresh).toHaveBeenCalled();
        });

        it('gets data from the server, does not use the cache', function () {
          expect(LeaveRequest.all.calls.mostRecent().args[4]).toEqual(false);
        });
      });

      describe('when request is edited', function () {
        beforeEach(function () {
          spyOn(controller, 'refresh').and.callThrough();
          pubSub.publish('LeaveRequest::edit');
          $rootScope.$digest();
        });

        it('refreshes the controller', function () {
          expect(controller.refresh).toHaveBeenCalled();
        });
      });

      describe('when request is deleted', function () {
        var leaveRequest1, leaveRequest2, leaveRequest3;

        beforeEach(function () {
          leaveRequest1 = LeaveRequestInstance.init(leaveRequestMock.all().values[0], true);
          leaveRequest2 = LeaveRequestInstance.init(leaveRequestMock.all().values[1], true);
          leaveRequest3 = LeaveRequestInstance.init(leaveRequestMock.all().values[2], true);

          spyOn(leaveRequest1, 'delete').and.returnValue($q.resolve());
        });

        describe('basic tests', function () {
          var testData;

          beforeEach(function () {
            controller.sections.pending.data = [leaveRequest1, leaveRequest2, leaveRequest3];
            controller.sections.pending.dataIndex = _.indexBy(controller.sections.pending.data, 'id');
            testData = {
              leaveRequest: leaveRequest1,
              oldBalanceChange: controller.absenceTypesIndexed[leaveRequest1.type_id].balanceChanges.pending,
              oldList: controller.sections.pending.data
            };

            leaveRequest1.delete();
          });

          describe('Leave request delete event', function () {
            beforeEach(function () {
              pubSub.publish('LeaveRequest::delete', leaveRequest1);
              $rootScope.$digest();

              testData.newBalanceChange = controller.absenceTypesIndexed[leaveRequest1.type_id].balanceChanges.pending;
            });

            itHandlesTheDeleteStatusUpdate();
          });

          describe('Leave request status update event', function () {
            beforeEach(function () {
              pubSub.publish('LeaveRequest::statusUpdate', {
                status: 'delete',
                leaveRequest: leaveRequest1
              });
              $rootScope.$digest();

              testData.newBalanceChange = controller.absenceTypesIndexed[leaveRequest1.type_id].balanceChanges.pending;
            });

            itHandlesTheDeleteStatusUpdate();
          });

          function itHandlesTheDeleteStatusUpdate () {
            it('sends the deletion request', function () {
              expect(testData.leaveRequest.delete).toHaveBeenCalled();
            });

            it('removes the leave request from its section', function () {
              expect(_.includes(controller.sections.pending.data, testData.leaveRequest)).toBe(false);
            });

            it('removes the leave request without creating a new array', function () {
              expect(controller.sections.pending.data).toBe(testData.oldList);
            });

            it('updates the balance changes for the section the leave request was in', function () {
              expect(testData.newBalanceChange).not.toBe(testData.oldBalanceChange);
              expect(testData.newBalanceChange).toBe(testData.oldBalanceChange - testData.leaveRequest.balance_change);
            });
          }
        });

        describe('when the leave request was already approved', function () {
          var oldRemainder, newRemainder;

          beforeEach(function () {
            controller.sections.approved.data = [leaveRequest1, leaveRequest2, leaveRequest3];
            controller.sections.approved.dataIndex = _.indexBy(controller.sections.approved.data, 'id');
            oldRemainder = controller.absenceTypesIndexed[leaveRequest1.type_id].remainder.current;

            leaveRequest1.delete();
            pubSub.publish('LeaveRequest::delete', leaveRequest1);
            $rootScope.$digest();

            newRemainder = controller.absenceTypesIndexed[leaveRequest1.type_id].remainder.current;
          });

          it('updates the current remainder of the entitlement of the absence type the leave request was for', function () {
            expect(newRemainder).not.toBe(oldRemainder);
            expect(newRemainder).toBe(oldRemainder - leaveRequest1.balance_change);
          });
        });

        describe('when the leave request was still open', function () {
          var oldRemainder, newRemainder;

          beforeEach(function () {
            controller.sections.pending.data = [leaveRequest1, leaveRequest2, leaveRequest3];
            controller.sections.pending.dataIndex = _.indexBy(controller.sections.pending.data, 'id');
            oldRemainder = controller.absenceTypesIndexed[leaveRequest1.type_id].remainder.future;

            leaveRequest1.delete();
            pubSub.publish('LeaveRequest::delete', leaveRequest1);
            $rootScope.$digest();

            newRemainder = controller.absenceTypesIndexed[leaveRequest1.type_id].remainder.future;
          });

          it('updates the future remainder of the entitlement of the absence type the leave request was for', function () {
            expect(newRemainder).not.toBe(oldRemainder);
            expect(newRemainder).toBe(oldRemainder - leaveRequest1.balance_change);
          });
        });
      });

      describe('when the request is cancelled', function () {
        var leaveRequest1, leaveRequest2, leaveRequest3;

        beforeEach(function () {
          leaveRequest1 = LeaveRequestInstance.init(leaveRequestMock.all().values[0], true);
          leaveRequest2 = LeaveRequestInstance.init(leaveRequestMock.all().values[1], true);
          leaveRequest3 = LeaveRequestInstance.init(leaveRequestMock.all().values[2], true);

          controller.sections.pending.data = [leaveRequest1, leaveRequest2, leaveRequest3];
          controller.sections.pending.dataIndex = _.indexBy(controller.sections.pending.data, 'id');
          controller.sections.other.open = true;

          leaveRequest1.cancel();
          pubSub.publish('LeaveRequest::statusUpdate', {
            status: 'cancel',
            leaveRequest: leaveRequest1
          });
          $rootScope.$digest();
        });

        it('removes the leave request from its section', function () {
          expect(_.includes(controller.sections.pending.data, leaveRequest1)).toBe(false);
        });

        it('adds the leave reuqest to the "Cancelled and Other" section', function () {
          expect(_.includes(controller.sections.other.data, leaveRequest1)).toBe(true);
          expect(controller.sections.other.dataIndex[leaveRequest1.id]).toBe(leaveRequest1);
        });
      });

      /**
       * Returns the value of the given leave request status
       *
       * @param  {string} statusName
       * @return {integer}
       */
      function valueOfRequestStatus (statusName) {
        var statuses = optionGroupMock.getCollection('hrleaveandabsences_leave_request_status');

        return _.find(statuses, function (status) {
          return status.name === statusName;
        })['value'];
      }

      function compileComponent () {
        controller = $componentController('staffLeaveReport', null, { contactId: contactId });
        $rootScope.$digest();
      }

      /**
       * Open the given section and runs the digest cycle
       *
       * @param {string} section
       */
      function openSection (section, digest) {
        digest = typeof digest === 'undefined' ? true : !!digest;

        controller.toggleSection(section);
        digest && $rootScope.$digest();
      }
    });
  });
})(CRM);
