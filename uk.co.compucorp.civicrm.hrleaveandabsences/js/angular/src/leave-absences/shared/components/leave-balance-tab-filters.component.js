/* eslint-env amd */

define([
  'common/lodash',
  'common/moment',
  'leave-absences/shared/modules/components'
], function (_, moment, components) {
  components.component('leaveBalanceTabFilters', {
    controller: LeaveBalanceTabFiltersController,
    controllerAs: 'balanceFilters',
    bindings: {
      absencePeriods: '<',
      absenceTypes: '<',
      loggedInContactId: '<',
      lookupContacts: '<',
      userRole: '<'
    },
    templateUrl: ['shared-settings', function (sharedSettings) {
      return sharedSettings.sharedPathTpl + 'components/leave-balance-tab-filters.html';
    }]
  });

  LeaveBalanceTabFiltersController.$inject = ['$scope'];

  function LeaveBalanceTabFiltersController ($scope) {
    var vm = this;

    vm.filters = { period_id: null, type_id: null, managed_by: null };

    vm.$onChanges = $onChanges;
    vm.labelPeriod = labelPeriod;
    vm.submitFilters = submitFilters;

    /**
     * Angular Hook that Watches over changes in the bindings for absence
     * periods and types, and selects the default values for the filter.
     * It also emits an the filters change event when the filters have
     * value for the first time.
     *
     * @param {Object} changes - The list of changes for current digest.
     */
    function $onChanges (changes) {
      if (changes.absencePeriods && vm.absencePeriods.length) {
        vm.filters.period_id = getCurrentAbsencePeriod().id;
      }

      if (changes.absenceTypes && vm.absenceTypes.length) {
        vm.filters.type_id = getFirstAbsenceTypeByTitle().id;
      }

      if (changes.loggedInContactId || changes.userRole) {
        vm.filters.managed_by = (vm.userRole === 'manager'
          ? vm.loggedInContactId : undefined);
      }

      if (areFiltersReady()) {
        vm.submitFilters();
      }
    }

    /**
     * Returns true when all filters have an initial value.
     *
     * @return {Boolean}
     */
    function areFiltersReady () {
      return _.every(vm.filters, function (filterValue) {
        return filterValue !== null;
      });
    }

    /**
     * Returns the current absence period. If there are none, it returns the
     * newest one.
     *
     * @return {Object}
     */
    function getCurrentAbsencePeriod () {
      var currentAbsencePeriod = _.find(vm.absencePeriods, function (period) {
        return period.current;
      });

      return currentAbsencePeriod ||
        vm.absencePeriods.reduce(function (periodA, periodB) {
          return moment(periodA.end_date).isAfter(periodB.end_date)
            ? periodA
            : periodB;
        });
    }

    /**
     * Returns the first absence type sorted by title.
     *
     * @return {Object}
     */
    function getFirstAbsenceTypeByTitle () {
      return vm.absenceTypes.reduce(function (typeA, typeB) {
        return typeA.title.localeCompare(typeB.title) ? typeA : typeB;
      });
    }

    /**
     * Labels the given period according to whether it's current or not
     *
     * @param  {AbsencePeriodInstance} period
     * @return {string}
     */
    function labelPeriod (period) {
      return period.current ? 'Current Period (' + period.title + ')' : period.title;
    }

    /**
     * Emits the "Filters Update" event, passing the filter values to the parent
     * component.
     */
    function submitFilters () {
      $scope.$emit('LeaveBalanceFilters::update', vm.filters);
    }
  }
});
