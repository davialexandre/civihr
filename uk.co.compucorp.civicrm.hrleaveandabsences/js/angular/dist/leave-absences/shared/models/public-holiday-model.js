define(["leave-absences/shared/modules/models","common/moment","leave-absences/shared/models/instances/public-holiday-instance","leave-absences/shared/apis/public-holiday-api","common/models/model","common/services/hr-settings"],function(e,n){"use strict";e.factory("PublicHoliday",["$log","Model","PublicHolidayAPI","PublicHolidayInstance","shared-settings",function(e,i,l,a,o){return e.debug("PublicHoliday"),i.extend({all:function(n){return e.debug("PublicHoliday.all",n),l.all(n).then(function(e){return e.map(function(e){return a.init(e,!0)})})},isPublicHoliday:function(i){e.debug("PublicHoliday.isPublicHoliday",i);var a=n(i).format(o.serverDateFormat),t={date:a};return l.all(t).then(function(e){return!!e.length})}})}])});