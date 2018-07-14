/* globals Event */

var _ = require('lodash');
var Promise = require('es6-promise').Promise;
var page = require('./page');

module.exports = (function () {
  return page.extend({

    /**
     * Selects the days mode for the opened leave request
     *
     * @param  {String} mode single|multiple
     * @return {Promise}
     */
    changeRequestDaysMode: function (mode) {
      var casper = this.casper;
      var optionIndex = ['multiple', 'single'].indexOf(mode) + 1;

      casper.then(function () {
        casper.click('[ng-model="detailsTab.uiOptions.multipleDays"]:nth-child(' + optionIndex + ')');
      });

      return this;
    },

    /**
     * User clicks on the edit/respond action
     *
     * @param {Number} row number corresponding to leave request in the list
     * @return {Promise}
     */
    editRequest: function (row) {
      var casper = this.casper;

      return new Promise(function (resolve) {
        casper.then(function () {
          casper.click('body > ul.dropdown-menu:nth-of-type(' + (row || 1) + ') li:first-child a');
          // As there are multiple spinners it takes more time to load up
          casper.waitWhileVisible('.modal-content .spinner:nth-child(1)');
          casper.waitWhileVisible('leave-request-popup-details-tab .spinner');
          resolve(this.waitForModal('ssp-leave-request', '.chr_leave-request-modal__form'));
        }.bind(this));
      }.bind(this));
    },

    /**
     * Expands deduction field to show selectors
     *
     * @param  {String} type from|to
     * @return {Promise}
     */
    expandDeductionField: function (type) {
      var casper = this.casper;
      var fieldSelector = '[ng-switch="detailsTab.uiOptions.times.' + type + '.amountExpanded"] a';

      casper.then(function () {
        casper.waitForSelector(fieldSelector, function () {
          casper.click(fieldSelector);
        });
      });

      return this;
    },

    /**
     * Opens the Leave Request Modal for a new request of the given type
     *
     * @param  {String} requestType leave|sickness|toil
     * @return {Promise}
     */
    newRequest: function (requestType) {
      var casper = this.casper;
      var requestTypes = ['leave', 'sickness', 'toil']; // must be in the same quantity and order as in UI
      var requestTypeButtonIndex = requestTypes.indexOf(requestType) + 1;
      var actionDropdownSelector = 'leave-request-record-actions';
      var actionButtonSelector = actionDropdownSelector + ' .dropdown-menu a:nth-child(' + requestTypeButtonIndex + ')';

      casper.then(function () {
        casper.click(actionDropdownSelector + ' [uib-dropdown] > button');
        casper.waitForSelector(actionButtonSelector, function () {
          casper.click(actionButtonSelector);
          casper.waitUntilVisible('.chr_leave-request-modal__tab .form-group');
        });
      });

      return this;
    },

    /**
     * Opens the dropdown for staff actions like edit/respond, cancel.
     *
     * @param {Number} row number corresponding to leave request in the list
     * @return {Object} this object
     */
    openActionsForRow: function (row) {
      var casper = this.casper;

      casper.then(function () {
        casper.waitForSelector('tr:nth-child(1)  div[uib-dropdown] a:nth-child(1)', function () {
          casper.click('div:nth-child(2) > div > table > tbody > tr:nth-child(' + (row || 1) + ')  div[uib-dropdown] a:nth-child(1)');
        });
      });

      return this;
    },

    /**
     * Opens the given section of my report pageName
     *
     * @param {String} section
     * @return {Object} this object
     */
    openSection: function (section) {
      var casper = this.casper;

      casper.then(function () {
        casper.click('td[ng-click="report.toggleSection(\'' + section + '\')"]');
        casper.waitWhileVisible('.spinner');
      });

      return this;
    },

    /**
     * Selects the request Absence Type by the given label
     *
     * @param  {String} absenceTypeLabel ex. "Holiday in Hours"
     * @return {Promise}
     */
    selectRequestAbsenceType: function (absenceTypeLabel) {
      var absenceTypeSelect;
      var casper = this.casper;

      casper.then(function () {
        casper.evaluate(function (absenceTypeLabel) {
          absenceTypeSelect = document.querySelector('[name=absenceTypeSelect]');

          absenceTypeSelect.selectedIndex = _.findIndex(absenceTypeSelect.querySelectorAll('option'), function (option) {
            return option.text.search(absenceTypeLabel) !== -1;
          }); // Select the needed option
          absenceTypeSelect.dispatchEvent(new Event('change')); // Trigger onChange event
        }, absenceTypeLabel);
      });

      return this;
    },

    /**
     * Selects a date in the datepicker
     *
     * @param  {String} type from|to
     * @param  {Number} weekPosition eg. 2 for second week in the calendar
     * @param  {Number} weekDayPosition eg. 1 for Monday or 4 for Thursday
     * @return {Promise}
     */
    selectRequestDate: function (type, weekPosition, weekDayPosition) {
      var casper = this.casper;
      var daySelector = '.uib-daypicker tr:nth-child(' +
        weekPosition + ') td:nth-child( ' + weekDayPosition + ') button';

      casper.then(function () {
        casper.click('[ng-model="detailsTab.uiOptions.' + type + 'Date"]');
        casper.waitForSelector(daySelector, function () {
          casper.click(daySelector);
          casper.waitUntilVisible('[ng-switch="detailsTab.uiOptions.times.' + type + '.amountExpanded"]');
        });
      });

      return this;
    },

    /**
     * Wait for the page to be ready
     *
     * @return {Object} this object
     */
    waitForReady: function () {
      this.waitUntilVisible('td[ng-click="report.toggleSection(\'pending\')"]');
    },

    /**
     * Waits for the request balance to be calculated
     *
     * @return {Promise}
     */
    waitUntilRequestBalanceIsCalculated: function () {
      var casper = this.casper;

      casper.then(function () {
        casper.waitUntilVisible('[ng-show="detailsTab.uiOptions.showBalance"]');
      });

      return this;
    }
  });
})();
