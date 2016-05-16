{*
 +--------------------------------------------------------------------+
 | CiviHR version 1.4                                                |
 +--------------------------------------------------------------------+
 | Copyright CiviCRM LLC (c) 2004-2014                                |
 +--------------------------------------------------------------------+
 | This file is a part of CiviCRM.                                    |
 |                                                                    |
 | CiviCRM is free software; you can copy, modify, and distribute it  |
 | under the terms of the GNU Affero General Public License           |
 | Version 3, 19 November 2007 and the CiviCRM Licensing Exception.   |
 |                                                                    |
 | CiviCRM is distributed in the hope that it will be useful, but     |
 | WITHOUT ANY WARRANTY; without even the implied warranty of         |
 | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.               |
 | See the GNU Affero General Public License for more details.        |
 |                                                                    |
 | You should have received a copy of the GNU Affero General Public   |
 | License and the CiviCRM Licensing Exception along                  |
 | with this program; if not, contact CiviCRM LLC                     |
 | at info[AT]civicrm[DOT]org. If you have questions about the        |
 | GNU Affero General Public License or the licensing of CiviCRM,     |
 | see the CiviCRM license FAQ at http://civicrm.org/licensing        |
 +--------------------------------------------------------------------+
*}
{* API Import Wizard - Step 1 (upload data file) *}
{* @var $form Contains the array for the form elements and other form associated information assigned to the template by the controller *}

<div class="crm-block crm-form-block crm-api-import-uploadfile-form-block">
 {* WizardHeader.tpl provides visual display of steps thru the wizard as well as title for current step *}
 {include file="CRM/common/WizardHeader.tpl"}

 <div id="help">
    {ts}The API Import Wizard allows you to easily upload data against any API create method from other applications into CiviCRM.{/ts}
    {ts}Files to be imported must be in the 'comma-separated-values' format (CSV) and must contain data needed to match the data to an existing record in your CiviCRM database.{/ts} {help id='upload'}
 </div>
 <div id="upload-file" class="form-item">
 <div class="crm-submit-buttons">{include file="CRM/common/formButtons.tpl" location="top"}</div>
   <table class="form-layout">
     <tr class="crm-api-import-entity-form-block-entity">
       <td class="label">{$form.entity.label}</td>
       <td>{$form.entity.html}</td>
     </tr>
    <tr class="crm-api-import-uploadfile-form-block-uploadFile">
      <td class="label">{$form.uploadFile.label}</td>
      <td>{$form.uploadFile.html}<br />
      <span class="description">
        {ts}File format must be comma-separated-values (CSV).{/ts}
      </span>
    </td>
  </tr>
  <tr>
    <td>&nbsp;</td>
      <td>{ts 1=$uploadSize}Maximum Upload File Size: %1 MB{/ts}</td>
        </tr>
  <tr class="crm-import-form-block-skipColumnHeader">
            <td>&nbsp;</td>
            <td>{$form.skipColumnHeader.html} {$form.skipColumnHeader.label}<br />
                <span class="description">
                    {ts}Check this box if the first row of your file consists of field names (Example: "Contact ID", "Participant Role").{/ts}
                </span>
            </td>
  </tr>
   <tr class="crm-import-form-block-importMode">
       <td class="label">{$form.importMode.label}</td>
       <td>{$form.importMode.html}</td>
       </td>
   </tr>
  <tr class="crm-api-import-uploadfile-form-block-onDuplicate">
            <td class="label">{$form.onDuplicate.label}</td>
      <td>{$form.onDuplicate.html}</td>
        </tr>
  <tr class="crm-api-import-uploadfile-form-block-date_format">
            {include file="CRM/Core/Date.tpl"}
  </tr>
  {if $savedMapping}
  <tr class="crm-api-import-uploadfile-form-block-savedMapping">
              <td class="label">{if $loadedMapping}{ts}Select a Different Field Mapping{/ts}{else}{ts}Load Saved Field Mapping{/ts}{/if}</dt>
              <td><span>{$form.savedMapping.html}</span> </td>
  </tr>
  <tr>
            <td>&nbsp;</td>
            <td class="description">{ts}Select Saved Mapping, or leave blank to create a new mapping.{/ts}</td>
        {/if}
        </tr>
    </table>
    <div class="crm-submit-buttons">{include file="CRM/common/formButtons.tpl" location="bottom"}</div>
  </div>
 </div>
