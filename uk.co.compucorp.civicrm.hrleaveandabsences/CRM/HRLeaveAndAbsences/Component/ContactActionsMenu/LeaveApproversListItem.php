<?php

use CRM_HRContactActionsMenu_Component_GroupItem as ActionsGroupItemInterface;
use CRM_HRLeaveAndAbsences_Service_LeaveManager as LeaveManagerService;

/**
 * Class CRM_HRLeaveAndAbsences_Component_ContactActionsMenu_LeaveApproversListItem
 */
class CRM_HRLeaveAndAbsences_Component_ContactActionsMenu_LeaveApproversListItem
  implements ActionsGroupItemInterface {

  /**
   * @var array
   */
  private $leaveApprovers;

  /**
   * LeaveApproversListItem constructor.
   *
   * @param array $leaveApprovers
   */
  public function __construct(array $leaveApprovers) {
    $this->leaveApprovers = $leaveApprovers;
  }

  /**
   * {@inheritdoc}
   */
  public function render() {
    $markup = '<h4>Leave Approver(s): </h4>';

    foreach($this->leaveApprovers as $contactID => $contactName) {
      $markup .= '<p><a href="/civicrm/contact/view?reset=1&cid=' . $contactID . '" class="text-primary"> 
        ' . $contactName . ' </a></p>';
    }

    return $markup;
  }
}
