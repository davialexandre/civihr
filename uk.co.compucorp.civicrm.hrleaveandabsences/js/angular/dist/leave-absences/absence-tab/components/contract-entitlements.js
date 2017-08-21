define(["common/lodash","common/moment","leave-absences/absence-tab/modules/components","common/models/contract"],function(t,n,e){function o(e,o,a,c,r,i){function s(t){var e=a.DATE_FORMAT.toUpperCase();return t?n(t).format(e):""}function l(){return c.all().then(function(t){d.absenceTypes=t})}function u(){return r.all({contact_id:d.contactId}).then(function(t){m(t)})}function m(e){d.contracts=t.sortBy(e,function(t){return n(t.info.details.period_start_date)}).map(function(n){var e=n.info,o=e.details,a=t.map(d.absenceTypes,function(n){var o=t.filter(e.leave,function(t){return t.leave_type===n.id})[0];return{amount:o?o.leave_amount:""}});return{position:o.position,start_date:s(o.period_start_date),end_date:s(o.period_end_date),absences:a}})}e.debug("Component: contract-entitlements");var d=Object.create(this);return d.absenceTypes=[],d.contracts=[],d.loading={contracts:!0},function(){return o.all([l(),i.getDateFormat()]).then(function(){return u()}).finally(function(){d.loading.contracts=!1})}(),d}e.component("contractEntitlements",{bindings:{contactId:"<"},templateUrl:["settings",function(t){return t.pathTpl+"components/contract-entitlements.html"}],controllerAs:"entitlements",controller:["$log","$q","HR_settings","AbsenceType","Contract","DateFormat",o]})});