/* eslint-env amd */

define([
  'common/lodash',
  'common/moment',
  'leave-absences/shared/modules/components',
  'common/models/session.model',
  'leave-absences/shared/models/calendar.model'
], function (_, moment, components) {
  components.component('leaveRequestPopupDetailsTab', {
    bindings: {
      absencePeriods: '<',
      absenceTypes: '<',
      balance: '=',
      checkSubmitConditions: '=',
      request: '<',
      isLeaveStatus: '<',
      leaveType: '<',
      isMode: '<',
      isSelfRecord: '<',
      period: '=',
      isRole: '<',
      selectedAbsenceType: '='
    },
    templateUrl: ['shared-settings', function (sharedSettings) {
      return sharedSettings.sharedPathTpl + 'components/leave-request-popup/leave-request-popup-details-tab.html';
    }],
    controllerAs: 'detailsTab',
    controller: DetailsTabController
  });

  DetailsTabController.$inject = ['$controller', '$log', '$rootScope', '$scope',
    '$q', 'HR_settings', 'shared-settings', 'Calendar', 'OptionGroup',
    'PublicHoliday', 'LeaveRequest', '$timeout'];

  function DetailsTabController ($controller, $log, $rootScope, $scope,
    $q, HRSettings, sharedSettings, Calendar, OptionGroup,
    PublicHoliday, LeaveRequest, $timeout) {
    $log.debug('Component: leave-request-popup-details-tab');
    var originalOpeningBalance = null;
    var listeners = [];
    var vm = this;

    vm.canManage = false;
    vm.calendar = {};
    vm.errors = [];
    vm.requestDayTypes = [];
    vm.statusNames = sharedSettings.statusNames;
    vm.loading = {
      tab: false,
      showBalanceChange: false,
      fromDayTypes: false,
      toDayTypes: false
    };
    vm.pagination = {
      currentPage: 1,
      filteredbreakdown: vm.balance.change.breakdown,
      numPerPage: 7,
      totalItems: vm.balance.change.breakdown.length,
      pageChanged: pageChanged
    };
    vm.uiOptions = {
      isChangeExpanded: false,
      multipleDays: true,
      userDateFormat: HRSettings.DATE_FORMAT,
      showBalance: false,
      date: {
        from: {
          show: false,
          options: {
            startingDay: 1,
            showWeeks: false
          }
        },
        to: {
          show: false,
          options: {
            minDate: null,
            maxDate: null,
            startingDay: 1,
            showWeeks: false
          }
        },
        expiry: {
          show: false,
          options: {
            minDate: null,
            maxDate: null,
            startingDay: 1,
            showWeeks: false
          }
        }
      },
      times: {
        from: {
          time: '',
          amount: 0,
          maxAmount: 0,
          disabled: true,
          loading: false,
          skipValueSetting: false
        },
        to: {
          time: '',
          amount: 0,
          maxAmount: 0,
          disabled: true,
          loading: false,
          skipValueSetting: false
        }
      }
    };

    vm.attemptCalculateBalanceChange = attemptCalculateBalanceChange;
    vm.calculateBalanceChange = calculateBalanceChange;
    vm.changeInNoOfDays = changeInNoOfDays;
    vm.isLeaveType = isLeaveType;
    vm.isNotWorkingDay = isNotWorkingDay;
    vm.setDatesFromUI = setDatesFromUI;
    vm.toggleBalance = toggleBalance;
    vm._canCalculateChange = _canCalculateChange;
    vm._calculateOpeningAndClosingBalance = _calculateOpeningAndClosingBalance;
    vm._convertDateFormatFromServer = _convertDateFormatFromServer;
    vm._convertDateToServerFormat = _convertDateToServerFormat;
    vm._loadCalendar = _loadCalendar;
    vm._reset = _reset;
    vm.$onDestroy = unsubscribeFromEvents;

    (function init () {
      $controller(_.capitalize(getLeaveType(vm.leaveType, vm.request)) + 'RequestCtrl', { parentCtrl: vm });

      vm.canManage = vm.isRole('manager') || vm.isRole('admin');
      vm.loading.tab = true;
      initListeners();

      vm.initChildController()
      .then(function () {
        return $q.all([
          vm._loadCalendar(),
          loadDayTypes()
        ]);
      })
      .then(initDates)
      .then(initTimes)
      .then(initOriginalOpeningBalance)
      .then(function () {
        return $q.all([
          setDaysSelectionMode(),
          initBalanceChange()
        ]);
      })
      .then(initTimeAndDateInputsWatchers)
      .catch(handleError)
      .finally(function () {
        vm.loading.tab = false;
      });
    }());

    /**
     * Calculate change in balance, it updates local balance variables.
     *
     * @return {Promise} empty promise if all required params are not set
     *   otherwise promise from server
     */
    function calculateBalanceChange () {
      vm.loading.showBalanceChange = true;

      return vm.request.calculateBalanceChange(vm.selectedAbsenceType.calculation_unit_name)
        .then(setBalanceChange)
        .catch(handleError);
    }

    /**
     * Change handler when changing no. of days like Multiple Days or Single Day.
     * It will reset dates, day types, change balance.
     *
     * @return {Promise}
     */
    function changeInNoOfDays () {
      vm._reset();
      vm._calculateOpeningAndClosingBalance();

      return $q.resolve()
        .then(vm.changeInNoOfDaysExtended ? vm.changeInNoOfDaysExtended : _.noop);
    }

    /**
     * Checks absence period for the changed date,
     * updates the entitlements if needed
     * and notifies user if the Absence Period was not found
     *
     * @param {String} dateType from|to
     * @return {Promise}
     */
    function checkAbsencePeriod (dateType) {
      var periodHasBeenChanged;

      return setAbsencePeriod(dateType)
        .then(function (_periodHasBeenChanged_) {
          periodHasBeenChanged = _periodHasBeenChanged_;

          return _loadCalendar();
        })
        .then(function () {
          return loadAndSetTimeRangesFromWorkPattern(
            vm.uiOptions[dateType + 'Date'], dateType);
        })
        .then(function () {
          return loadAbsencePeriodDateTypes(
            vm.uiOptions[dateType + 'Date'], dateType);
        })
        .then(function () {
          if (periodHasBeenChanged) {
            $rootScope.$broadcast('LeaveRequestPopup::absencePeriodChanged');
          } else {
            return attemptCalculateBalanceChange();
          }
        })
        .catch(handleError);
    }

    /**
     * Extracts time from server formatted date
     *
     * @param  {String} date in "YYYY-MM-DD hh:mm:ss" format
     * @return {String} time in hh:mm format
     */
    function extractTimeFromServerDate (date) {
      return moment(date).format('HH:mm');
    }

    /**
     * This method will be used on the view to return a list of available
     * leave request day types (All day, Half-day AM, Half-day PM, Non working day,
     * Weekend, Public holiday) for the given date (which is the date
     * selected by the user via datepicker)
     *
     * If no date is passed, then no list is returned
     *
     * @param  {Date} date
     * @param  {String} dayType - set to from if from date is selected else to
     * @return {Promise} of array with day types
     */
    function filterLeaveRequestDayTypes (date, dayType) {
      var listToReturn;

      if (!date) {
        return $q.reject([]);
      }

      // Make a copy of the list
      listToReturn = _.cloneDeep(vm.requestDayTypes);
      date = vm._convertDateToServerFormat(date);

      return PublicHoliday.isPublicHoliday(date)
        .then(function (result) {
          if (result) {
            return listToReturn.filter(function (publicHoliday) {
              return publicHoliday.name === 'public_holiday';
            });
          }

          return getDayTypesFromDate(date, listToReturn)
            .then(function (inCalendarList) {
              return inCalendarList.length
                ? inCalendarList
                : listToReturn.filter(function (dayType) {
                  return _.includes(['all_day', 'half_day_am', 'half_day_pm'], dayType.name);
                });
            });
        })
        .then(function (listToReturn) {
          setDayTypes(dayType, listToReturn);

          return listToReturn;
        });
    }

    /**
     * Gets list of day types if its found to be weekend or non working in calendar
     *
     * @param {Date} date to Checks
     * @param {Array} listOfDayTypes array of day types
     * @return {Array} non-empty if found else empty array
     */
    function getDayTypesFromDate (date, listOfDayTypes) {
      date = moment(date);

      return $q.all([
        vm.calendar.isNonWorkingDay(date),
        vm.calendar.isWeekend(date)
      ]).then(function (results) {
        return results[0] ? 'non_working_day' : (results[1] ? 'weekend' : null);
      })
      .then(function (nameFilter) {
        return !nameFilter ? [] : listOfDayTypes.filter(function (day) {
          return day.name === nameFilter;
        });
      });
    }

    /**
     * Gets leave type.
     *
     * @return {String} leave type
     */
    function getLeaveType () {
      return vm.request ? vm.request.request_type : (vm.leaveType || null);
    }

    /**
     * Gets currently selected absence type from leave request type_id
     *
     * @return {Object} absence type object
     */
    function getSelectedAbsenceType () {
      return _.find(vm.absenceTypes, function (absenceType) {
        return absenceType.id === vm.request.type_id;
      });
    }

    /**
     * Gets original balance change breakdown that cannot be affected by,
     * for example, work pattern changes.
     *
     * @return {Promise}
     */
    function getOriginalBalanceChange () {
      toggleBalance();

      vm.loading.showBalanceChange = true;

      return vm.request.getBalanceChangeBreakdown()
        .then(setBalanceChange)
        .catch(handleError);
    }

    /**
     * Handles errors
     *
     * @param {Array|Object}
     */
    function handleError (errors) {
      $rootScope.$broadcast('LeaveRequestPopup::handleError', _.isArray(errors) ? errors : [errors]);
      vm.loading.fromDayTypes = false;
      vm.loading.showBalanceChange = false;
      vm.loading.tab = false;
      vm.loading.toDayTypes = false;
    }

    /**
     * Initiates the balance change breakdown
     *
     * @return {Promise}
     */
    function initBalanceChange () {
      return (vm.isMode('edit') ? getOriginalBalanceChange() : attemptCalculateBalanceChange());
    }

    /**
     * Checks for the calculation unit for the selected absence type
     *
     * @param  {String} unit (days|hours)
     * @return {Boolean}
     */
    function isCalculationUnit (unit) {
      return vm.selectedAbsenceType.calculation_unit_name === unit;
    }

    /**
     * Checks if popup is opened in given leave type like `leave` or `sickness` or 'toil'
     *
     * @param {String} leaveTypeParam to check the leave type of current request
     * @return {Boolean}
     */
    function isLeaveType (leaveTypeParam) {
      return vm.request.request_type === leaveTypeParam;
    }

    /**
     * Initialises and sets the "from" and "to" dates and day types
     *
     * @return {Promise}
     */
    function initDates () {
      var attributes;

      if (!vm.isMode('create')) {
        attributes = vm.request.attributes();
        vm.uiOptions.fromDate = vm._convertDateFormatFromServer(vm.request.from_date);

        return loadAbsencePeriodDateTypes(vm.uiOptions.fromDate, 'from')
          .then(function () {
            // to_date and type has been reset in above call so reinitialize from clone
            vm.request.to_date = attributes.to_date;
            vm.request.to_date_type = attributes.to_date_type;
            vm.uiOptions.toDate = vm._convertDateFormatFromServer(vm.request.to_date);

            return loadAbsencePeriodDateTypes(vm.uiOptions.toDate, 'to');
          });
      } else {
        return $q.resolve();
      }
    }

    /**
     * Initialises listeners
     */
    function initListeners () {
      listeners.push(
        $rootScope.$on('LeaveRequestPopup::updateBalance', function (event, absenceTypes) {
          if (absenceTypes) {
            vm.absenceTypes = absenceTypes;
          }
          setSelectedAbsenceType();
          setDaysSelectionMode();
          attemptCalculateBalanceChange();
        })
      );
    }

    /**
     * Initialises and sets the "from" and "to" times
     */
    function initTimes () {
      var times = vm.uiOptions.times;
      var request = vm.request;

      if (!vm.isMode('create') && isCalculationUnit('hours')) {
        _.each(['from', 'to'], function (type) {
          times[type].skipValueSetting = true;
          times[type].time = extractTimeFromServerDate(request[type + '_date']);
          times[type].amount = request[type + '_date_amount'];
          times[type].maxAmount = times[type].amount;
        });
      }
    }

    /**
     * Initialises watchers for time and date inputs
     */
    function initTimeAndDateInputsWatchers () {
      if (vm.isMode('view') || isLeaveType('toil')) { return; }

      _.each(['from', 'to'], function (type) {
        $scope.$watch('detailsTab.uiOptions.times.' + type + '.amount', function (amount, oldAmount) {
          if (!isCalculationUnit('days') && +amount !== +oldAmount) {
            setHoursDeductionsToRequest();
            vm.attemptCalculateBalanceChange();
          }
        });
        $scope.$watch('detailsTab.uiOptions.times.' + type + '.time', function (time, oldTime) {
          if (!isCalculationUnit('days') && +time !== +oldTime) {
            setDatesToRequest();
          }
        });
      });
    }

    /**
     * Initialize the original opening balance when in edit mode and the
     * request is approved. This allows to display the opening balance before
     * the request was created.
     *
     * The formula is absence type remainder + balance change. Since
     * Balance Change is a negative number so it needs to be subtracted.
     */
    function initOriginalOpeningBalance () {
      if (vm.isMode('edit') && (
        vm.isLeaveStatus(sharedSettings.statusNames.approved) ||
        vm.isLeaveStatus(sharedSettings.statusNames.adminApproved)
      )) {
        originalOpeningBalance = {
          absenceTypeId: vm.request.type_id,
          value: vm.selectedAbsenceType.remainder - vm.request.balance_change
        };
      }
    }

    /**
     * Checks if the given day type is not a working day.
     * Do not confuse with "non working day".
     *
     * @param  {String} dayType
     * @return {Boolean} true if is not a working day
     */
    function isNotWorkingDay (dayType) {
      return _.includes(['weekend', 'non_working_day', 'public_holiday'], dayType);
    }

    /**
     * Loads absence types and calendar data on component initialization and
     * when they need to be updated.
     *
     * @param {Date} date - the selected date
     * @param {String} dayType - set to from if from date is selected else to
     * @return {Promise}
     */
    function loadAbsencePeriodDateTypes (date, dateType) {
      return filterLeaveRequestDayTypes(date, dateType)
        .then(function () {
          vm.loading[dateType + 'DayTypes'] = false;
        });
    }

    /**
     * Initializes leave request day types
     *
     * @return {Promise}
     */
    function loadDayTypes () {
      return OptionGroup.valuesOf('hrleaveandabsences_leave_request_day_type')
        .then(function (dayTypes) {
          vm.requestDayTypes = dayTypes;
        });
    }

    /**
     * Loads and sets time ranges from work pattern for "from" or "to" timepickers
     *
     * @param  {Date} date in standard JavaScript format
     * @param  {String} type (days|hours)
     * @return {Promise}
     */
    function loadAndSetTimeRangesFromWorkPattern (date, type) {
      var timeObject = vm.uiOptions.times[type];

      if (!date) { return $q.resolve(); }

      timeObject.loading = true;
      timeObject.disabled = true;

      if (!timeObject.skipValueSetting) {
        timeObject.time = '';
        timeObject.amount = '0';
      }

      return vm.request.getWorkDayForDate(date)
        .then(function (response) {
          timeObject.min = response.time_from || '00:00';
          timeObject.max = response.time_to || '00:00';
          timeObject.maxAmount = response.number_of_hours.toString() || '0';
          timeObject.disabled = false;

          if (!timeObject.skipValueSetting) {
            timeObject.time = (type === 'to' ? timeObject.max : timeObject.min);
            timeObject.amount = timeObject.maxAmount;
          }
        })
        .catch(handleError)
        .finally(function () {
          timeObject.loading = false;
          timeObject.skipValueSetting = false;
        });
    }

    /**
     * It filters the breakdown to obtain the ones for currently selected page.
     */
    function pageChanged () {
      var begin = (vm.pagination.currentPage - 1) * vm.pagination.numPerPage;
      var end = begin + vm.pagination.numPerPage;

      vm.pagination.filteredbreakdown = vm.balance.change.breakdown.slice(begin, end);
    }

    /**
     * Helper function to reset pagination for balance breakdow
     */
    function rePaginate () {
      vm.pagination.totalItems = vm.balance.change.breakdown.length;
      vm.pagination.filteredbreakdown = vm.balance.change.breakdown;
      vm.pagination.pageChanged();
    }

    /**
     * Performs a set of manipulations to prepare all data for calculation and
     * then triggers the calculation itself if it can be calculated
     *
     * @return {Promise}
     */
    function attemptCalculateBalanceChange () {
      updateOpeningBalance();
      setHoursDeductionsToRequest();
      setMinMaxDatesToUI();
      setDatesToRequest(); // @TODO find a way to not call it twice
      toggleBalance();

      if (!vm._canCalculateChange()) {
        return $q.resolve();
      }

      vm.loading.showBalanceChange = true;

      return vm.calculateBalanceChange()
        .then(setBalanceChange)
        .catch(handleError)
        .finally(function () {
          vm.loading.showBalanceChange = false;
        });
    }

    /**
     * Checks if the given request has same "from" and "to" dates
     *
     * @param  {RequestInstance} request
     * @return {Boolean}
     */
    function requestHasSameDates (request) {
      return _convertDateToServerFormat(request.from_date) ===
        _convertDateToServerFormat(request.to_date);
    }

    /**
     * Sets balance change breakdown after it was retrieved or calculated
     *
     * @param {Object} balanceChange
     */
    function setBalanceChange (balanceChange) {
      if (balanceChange) {
        vm.balance.change = balanceChange;

        vm._calculateOpeningAndClosingBalance();
        rePaginate();
      }

      vm.loading.showBalanceChange = false;
    }

    /**
     * Sets day selection mode: multiple days or a single day
     */
    function setDaysSelectionMode () {
      if ((!vm.isMode('create') && requestHasSameDates(vm.request)) ||
        (vm.isMode('create') && (vm.isLeaveType('sickness') || isCalculationUnit('hours')))) {
        vm.uiOptions.multipleDays = false;
      } else {
        vm.uiOptions.multipleDays = true;
      }
    }

    /**
     * Sets the collection for given day types to sent list of day types,
     * also initializes the day types
     *
     * @param {String} dayType like `from` or `to`
     * @param {Array} listOfDayTypes collection of available day types
     */
    function setDayTypes (dateType, listOfDayTypes) {
      // will create either of leaveRequestFromDayTypes or leaveRequestToDayTypes key
      var keyForDayTypeCollection = 'request' + _.startCase(dateType) + 'DayTypes';

      vm[keyForDayTypeCollection] = listOfDayTypes;

      if (vm.isMode('create')) {
        vm.request[dateType + '_date_type'] = vm[keyForDayTypeCollection][0].value;
      }
    }

    /**
     * Sets selected absence type
     */
    function setSelectedAbsenceType () {
      vm.selectedAbsenceType = getSelectedAbsenceType();
    }

    /**
     * Destroys all event listeners
     */
    function unsubscribeFromEvents () {
      _.forEach(listeners, function (listener) {
        listener();
      });
    }

    /**
     * Whenever the absence type changes, update the balance opening.
     * Also the balance change needs to be recalculated, if the `from` and `to`
     * dates have been already selected
     */
    function updateOpeningBalance () {
      // get the `balance` of the newly selected absence type
      vm.balance.opening = vm.selectedAbsenceType.remainder;
    }

    /**
     * If change can be calculated
     */
    function _canCalculateChange () {
      var canCalculate = !!vm.request.from_date && !!vm.request.to_date;

      if (isCalculationUnit('days')) {
        canCalculate = canCalculate &&
          !!vm.request.from_date_type && !!vm.request.to_date_type;
      }

      return canCalculate;
    }

    /**
     * Calculates and updates opening and closing balances.
     *
     * For the opening balance, when in edit mode, if the selected absence type
     * is the same as the request absence type, the opening balance is the
     * original opening balance value, otherwise it's the leave balance
     * remainder.
     *
     * The closing balance is the opening balance + change amount.
     */
    function _calculateOpeningAndClosingBalance () {
      if (originalOpeningBalance &&
        originalOpeningBalance.absenceTypeId === vm.selectedAbsenceType.id) {
        vm.balance.opening = originalOpeningBalance.value || 0;
      } else {
        vm.balance.opening = vm.selectedAbsenceType.remainder;
      }
      // the change is negative so adding it will actually subtract it
      vm.balance.closing = vm.balance.opening + vm.balance.change.amount;
    }

    /**
     * Converts given date to javascript date as expected by uib-datepicker
     *
     * @param {String} date from server
     * @return {Date}
     */
    function _convertDateFormatFromServer (date) {
      return moment(date, sharedSettings.serverDateFormat).toDate();
    }

    /**
     * Converts given date to server format
     *
     * @param {Date} date
     * @return {String} date converted to server format
     */
    function _convertDateToServerFormat (date) {
      return moment(date).format(sharedSettings.serverDateFormat);
    }

    /**
     * Initializes user's calendar (work patterns)
     *
     * @return {Promise}
     */
    function _loadCalendar () {
      return Calendar.get(vm.request.contact_id, vm.period.start_date, vm.period.end_date)
        .then(function (usersCalendar) {
          vm.calendar = usersCalendar;
        });
    }

    /**
     * Sets absence period for the changed date if it exists
     *
     * @param {String} dateType from|to
     * @return {Promise} if period found, resolves with TRUE if period has changed,
     * with FALSE if period has not been changed, else rejects
     */
    function setAbsencePeriod (dateType) {
      var previousAbsencePeriodId = vm.period.id;
      var formattedDate = moment(vm.uiOptions[dateType + 'Date'])
        .format(vm.uiOptions.userDateFormat.toUpperCase());

      vm.period = _.find(vm.absencePeriods, function (period) {
        return period.isInPeriod(formattedDate);
      });

      if (!vm.period) {
        vm.period = {};
        // inform user if absence period is not found
        vm.loading['fromDayTypes'] = false;

        return $q.reject('Please change date as it is not in any absence period');
      }

      return $q.resolve(previousAbsencePeriodId !== vm.period.id);
    }

    function setDatesToRequest () {
      var options = vm.uiOptions;
      var request = vm.request;
      var times = options.times;

      request.from_date = options.fromDate ? vm._convertDateToServerFormat(options.fromDate) : null;
      request.to_date = options.toDate ? vm._convertDateToServerFormat(options.toDate) : null;

      if (isCalculationUnit('hours') && !isLeaveType('toil')) {
        request.from_date = request.from_date && times.from.time ? request.from_date + ' ' + times.from.time : null;
        request.to_date = request.to_date && times.to.time ? request.to_date + ' ' + times.to.time : null;
      }

      if (!options.multipleDays && options.fromDate) {
        request.to_date = request.from_date;
        request.to_date_type = request.from_date_type;
        options.toDate = options.fromDate;
      }
    }

    /**
     * Sets dates (with time in case of "hours" Absence Type) from UI to vm.request
     *
     * @param  {String} dateType from|to
     * @return {Promise}
     */
    function setDatesFromUI (dateType) {
      resetAfterDateChange(dateType);
      setDatesToRequest();
      return $q.resolve()
        .then(vm.setDatesFromUIExtended ? vm.setDatesFromUIExtended : _.noop)
        .then(function () {
          return checkAbsencePeriod(dateType);
        });
    }

    /**
     * Sets deductions in hours from UI to vm.request
     */
    function setHoursDeductionsToRequest () {
      var times = vm.uiOptions.times;

      vm.request.from_date_amount = !isNaN(+vm.uiOptions.times.from.amount) ? times.from.amount : null;
      vm.request.to_date_amount = !isNaN(+vm.uiOptions.times.to.amount) ? times.to.amount : null;
    }

    /**
     * Sets the min and max for to date from absence period. It also sets the
     * init/starting date which user can select from. For multiple days request
     * user can select to date which is one more than the the start date.
     *
     * @TODO there is a usecase that is not handled yet: change FROM date
     * to the future absence period and then set back to the previous one -
     * the TO date will not be reset, it should though.
     * @TODO not sure why it sets same TO date as FROM date and not +1 day (?)
     */
    function setMinMaxDatesToUI () {
      if (vm.uiOptions.fromDate) {
        var nextFromDay = moment(vm.uiOptions.fromDate).add(1, 'd').toDate();

        vm.uiOptions.date.to.options.minDate = nextFromDay;
        vm.uiOptions.date.to.options.initDate = nextFromDay;

        // also re-set to date if from date is changing and less than to date
        if (vm.uiOptions.toDate && moment(vm.uiOptions.toDate).isBefore(vm.uiOptions.fromDate)) {
          vm.uiOptions.toDate = vm.uiOptions.fromDate;
        }
      } else {
        vm.uiOptions.date.to.options.minDate = vm._convertDateFormatFromServer(vm.period.start_date);
        vm.uiOptions.date.to.options.initDate = vm.uiOptions.date.to.options.minDate;
      }

      vm.uiOptions.date.to.options.maxDate = vm._convertDateFormatFromServer(vm.period.end_date);
    }

    /**
     * Show that data is loading by showing spinners instead of UI fields
     *
     * @param {String} dateType from|to
     */
    function resetAfterDateChange (dateType) {
      vm['request' + _.startCase(dateType) + 'DayTypes'] = [];
      vm.loading[dateType + 'DayTypes'] = true;

      toggleBalance();
    }

    /**
     * Resets data in dates, types, balance.
     */
    function _reset () {
      vm.uiOptions.toDate = vm.uiOptions.fromDate;
      vm.request.to_date_type = vm.request.from_date_type;
      vm.request.to_date = vm.request.from_date;

      attemptCalculateBalanceChange();
    }

    /**
     * Shows or hides the balance breakdown depending on various conditions
     */
    function toggleBalance () {
      vm.uiOptions.showBalance = vm._canCalculateChange();
    }
  }
});
