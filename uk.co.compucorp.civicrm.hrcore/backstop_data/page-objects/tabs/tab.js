var page = require('../page');

module.exports = page.extend({
  /**
   * Defines that the tab is ready when the a specific selector is visible
   * @return {boolean}
   */
  waitForReady: function () {
    this.chromy.waitUntilVisible(this.readySelector);
  }
});
