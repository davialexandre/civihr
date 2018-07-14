<?php

define('REQUEST_TIME', time());

use CRM_HRCore_Service_DrupalUserService as DrupalUserService;
use CRM_HRCore_CMSData_Role_DrupalRoleService as DrupalRoleService;
use CRM_HRCore_Test_Fabricator_Contact as ContactFabricator;
use CRM_HRCore_Test_Helpers_SessionHelper as SessionHelper;

/**
 * @group headless
 */
class CRM_HRCore_Service_DrupalUserServiceTest extends CRM_HRCore_Test_BaseHeadlessTest {

  /**
   * @var string
   */
  private $testEmail = 'foo@bar.com';

  /**
   * @var array
   */
  private $testContact;

  public function setUp() {
    $this->testContact = ContactFabricator::fabricate();
    SessionHelper::registerCurrentLoggedInContactInSession($this->testContact['id']);
  }

  public function tearDown() {
    $this->cleanup();
  }

  public function testBasicUserCreate() {
    $roleService = $this->prophesize(DrupalRoleService::class);
    $drupalUserService = new DrupalUserService($roleService->reveal());
    $user = $drupalUserService->createNew($this->testEmail);

    $this->assertEquals(0, $user->status);
    $this->assertEquals($this->testEmail, $user->mail);
  }

  public function testCreateActiveWithRoles() {
    $roles = ['testrole'];
    $mockRids = [8 => '8'];
    $roleService = $this->prophesize(DrupalRoleService::class);
    $roleService->getRoleIds($roles)->willReturn($mockRids);
    $drupalUserService = new DrupalUserService($roleService->reveal());
    $user = $drupalUserService->createNew($this->testEmail, TRUE, $roles);

    $this->assertEquals(1, $user->status);
    $this->assertEquals($this->testEmail, $user->mail);
    $this->assertArrayHasKey(8, $user->roles);
  }

  protected function cleanup() {
    $user = user_load_by_mail($this->testEmail);
    if ($user) {
      user_delete($user->uid);
    }
  }

}
