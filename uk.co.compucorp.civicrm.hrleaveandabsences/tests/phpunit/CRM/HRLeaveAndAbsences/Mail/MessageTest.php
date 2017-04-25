<?php

use CRM_HRLeaveAndAbsences_BAO_NotificationReceiver as NotificationReceiver;
use  CRM_HRLeaveAndAbsences_Mail_Message as Message;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequest as LeaveRequest;
use CRM_HRCore_Test_Fabricator_Contact as ContactFabricator;
use CRM_HRLeaveAndAbsences_Factory_RequestNotificationTemplate as RequestNotificationTemplateFactory;


/**
 * Class CRM_HRLeaveAndAbsences_Mail_MessageTest
 *
 * @group headless
 */
class CRM_HRLeaveAndAbsences_Mail_MessageTest extends BaseHeadlessTest {

  use CRM_HRLeaveAndAbsences_LeaveRequestHelpersTrait;
  use CRM_HRLeaveAndAbsences_LeaveManagerHelpersTrait;
  use CRM_HRLeaveAndAbsences_MessageHelpersTrait;


  private $leaveRequestTemplateFactory;

  private $leaveContact;

  public function setUp() {
    CRM_Core_DAO::executeQuery('SET foreign_key_checks = 0;');
    $this->leaveRequestTemplateFactory = new RequestNotificationTemplateFactory();

    $this->leaveContact = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Staff1', 'last_name' => 'Staff1'], 'staffmember@dummysite.com'
    );

    $this->leaveRequestStatuses = $this->getLeaveRequestStatuses();
    $this->leaveRequestDayTypes = $this->getLeaveRequestDayTypes();
  }

  public function testGetRecipientEmailsReturnsCorrectlyWhenLeaveContactHasLeaveApprover() {
    $manager1 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Manager1', 'last_name' => 'Manager1'], 'manager1@dummysite.com'
    );
    $manager2 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Manager2', 'last_name' => 'Manager2'], 'manager2@dummysite.com'
    );
    $manager3 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Manager3', 'last_name' => 'Manager3'], 'manager3@dummysite.com'
    );

    $this->setLeaveApproverRelationshipTypes(['has Leaves Approved By']);

    // Set manager1 and manager2 only to be leave aprovers for the leave contact
    $this->setContactAsLeaveApproverOf($manager1, $this->leaveContact, null, null, true, 'has Leaves Approved By');
    $this->setContactAsLeaveApproverOf($manager2, $this->leaveContact, null, null, true, 'has Leaves Approved By');

    $leaveRequest = LeaveRequest::create([
      'type_id' => 1,
      'contact_id' => $this->leaveContact['id'],
      'status_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('tomorrow'),
      'from_date_type' => 1,
      'to_date' => CRM_Utils_Date::processDate('tomorrow'),
      'to_date_type' => 1,
      'toil_to_accrue' => 2,
      'toil_duration' => 120,
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL
    ], false);

    $message = new Message($leaveRequest, $this->leaveRequestTemplateFactory);
    $recipientEmails = $message->getRecipientEmails($leaveRequest);

    $this->assertCount(3, $recipientEmails);

    //The contact and the leave approvers are eligible recipients for this email notification.
    foreach($recipientEmails as $value) {
      $this->assertContains($value['email'], [
        'staffmember@dummysite.com', 'manager1@dummysite.com', 'manager2@dummysite.com'
      ]);

      $this->assertContains($value['api.Contact.get']['values'][0]['display_name'], [
        'Manager1 Manager1', 'Staff1 Staff1', 'Manager2 Manager2'
      ]);
    }
  }

  public function testGetRecipientEmailsReturnsCorrectlyWhenLeaveContactHasNoLeaveApproverButThereAreDefaultLeaveApproversForTheAbsenceType() {
    $defaultApprover1 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Approver1', 'last_name' => 'Approver1'], 'approver1@dummysite.com'
    );
    $defaultApprover2 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Approver2', 'last_name' => 'Approver2'], 'approver2@dummysite.com'
    );

    $absenceType = 1;
    //add two default leave approvers for the absence type
    NotificationReceiver::addReceiversToAbsenceType($absenceType, [$defaultApprover1['id'], $defaultApprover2['id']]);

    $leaveRequest = LeaveRequest::create([
      'type_id' => 1,
      'contact_id' => $this->leaveContact['id'],
      'status_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('tomorrow'),
      'from_date_type' => 1,
      'to_date' => CRM_Utils_Date::processDate('tomorrow'),
      'to_date_type' => 1,
      'toil_to_accrue' => 2,
      'toil_duration' => 120,
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL
    ], false);

    $message = new Message($leaveRequest, $this->leaveRequestTemplateFactory);
    $recipientEmails = $message->getRecipientEmails($leaveRequest);

    $this->assertCount(3, $recipientEmails);

    //The contact and default leave approvers for the absence type are eligible recipients for this email notification.
    foreach($recipientEmails as $value) {
      $this->assertContains($value['email'], [
        'staffmember@dummysite.com', 'approver1@dummysite.com', 'approver2@dummysite.com'
      ]);

      $this->assertContains($value['api.Contact.get']['values'][0]['display_name'], [
        'Approver1 Approver1', 'Staff1 Staff1', 'Approver2 Approver2'
      ]);
    }
  }

  public function testGetRecipientEmailsReturnsEmailsForContactAndLeaveApproverOnlyWhenLeaveContactHasLeaveApproverAndThereIsDefaultLeaveApproverForTheAbsenceType() {
    $manager1 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Manager1', 'last_name' => 'Manager1'], 'manager1@dummysite.com'
    );

    $this->setLeaveApproverRelationshipTypes(['has Leaves Approved By']);

    // Set manager1 to be leave aprovers for the leave contact
    $this->setContactAsLeaveApproverOf($manager1, $this->leaveContact, null, null, true, 'has Leaves Approved By');

    $defaultApprover1 = ContactFabricator::fabricateWithEmail([
      'first_name' => 'Approver1', 'last_name' => 'Approver1'], 'approver1@dummysite.com'
    );

    $absenceType = 1;
    //add a default leave approvers for the absence type
    NotificationReceiver::addReceiversToAbsenceType($absenceType, [$defaultApprover1['id']]);

    $leaveRequest = LeaveRequest::create([
      'type_id' => $absenceType,
      'contact_id' => $this->leaveContact['id'],
      'status_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('tomorrow'),
      'from_date_type' => 1,
      'to_date' => CRM_Utils_Date::processDate('tomorrow'),
      'to_date_type' => 1,
      'toil_to_accrue' => 2,
      'toil_duration' => 120,
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL
    ], false);

    $message = new Message($leaveRequest, $this->leaveRequestTemplateFactory);
    $recipientEmails = $message->getRecipientEmails($leaveRequest);

    $this->assertCount(2, $recipientEmails);

    //since there are leave approvers for the leave contact, no mails will be sent to the default approvers
    //for the absence type
    foreach($recipientEmails as $value) {
      $this->assertContains($value['email'], [
        'staffmember@dummysite.com', 'manager1@dummysite.com'
      ]);

      $this->assertContains($value['api.Contact.get']['values'][0]['display_name'], [
        'Manager1 Manager1', 'Staff1 Staff1'
      ]);
    }
  }

  public function testGetLeaveContact() {
    $leaveRequest = new LeaveRequest();
    $leaveRequest->contact_id = 2;
    $message = new Message($leaveRequest, $this->leaveRequestTemplateFactory);
    $this->assertEquals($leaveRequest->contact_id, $message->getLeaveContactID());
  }

  public function testGetTemplateParameters() {
    $notificationTemplateFactory = $this->createRequestNotificationTemplateFactoryMock();

    $leaveRequest = new LeaveRequest();
    $message = new Message($leaveRequest, $notificationTemplateFactory);
    $message->getTemplateParameters();
  }

  public function testGetTemplateID() {
    $notificationTemplateFactory = $this->createRequestNotificationTemplateFactoryMock();

    $leaveRequest = new LeaveRequest();
    $message = new Message($leaveRequest, $notificationTemplateFactory);
    $message->getTemplateID();
  }

  public function testGetFromEmail() {
    $leaveRequest = new LeaveRequest();
    $message = new Message($leaveRequest, $this->leaveRequestTemplateFactory);
    $recipientEmails = $message->getFromEmail();

    //this simple assertion should probably do for now since the method logic will be changed
    //to fetch from L&A general settings
    $this->assertNotNull($recipientEmails);
  }
}
