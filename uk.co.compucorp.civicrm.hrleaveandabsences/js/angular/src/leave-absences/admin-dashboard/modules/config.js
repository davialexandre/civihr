/* eslint-env amd */

define([
  'common/angular',
  'common/lodash',
  'leave-absences/admin-dashboard/modules/settings'
], function (angular, _) {
  return angular.module('admin-dashboard.config', ['admin-dashboard.settings'])
    .config([
      '$stateProvider', '$resourceProvider', '$urlRouterProvider', '$httpProvider',
      '$logProvider', '$analyticsProvider', 'settings',
      function ($stateProvider, $resourceProvider, $urlRouterProvider, $httpProvider,
        $logProvider, $analyticsProvider, settings) {
        var toResolve = {
          format: ['DateFormat', function (DateFormat) {
            return DateFormat.getDateFormat();
          }]
        };

        $resourceProvider.defaults.stripTrailingSlashes = false;
        $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        configureAnalytics($analyticsProvider);
        $logProvider.debugEnabled(settings.debug);
        $urlRouterProvider.otherwise('/requests');

        $stateProvider
          .state('requests', {
            url: '/requests',
            template: '<manage-leave-requests contact-id="$root.settings.contactId"></manage-leave-requests>',
            resolve: toResolve
          })
          .state('calendar', {
            url: '/calendar',
            template: '<leave-calendar contact-id="$root.settings.contactId"></leave-calendar>',
            resolve: toResolve
          })
          .state('leave-balances', {
            url: '/leave-balances',
            template: '<leave-balance-tab></leave-balance-tab>',
            resolve: toResolve
          });
      }
    ]);

  /**
   * Configures Google Analytics via the angulartics provider
   *
   * @param {Object} $analyticsProvider
   */
  function configureAnalytics ($analyticsProvider) {
    $analyticsProvider.settings.ga = {
      userId: _.get(CRM, 'vars.session.contact_id')
    };

    $analyticsProvider.withAutoBase(true);
  }
});
