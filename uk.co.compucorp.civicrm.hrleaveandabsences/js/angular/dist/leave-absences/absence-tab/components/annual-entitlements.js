!function(n){define(["common/lodash","common/moment","leave-absences/absence-tab/modules/components","common/models/contact"],function(e,t,o){function r(o,r,a,i,c,u){function l(){return i.all().then(f)}function m(){return a.all().then(function(n){b.absenceTypes=n})}function s(){var n=e.uniq(e.map(_,function(n){return n.comment_author_id}));return u.all({id:{IN:n}}).then(function(n){h=e.indexBy(n.list,"contact_id")})}function d(){return c.all({contact_id:b.contactId}).then(function(n){_=n})}function f(n){var o=e.uniq(e.map(_,function(n){return n.period_id}));n=e.filter(n,function(n){return o.indexOf(n.id)!==-1}),n=e.sortBy(n,function(n){return-t(n.start_date).valueOf()}),b.absencePeriods=e.map(n,function(n){var t=e.map(b.absenceTypes,function(t){var o=e.filter(_,function(e){return e.type_id===t.id&&e.period_id===n.id})[0];return o?{amount:o.value,comment:o.comment?{message:o.comment,author_name:h[o.comment_author_id].display_name,date:o.comment_date}:null}:null});return{period:n.title,entitlements:t}})}function p(e){var t="civicrm/admin/leaveandabsences/periods/manage_entitlements",o="civicrm/contact/view",r=n.url(o,{cid:e,selectedChild:"absence"});return n.url(t,{cid:e,returnUrl:r})}o.debug("Component: annual-entitlements");var b=Object.create(this),h=[],_=[];return b.absencePeriods=[],b.absenceTypes=[],b.loading={absencePeriods:!0},b.editEntitlementsPageUrl=p(b.contactId),function(){return r.all([m(),d()]).then(function(){return s()}).then(function(){return l()}).finally(function(){b.loading.absencePeriods=!1})}(),b.showComment=function(e){var o=e.message+"<br/><br/><strong>Last updated:<br/>By: "+e.author_name+"<br/>Date: "+t(e.date).format("DD/M/YYYY HH.mm")+"</strong>";n.alert(o,"Calculation comment:","error")},b}o.component("annualEntitlements",{bindings:{contactId:"<"},templateUrl:["settings",function(n){return n.pathTpl+"components/annual-entitlements.html"}],controllerAs:"entitlements",controller:["$log","$q","AbsenceType","AbsencePeriod","Entitlement","Contact",r]})})}(CRM);