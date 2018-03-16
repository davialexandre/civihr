var Promise = require('es6-promise').Promise;
var page = require('./page');

module.exports = (function () {
  var taskSelector = '.ct-list-task > li:nth-child(1)';
  var editableSelectors = {
    assigned: '[editable-ui-select="task.assignee_contact_id[0]"]',
    date: '[editable-bsdate="task.activity_date_time"]',
    subject: '[editable-text="task.subject"]',
    target: '[editable-ui-select="task.target_contact_id[0]"]'
  };

  return page.extend({

    /**
     * Shows the assignment modal
     *
     * @return {Promise} resolves with the assignment modal page object
     */
    addAssignment: function () {
      return new Promise(function (resolve) {
        this.chromy.click('a[ng-click*="modalAssignment"]');
        resolve(this.waitForModal('assignment'));
      }.bind(this));
    },

    /**
     * Shows the task modal
     *
     * @return {Promise} resolves with the task modal page object
     */
    addTask: function () {
      return new Promise(function (resolve) {
        this.chromy.click('a[ng-click*="itemAdd"]');
        resolve(this.waitForModal('task'));
      }.bind(this));
    },

    /**
     * Opens the advanced filters
     *
     * @return {object}
     */
    advancedFilters: function () {
      this.chromy.click('a[ng-click*="isCollapsed.filterAdvanced"]');
      this.chromy.wait(500);

      return this;
    },

    /**
     * Shows the given edit-in-place field
     *
     * @param {string} fieldName
     * @return {object}
     */
    inPlaceEdit: function (fieldName) {
      this.chromy.click(editableSelectors[fieldName]);
      this.chromy.wait(200);

      return this;
    },

    /**
     * Opens the first task of the list
     *
     * @return {Promise} resolves with the task modal page object
     */
    openTask: function () {
      return new Promise(function (resolve) {
        this.chromy.click(taskSelector + ' .task-title > a[ng-click*="modalTask"]');
        this.chromy.wait(function () {
          // = waitWhileVisible
          var dom = document.querySelector('.spinner');
          return dom === null || (dom.offsetWidth <= 0 && dom.offsetHeight <= 0);
        });

        resolve(this.waitForModal('task'));
      }.bind(this));
    },

    /**
     * Shows the "select dates" filter
     */
    selectDates: function () {
      this.chromy.click('.ct-select-dates');
      this.chromy.wait(500);
    },

    /**
     * Expands the "show more" area of the first task of the list
     *
     * @return {object}
     */
    showMore: function () {
      this.chromy.click(taskSelector + ' a[ng-click*="isCollapsed"]');
      this.chromy.waitUntilVisible(taskSelector + ' article');
      this.chromy.wait(500);

      return this;
    },

    /**
     * Shows the dropdown of the actions available on any given task
     *
     * @return {object}
     */
    taskActions: function () {
      this.chromy.click(taskSelector + ' .ct-context-menu-toggle');

      return this;
    },

    /**
     * Waits until the specified select is visible on the page
     */
    waitForReady: function () {
      this.chromy.waitUntilVisible('.ct-container-inner');
      this.chromy.wait(300);
    }
  });
})();
