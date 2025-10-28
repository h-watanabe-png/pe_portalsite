/**
 * Test notification setup and configuration
 */
function testNotificationSetup() {
  console.log('Testing notification setup...');
  
  try {
    // Step 1: Set admin email addresses
    const adminEmails = ['h-watanabe@example.com']; // 実際のメールアドレスに変更
    setConfigProperty('ADMIN_EMAILS', adminEmails);
    console.log('Admin emails set:', adminEmails);
    
    // Step 2: Enable email notifications
    setConfigProperty('ENABLE_EMAIL_NOTIFICATIONS', true);
    console.log('Email notifications enabled');
    
    // Step 3: Test notification template
    const testNotification = {
      subject: 'PE Portal - New System Request',
      body: 'A new system request has been submitted.\n\nRequest Details:\n- Title: Test Request\n- Priority: High\n- Type: New System Development\n\nPlease review and process accordingly.\n\nPE Portal System'
    };
    
    console.log('Notification template created:', testNotification);
    
    // Step 4: Test sending notification (dry run)
    console.log('Testing notification sending (dry run)...');
    const testResult = sendTestNotification(testNotification);
    
    // Step 5: Update configuration
    const config = getConfig();
    console.log('Updated configuration:', config);
    
    console.log('Notification setup test completed successfully');
    return { 
      success: true, 
      message: 'Notification setup completed',
      adminEmails: adminEmails,
      notificationTemplate: testNotification,
      testResult: testResult
    };
  } catch (error) {
    console.error('Notification setup test failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Send test notification (dry run)
 * @param {Object} notification - Notification object with subject and body
 */
function sendTestNotification(notification) {
  console.log('Sending test notification (dry run)...');
  
  try {
    // Get admin emails from config
    const config = getConfig();
    const adminEmails = config.notifications.adminEmails || [];
    
    if (adminEmails.length === 0) {
      console.log('No admin emails configured, skipping notification');
      return { success: true, message: 'No admin emails configured' };
    }
    
    // Log the notification details (dry run)
    console.log('Notification details:');
    console.log('- Subject:', notification.subject);
    console.log('- Body:', notification.body);
    console.log('- Recipients:', adminEmails);
    
    // In a real implementation, you would use:
    // MailApp.sendEmail(adminEmails.join(','), notification.subject, notification.body);
    
    console.log('Test notification sent successfully (dry run)');
    return { 
      success: true, 
      message: 'Test notification sent (dry run)',
      recipients: adminEmails
    };
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Test function to update spreadsheet ID
 */
function testUpdateSpreadsheetId() {
  console.log('Updating spreadsheet ID...');
  
  try {
    const spreadsheetId = '1ue83R7gKGiDKysXOyjk8YAquIGC-O0rexNs0_UuZShA';
    setConfigProperty('REQUEST_SHEET_ID', spreadsheetId);
    
    console.log('Spreadsheet ID updated successfully:', spreadsheetId);
    return { success: true, spreadsheetId: spreadsheetId };
  } catch (error) {
    console.error('Failed to update spreadsheet ID:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Setup form trigger for automatic data processing
 * @param {string} formId - Form ID to setup trigger for
 */
function setupFormTrigger(formId) {
  console.log('Setting up form trigger for:', formId);
  
  try {
    // Get the form
    const form = FormApp.openById(formId);
    
    // Create trigger for form submission
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
    
    console.log('Form trigger created successfully:', trigger.getUniqueId());
    
    // Test the trigger by getting form info
    const formInfo = {
      formId: formId,
      formTitle: form.getTitle(),
      formUrl: form.getPublishedUrl(),
      triggerId: trigger.getUniqueId()
    };
    
    console.log('Form trigger setup completed:', formInfo);
    return { success: true, formInfo: formInfo };
  } catch (error) {
    console.error('Failed to setup form trigger:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Test complete system integration
 */
function testSystemIntegration() {
  console.log('Testing complete system integration...');
  
  try {
    // Step 1: Test configuration
    console.log('Step 1: Testing configuration...');
    const config = getConfig();
    console.log('Configuration loaded:', config);
    
    // Step 2: Test form access
    console.log('Step 2: Testing form access...');
    const formId = '1F2h6cGp5YF4iWtu8lg7ZVqqP7tBWSBEm-YBhgdCNLr0';
    const form = FormApp.openById(formId);
    console.log('Form accessed successfully:', form.getTitle());
    
    // Step 3: Test spreadsheet access
    console.log('Step 3: Testing spreadsheet access...');
    const spreadsheetId = config.sheets.requestSheetId;
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log('Spreadsheet accessed successfully:', spreadsheet.getName());
    
    // Step 4: Test notification configuration
    console.log('Step 4: Testing notification configuration...');
    const adminEmails = config.notifications.adminEmails;
    const emailEnabled = config.notifications.enableEmailNotifications;
    console.log('Admin emails:', adminEmails);
    console.log('Email notifications enabled:', emailEnabled);
    
    // Step 5: Test form trigger
    console.log('Step 5: Testing form trigger...');
    const triggers = ScriptApp.getProjectTriggers();
    const formTriggers = triggers.filter(trigger => 
      trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
    );
    console.log('Form triggers found:', formTriggers.length);
    
    // Step 6: Test data flow simulation
    console.log('Step 6: Testing data flow simulation...');
    const testData = {
      timestamp: new Date(),
      requestTitle: 'Integration Test Request',
      requestDescription: 'This is a test request for integration testing',
      priority: 'High',
      requestType: 'System Enhancement',
      desiredCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      additionalInfo: 'Integration test data'
    };
    
    console.log('Test data prepared:', testData);
    
    // Step 7: Test notification template
    console.log('Step 7: Testing notification template...');
    const notificationTemplate = {
      subject: 'PE Portal - Integration Test Notification',
      body: `Integration test completed successfully.\n\nTest Details:\n- Request Title: ${testData.requestTitle}\n- Priority: ${testData.priority}\n- Type: ${testData.requestType}\n\nPE Portal System`
    };
    console.log('Notification template created:', notificationTemplate);
    
    console.log('System integration test completed successfully');
    return { 
      success: true, 
      message: 'System integration test completed',
      config: config,
      formTitle: form.getTitle(),
      spreadsheetName: spreadsheet.getName(),
      adminEmails: adminEmails,
      emailEnabled: emailEnabled,
      formTriggersCount: formTriggers.length,
      testData: testData,
      notificationTemplate: notificationTemplate
    };
  } catch (error) {
    console.error('System integration test failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Test the complete form-to-spreadsheet integration
 */
function testFormIntegration() {
  console.log('Testing form-to-spreadsheet integration...');
  
  try {
    // Step 1: Update spreadsheet ID
    const spreadsheetResult = testUpdateSpreadsheetId();
    if (!spreadsheetResult.success) {
      throw new Error('Failed to update spreadsheet ID: ' + spreadsheetResult.message);
    }
    
    // Step 2: Setup form trigger
    const formId = '1F2h6cGp5YF4iWtu8lg7ZVqqP7tBWSBEm-YBhgdCNLr0';
    const triggerResult = setupFormTrigger(formId);
    if (!triggerResult.success) {
      throw new Error('Failed to setup form trigger: ' + triggerResult.message);
    }
    
    // Step 3: Test configuration
    const config = getConfig();
    console.log('Updated configuration:', config);
    
    console.log('Form integration test completed successfully');
    return { 
      success: true, 
      message: 'Form integration setup completed',
      spreadsheetId: spreadsheetResult.spreadsheetId,
      formInfo: triggerResult.formInfo
    };
  } catch (error) {
    console.error('Form integration test failed:', error);
    return { success: false, message: error.toString() };
  }
}