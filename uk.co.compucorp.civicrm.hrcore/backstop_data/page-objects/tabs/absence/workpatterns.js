var page = require('./../../page');

module.exports = (function () {
  return page.extend({
    /**
     * Wait for the page to be ready
     */
    waitForReady: function () {
      var casper = this.casper;
      casper.click('[heading="Work Patterns"] > a');
      casper.waitUntilVisible('absence-tab-work-patterns table');
    }
  });
})();
