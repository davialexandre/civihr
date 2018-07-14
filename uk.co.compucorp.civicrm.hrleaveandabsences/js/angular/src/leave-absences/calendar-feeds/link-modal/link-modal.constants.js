/* eslint-env amd */
/* global Drupal */

(function (Drupal) {
  define([
    'common/angular'
  ], function (angular) {
    'use strict';

    angular.module('calendar-feeds.link-modal.constants', [])
      .constant('HOST_URL', Drupal.absoluteUrl('/'));
  });
}(Drupal));
