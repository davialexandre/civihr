/* eslint-env amd */

define(function () {
  'use strict';

  hrjcLoader.__name = 'hrjcLoader';
  hrjcLoader.$inject = ['$log', '$rootScope'];

  function hrjcLoader ($log, $rootScope) {
    $log.debug('Directive: hrjcLoader');

    return {
      link: function ($scope, el, attrs) {
        var loader = document.createElement('div');
        var loaderSet = false;
        var positionSet = false;

        loader.className = 'hrjc-loader spinner';

        function isPositioned () {
          var elPosition = window.getComputedStyle(el[0]).position;
          return elPosition === 'relative' || elPosition === 'absolute' || elPosition === 'fixed';
        }

        function appendLoader () {
          if (!isPositioned()) {
            el.css('position', 'relative');
            positionSet = true;
          }

          el.append(loader);
          loaderSet = true;
        }

        function removeLoader () {
          loaderSet && loader.parentNode.removeChild(loader);
          loaderSet = false;

          if (positionSet) {
            el.css('position', '');
          }
        }

        if (attrs.hrjcLoaderShow) {
          appendLoader();
        }

        $scope.$on('hrjc-loader-show', function () {
          appendLoader();
        });

        $scope.$on('hrjc-loader-hide', function () {
          removeLoader();
        });
      }
    };
  }

  return hrjcLoader;
});
