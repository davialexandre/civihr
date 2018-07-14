/* eslint-env amd */

define([
  'common/lodash',
  'common/moment',
  'leave-absences/shared/modules/components',
  'common/services/pub-sub'
], function (_, moment, components) {
  components.component('leaveCalendarMonth', {
    bindings: {
      contacts: '<',
      contactIdsToReduceTo: '<',
      month: '<',
      period: '<',
      showContactName: '<',
      showContactDetailsLink: '<',
      showOnlyWithLeaveRequests: '<',
      supportData: '<'
    },
    templateUrl: ['shared-settings', function (sharedSettings) {
      return sharedSettings.sharedPathTpl + 'components/leave-calendar-month.html';
    }],
    controllerAs: 'month',
    controller: ['$log', '$q', '$rootScope', 'Calendar', 'LeaveRequest',
      'pubSub', 'shared-settings', controller]
  });

  function controller ($log, $q, $rootScope, Calendar, LeaveRequest, pubSub,
    sharedSettings) {
    $log.debug('Component: leave-calendar-month');

    var dataLoaded = false;
    var eventListeners = [];
    var calendars = {};
    var leaveRequests = {};
    var vm = this;

    vm.currentPage = 0;
    vm.pageSize = 20;
    vm.visible = false;
    vm.showContactName = !!vm.showContactName;
    vm.showOnlyWithLeaveRequests = !!vm.showOnlyWithLeaveRequests;

    vm.$onDestroy = onDestroy;
    vm.contactsList = contactsList;
    vm.getContactUrl = getContactUrl;

    (function init () {
      var dateFromMonth = moment().month(vm.month.index).year(vm.month.year);

      indexData();
      initListeners();

      vm.month = buildMonthStructure(dateFromMonth);

      $rootScope.$emit('LeaveCalendar::monthInjected');
    }());

    /**
     * Adds a leave request to the calendar
     *
     * @param {LeaveRequestInstance} leaveRequest
     */
    function addLeaveRequest (leaveRequest) {
      indexLeaveRequests([leaveRequest]);
      updateLeaveRequestDaysContactData(leaveRequest);
    }

    /**
     * Returns the structure of the month of the given date
     *
     * @param  {Moment} dateMoment
     * @return {Object}
     */
    function buildMonthStructure (dateMoment) {
      return {
        index: dateMoment.month(),
        year: dateMoment.year(),
        name: dateMoment.format('MMMM'),
        loading: true,
        days: buildMonthDaysStructure(dateMoment)
      };
    }

    /**
     * Returns the structure of the days list of the month of the given date
     *
     * @param  {Moment} dateMoment
     * @return {Object}
     */
    function buildMonthDaysStructure (dateMoment) {
      var today = moment();
      var pointerDay = dateMoment.clone().startOf('month');

      return _.map(_.times(dateMoment.daysInMonth()), function () {
        var dayObj = {
          date: pointerDay.format('YYYY-MM-DD'),
          name: pointerDay.format('ddd'),
          index: pointerDay.format('D'),
          current: today.isSame(pointerDay, 'day'),
          enabled: pointerDay.isSameOrAfter(vm.period.start_date) &&
            pointerDay.isSameOrBefore(vm.period.end_date),
          contactsData: {}
        };

        pointerDay.add(1, 'day');

        return dayObj;
      });
    }

    /**
     * Returns work pattern calendar of the given contact
     *
     * @param  {String} contactId
     * @return {Object}
     */
    function contactMonthWorkPatternCalendar (contactId) {
      return calendars[contactId];
    }

    /**
     * Gives the list of contacts to display, eventually filtered
     *
     * @return {Array}
     */
    function contactsList () {
      return !vm.showOnlyWithLeaveRequests ? vm.contacts : vm.contacts.filter(function (contact) {
        return Object.keys(leaveRequests[contact.id] || {}).length;
      });
    }

    /**
     * Converts given date to moment object with server format
     *
     * @param {Date/String} date from server
     * @return {Moment}
     */
    function dateObjectWithFormat (date) {
      return moment(date, sharedSettings.serverDateFormat);
    }

    /**
     * Deletes the given leave request from the list
     *
     * @param  {LeaveRequestInstance} leaveRequest
     */
    function deleteLeaveRequest (leaveRequest) {
      removeLeaveRequestFromIndexedList(leaveRequest);
      updateLeaveRequestDaysContactData(leaveRequest);
    }

    /**
     * Get profile URL for the given contact id
     *
     * @param {string/int} contactId
     */
    function getContactUrl (contactId) {
      return CRM.url('civicrm/contact/view', { cid: contactId });
    }

    /**
     * If there are contacts to reduce to, reduces contacts to the list provided,
     * plus leaves those who have leave requests at the given month period
     *
     * @return {Promise}
     */
    function reduceContacts () {
      if (vm.contactIdsToReduceTo) {
        vm.contacts = vm.contacts.filter(function (contact) {
          return (_.includes(vm.contactIdsToReduceTo, contact.contact_id) ||
            _.find(leaveRequests, function (leaveRequest) {
              return leaveRequest.contact_id === contact.contact_id;
            }));
        });
      }

      return $q.resolve();
    }

    /**
     * Indexes for easy access the data that the component needs
     */
    function indexData () {
      vm.supportData.dayTypes = _.indexBy(vm.supportData.dayTypes, 'name');
      vm.supportData.leaveRequestStatuses = _.indexBy(vm.supportData.leaveRequestStatuses, 'value');
      vm.supportData.publicHolidays = _.transform(vm.supportData.publicHolidays, function (result, publicHoliday) {
        result[dateObjectWithFormat(publicHoliday.date).valueOf()] = publicHoliday;
      }, {});
    }

    /**
     * Index leave requests by contact_id as first level
     * and date as second level
     *
     * @param  {Array} leaveRequestsList
     * @return {Promise}
     */
    function indexLeaveRequests (leaveRequestsList) {
      leaveRequestsList.forEach(function (leaveRequest) {
        var days = leaveRequestDays(leaveRequest);

        leaveRequests[leaveRequest.contact_id] = leaveRequests[leaveRequest.contact_id] || {};

        days.forEach(function (day) {
          leaveRequests[leaveRequest.contact_id][day.date] = leaveRequest;
        });
      });

      return $q.resolve();
    }

    /**
     * Initializes the event listeners
     */
    function initListeners () {
      eventListeners.push($rootScope.$on('LeaveCalendar::showMonths', showMonthIfInList));
      eventListeners.push(pubSub.subscribe('LeaveRequest::new', addLeaveRequest));
      eventListeners.push(pubSub.subscribe('LeaveRequest::edit', updateLeaveRequest));
      eventListeners.push(pubSub.subscribe('LeaveRequest::updatedByManager', updateLeaveRequest));
      eventListeners.push(pubSub.subscribe('LeaveRequest::delete', deleteLeaveRequest));
      eventListeners.push(pubSub.subscribe('LeaveRequest::statusUpdate', function (statusUpdate) {
        if (statusUpdate.status === 'delete') {
          deleteLeaveRequest(statusUpdate.leaveRequest);
        } else {
          updateLeaveRequest(statusUpdate.leaveRequest);
        }
      }));
    }

    /**
     * Returns whether a date is of a specific type
     * half_day_am or half_day_pm
     *
     * @param  {String} typeName
     * @param  {object} leaveRequest
     * @param  {String} date
     *
     * @return {boolean}
     */
    function isDayType (typeName, leaveRequest, date) {
      var dayType = vm.supportData.dayTypes[typeName];

      if (moment(date).isSame(leaveRequest.from_date, 'day')) {
        return dayType.value === leaveRequest.from_date_type;
      }

      if (moment(date).isSame(leaveRequest.to_date, 'day')) {
        return dayType.value === leaveRequest.to_date_type;
      }
    }

    /**
     * Returns whether a leaveRequest is of the sent leave type
     *
     * @param  {object} leaveRequest
     * @param  {String} leaveType
     * @return {boolean}
     */
    function isLeaveType (leaveRequest, leaveType) {
      return leaveRequest.request_type === leaveType;
    }

    /**
     * Checks whether sent date is a public holiday
     *
     * @param  {String} date
     * @return {boolean}
     */
    function isPublicHoliday (date) {
      return !!vm.supportData.publicHolidays[dateObjectWithFormat(date).valueOf()];
    }

    /**
     * Checks whether a leaveRequest is pending approval or more information requested
     *
     * @param  {object} leaveRequest
     * @return {boolean}
     */
    function isRequested (leaveRequest) {
      var statusName = vm.supportData.leaveRequestStatuses[leaveRequest.status_id].name;

      return _.contains([
        sharedSettings.statusNames.awaitingApproval,
        sharedSettings.statusNames.moreInformationRequired
      ], statusName);
    }

    /**
     * Returns the list of day objects corresponding to the dates the
     * given leave request spans
     *
     * @param  {LeaveRequestInstance} leaveRequest
     * @return {Array}
     */
    function leaveRequestDays (leaveRequest) {
      var days = [];
      var pointerDate = moment(leaveRequest.from_date).clone();
      var toDate = moment(leaveRequest.to_date);

      while (pointerDate.isSameOrBefore(toDate)) {
        // Ensure that pointerDate is in same month/year that component represents
        if (pointerDate.month() === vm.month.index && pointerDate.year() === vm.month.year) {
          days.push(_.find(vm.month.days, function (day) {
            return day.date === pointerDate.format('YYYY-MM-DD');
          }));
        }

        pointerDate.add(1, 'day');
      }

      return days;
    }

    /**
     * Finds the given leave request in the internal indexed list
     *
     * @param  {LeaveRequestInstance} leaveRequest
     * @return {LeaveRequestInstance}
     */
    function leaveRequestFromIndexedList (leaveRequest) {
      return _.find(leaveRequests[leaveRequest.contact_id], function (leaveRequestObj) {
        return leaveRequest.id === leaveRequestObj.id;
      });
    }

    /**
     * Returns leave status value from name
     *
     * @param {String} name - name of the leave status
     * @returns {int/null}
     */
    function leaveRequestStatusValueFromName (name) {
      var leaveStatus = _.find(vm.supportData.leaveRequestStatuses, function (status) {
        return status.name === name;
      });

      return leaveStatus ? leaveStatus.value : null;
    }

    /**
     * Returns the list of leave status's which would be displayed
     * on the calendar
     *
     * @returns {array}
     */
    function leaveStatusesToBeDisplayed () {
      return [
        leaveRequestStatusValueFromName(sharedSettings.statusNames.approved),
        leaveRequestStatusValueFromName(sharedSettings.statusNames.adminApproved),
        leaveRequestStatusValueFromName(sharedSettings.statusNames.awaitingApproval),
        leaveRequestStatusValueFromName(sharedSettings.statusNames.moreInformationRequired)
      ];
    }

    /**
     * Loads the work pattern calendar and the leave request of the month,
     * then it process the data onto each day of the month
     *
     * @return {Promise}
     */
    function loadMonthData () {
      vm.month.loading = true;

      return $q.all([
        loadMonthWorkPatternCalendars(),
        loadMonthLeaveRequests()
      ])
      .then(reduceContacts)
      .then(setMonthDaysContactData)
      .then(function () {
        dataLoaded = true;
      })
      .then(function () {
        vm.month.loading = false;
      });
    }

    /**
     * Loads the approved/pending leave requests of the month, limited
     * to the calendar contacts. It then indexes the leave requests
     *
     * @return {Promise}
     */
    function loadMonthLeaveRequests () {
      return LeaveRequest.all({
        from_date: { to: vm.month.days[vm.month.days.length - 1].date },
        to_date: { from: vm.month.days[0].date },
        status_id: { 'IN': leaveStatusesToBeDisplayed() },
        contact_id: { 'IN': vm.contacts.map(function (contact) {
          return contact.id;
        })},
        type_id: { IN: _.pluck(vm.supportData.absenceTypes, 'id') }
      }, null, null, null, false)
      .then(function (leaveRequestsData) {
        return indexLeaveRequests(leaveRequestsData.list);
      });
    }

    /**
     * Loads the month's calendar of each contact
     *
     * @return {Promise}
     */
    function loadMonthWorkPatternCalendars () {
      var monthStartDate = vm.month.days[0].date;
      var monthEndDate = vm.month.days[vm.month.days.length - 1].date;

      return Calendar.get(vm.contacts.map(function (contact) {
        return contact.id;
      }), monthStartDate, monthEndDate)
      .then(function (monthCalendars) {
        calendars = _.indexBy(monthCalendars, 'contact_id');
      });
    }

    /**
     * Removes the given leave request from the internal indexed list
     *
     * @param  {LeaveRequestInstance} leaveRequest
     */
    function removeLeaveRequestFromIndexedList (leaveRequest) {
      leaveRequests[leaveRequest.contact_id] = _.omit(
        leaveRequests[leaveRequest.contact_id],
        function (leaveRequestObj) {
          return leaveRequestObj.id === leaveRequest.id;
        }
      );
    }

    /**
     * Event handler for when the component is destroyed
     */
    function onDestroy () {
      $rootScope.$emit('LeaveCalendar::monthDestroyed');

      eventListeners.map(function (destroyListener) {
        destroyListener.remove
          ? destroyListener.remove() // Destroy pubSub subscription
          : destroyListener(); // Destroy $scope.$on subscription
      });
    }

    /**
     * Sets the properties of the given day, for the contact with the given id
     *
     * @param {Object} day
     * @param {String} contactId
     * @param {Boolean} leaveRequestPropertiesOnly updates only properties
     *   related to the contact's leave request on the day (if any)
     */
    function setDayContactData (day, contactId, leaveRequestPropertiesOnly) {
      var promise, workPatternCalendar;

      day.contactsData[contactId] = day.contactsData[contactId] || {};

      workPatternCalendar = contactMonthWorkPatternCalendar(contactId);

      promise = (leaveRequestPropertiesOnly === true) ? $q.resolve() : $q.all([
        workPatternCalendar.isWeekend(dateObjectWithFormat(day.date)),
        workPatternCalendar.isNonWorkingDay(dateObjectWithFormat(day.date))
      ])
      .then(function (results) {
        _.assign(day.contactsData[contactId], {
          isWeekend: results[0],
          isNonWorkingDay: results[1],
          isPublicHoliday: isPublicHoliday(day.date)
        });
      });

      return promise.then(function () {
        return leaveRequests[contactId] ? leaveRequests[contactId][day.date] : null;
      })
      .then(function (leaveRequest) {
        _.assign(day.contactsData[contactId], {
          leaveRequest: leaveRequest || null,
          styles: leaveRequest ? styles(leaveRequest) : null,
          isAccruedTOIL: leaveRequest ? isLeaveType(leaveRequest, 'toil') : null,
          isRequested: leaveRequest ? isRequested(leaveRequest) : null,
          isAM: leaveRequest ? isDayType('half_day_am', leaveRequest, day.date) : null,
          isPM: leaveRequest ? isDayType('half_day_pm', leaveRequest, day.date) : null
        });
      });
    }

    /**
     * It sets the properties of every day of the month
     *
     * @return {Promise}
     */
    function setMonthDaysContactData () {
      return $q.all(vm.month.days.map(function (day) {
        return $q.all(vm.contacts.map(function (contact) {
          return setDayContactData(day, contact.id);
        }));
      }));
    }

    /**
     * Show the month and its data if it's included in the given list
     *
     * @param  {Array} monthsToShow
     * @param  {Boolean} forceReload If true it forces the reload of the data
     */
    function showMonthIfInList (__, monthsToShow, forceReload) {
      var isIncluded = !!_.find(monthsToShow, function (month) {
        return month.index === vm.month.index;
      });

      if (isIncluded) {
        vm.currentPage = 0;
        vm.visible = true;

        (forceReload || !dataLoaded) && loadMonthData();
      } else {
        vm.visible = false;
      }
    }

    /**
     * Returns the styles for a specific leaveRequest
     * which will be used in the view for each date
     *
     * @param  {Object} leaveRequest
     * @return {Object}
     */
    function styles (leaveRequest) {
      var absenceType = _.find(vm.supportData.absenceTypes, function (absenceType) {
        return absenceType.id === leaveRequest.type_id;
      });

      return leaveRequest.balance_change > 0
        ? { borderColor: absenceType.color }
        : { borderColor: absenceType.color, backgroundColor: absenceType.color };
    }

    /**
     * Updates the given leave request in the calendar
     * For simplicity's sake, it directly deletes it and re-adds it
     *
     * @param  {LeaveRequestInstance} leaveRequest
     */
    function updateLeaveRequest (leaveRequest) {
      var oldLeaveRequest = leaveRequestFromIndexedList(leaveRequest);

      if (!oldLeaveRequest) {
        return;
      }

      deleteLeaveRequest(oldLeaveRequest);

      if (leaveStatusesToBeDisplayed().indexOf(leaveRequest.status_id) !== -1) {
        addLeaveRequest(leaveRequest);
      }
    }

    /**
     * Updates the properties of the days that the given leave request spans
     *
     * @param  {LeaveRequestInstance} leaveRequest
     * @return {Promise}
     */
    function updateLeaveRequestDaysContactData (leaveRequest) {
      return $q.all(leaveRequestDays(leaveRequest).map(function (day) {
        return setDayContactData(day, leaveRequest.contact_id, true);
      }));
    }
  }
});
