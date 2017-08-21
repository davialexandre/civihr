define(["common/lodash","common/moment","leave-absences/shared/modules/models-instances","common/models/instances/instance"],function(n,e,t){"use strict";t.factory("CalendarInstance",["$log","ModelInstance","shared-settings",function(t,a,o){function r(n,e){var t=this.days[s(n).valueOf()];return!!t&&t.type.name===e}function s(n){return e(n,o.serverDateFormat).clone()}return a.extend({transformAttributes:function(e){var t={};return e.calendar.forEach(function(n){t[s(n.date).valueOf()]=n}),n(e).omit("calendar").assign({days:t}).value()},defaultCustomData:function(){return{days:[]}},isWorkingDay:function(n){return r.call(this,n,"working_day")},isNonWorkingDay:function(n){return r.call(this,n,"non_working_day")},isWeekend:function(n){return r.call(this,n,"weekend")}})}])});