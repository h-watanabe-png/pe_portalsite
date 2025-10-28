/**
 * PE Portal - Configuration Management
 * Handles system configuration and settings
 * 
 * @author h-watanabe
 * @version 1.0
 * @created 2025-10-27
 */

/**
 * Get system configuration
 * @return {Object} Configuration object
 */
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  
  // Default configuration
  const defaultConfig = {
    // Folder IDs (from Phase 0 setup)
    folders: {
      mainFolderId: '1BjisQ_2IATcKnTu71Mb059vkS-QzmHgE', // PE Portal Project
      formsFolderId: properties.getProperty('FORMS_FOLDER_ID') || '',
      sheetsFolderId: properties.getProperty('SHEETS_FOLDER_ID') || '',
      sitesFolderId: properties.getProperty('SITES_FOLDER_ID') || '',
      dataStudioFolderId: properties.getProperty('DATASTUDIO_FOLDER_ID') || '',
      documentsFolderId: properties.getProperty('DOCUMENTS_FOLDER_ID') || '',
      backupFolderId: properties.getProperty('BACKUP_FOLDER_ID') || ''
    },
    
    // Spreadsheet IDs
    sheets: {
      requestSheetId: properties.getProperty('REQUEST_SHEET_ID') || '',
      dashboardSheetId: properties.getProperty('DASHBOARD_SHEET_ID') || ''
    },
    
    // Notification settings
    notifications: {
      adminEmails: properties.getProperty('ADMIN_EMAILS') ? 
        properties.getProperty('ADMIN_EMAILS').split(',') : [],
      enableEmailNotifications: properties.getProperty('ENABLE_EMAIL_NOTIFICATIONS') === 'true',
      enableSlackNotifications: properties.getProperty('ENABLE_SLACK_NOTIFICATIONS') === 'true',
      slackWebhookUrl: properties.getProperty('SLACK_WEBHOOK_URL') || ''
    },
    
    // System settings
    system: {
      timezone: properties.getProperty('TIMEZONE') || 'Asia/Tokyo',
      dateFormat: properties.getProperty('DATE_FORMAT') || 'yyyy-MM-dd HH:mm:ss',
      maxRequestsPerDay: parseInt(properties.getProperty('MAX_REQUESTS_PER_DAY')) || 100,
      autoBackupEnabled: properties.getProperty('AUTO_BACKUP_ENABLED') === 'true',
      backupRetentionDays: parseInt(properties.getProperty('BACKUP_RETENTION_DAYS')) || 30
    },
    
    // GAS execution limits
    limits: {
      maxExecutionTimeMinutes: 5, // Keep under 6 minute limit
      maxDailyExecutionMinutes: 10, // Keep under 6 hour limit
      batchSize: parseInt(properties.getProperty('BATCH_SIZE')) || 50
    }
  };
  
  return defaultConfig;
}

/**
 * Set configuration property
 * @param {string} key - Property key
 * @param {string} value - Property value
 */
function setConfigProperty(key, value) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(key, value);
  console.log(`Configuration updated: ${key} = ${value}`);
}

/**
 * Initialize configuration with default values
 * @return {Object} Initialization result
 */
function initializeConfig() {
  console.log('Initializing configuration...');
  
  try {
    const properties = PropertiesService.getScriptProperties();
    
    // Set default values if not already set
    const defaultValues = {
      'TIMEZONE': 'Asia/Tokyo',
      'DATE_FORMAT': 'yyyy-MM-dd HH:mm:ss',
      'MAX_REQUESTS_PER_DAY': '100',
      'AUTO_BACKUP_ENABLED': 'true',
      'BACKUP_RETENTION_DAYS': '30',
      'BATCH_SIZE': '50',
      'ENABLE_EMAIL_NOTIFICATIONS': 'true',
      'ENABLE_SLACK_NOTIFICATIONS': 'false'
    };
    
    Object.keys(defaultValues).forEach(key => {
      if (!properties.getProperty(key)) {
        properties.setProperty(key, defaultValues[key]);
        console.log(`Set default value: ${key} = ${defaultValues[key]}`);
      }
    });
    
    console.log('Configuration initialization completed');
    return { success: true, message: 'Configuration initialized successfully' };
  } catch (error) {
    console.error('Configuration initialization failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update folder IDs in configuration
 * @param {Object} folderIds - Object containing folder IDs
 */
function updateFolderIds(folderIds) {
  console.log('Updating folder IDs:', folderIds);
  
  try {
    const properties = PropertiesService.getScriptProperties();
    
    Object.keys(folderIds).forEach(key => {
      if (folderIds[key]) {
        properties.setProperty(key, folderIds[key]);
        console.log(`Updated folder ID: ${key} = ${folderIds[key]}`);
      }
    });
    
    return { success: true, message: 'Folder IDs updated successfully' };
  } catch (error) {
    console.error('Failed to update folder IDs:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update notification settings
 * @param {Object} notificationSettings - Notification configuration
 */
function updateNotificationSettings(notificationSettings) {
  console.log('Updating notification settings:', notificationSettings);
  
  try {
    const properties = PropertiesService.getScriptProperties();
    
    if (notificationSettings.adminEmails) {
      properties.setProperty('ADMIN_EMAILS', notificationSettings.adminEmails.join(','));
    }
    
    if (notificationSettings.enableEmailNotifications !== undefined) {
      properties.setProperty('ENABLE_EMAIL_NOTIFICATIONS', notificationSettings.enableEmailNotifications.toString());
    }
    
    if (notificationSettings.enableSlackNotifications !== undefined) {
      properties.setProperty('ENABLE_SLACK_NOTIFICATIONS', notificationSettings.enableSlackNotifications.toString());
    }
    
    if (notificationSettings.slackWebhookUrl) {
      properties.setProperty('SLACK_WEBHOOK_URL', notificationSettings.slackWebhookUrl);
    }
    
    return { success: true, message: 'Notification settings updated successfully' };
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get all configuration properties
 * @return {Object} All configuration properties
 */
function getAllConfigProperties() {
  const properties = PropertiesService.getScriptProperties();
  const allProperties = properties.getProperties();
  
  // Filter out sensitive information for logging
  const safeProperties = { ...allProperties };
  if (safeProperties.SLACK_WEBHOOK_URL) {
    safeProperties.SLACK_WEBHOOK_URL = '***HIDDEN***';
  }
  
  return safeProperties;
}

/**
 * Reset configuration to defaults
 * @return {Object} Reset result
 */
function resetConfigToDefaults() {
  console.log('Resetting configuration to defaults...');
  
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.deleteAllProperties();
    
    // Re-initialize with defaults
    const result = initializeConfig();
    
    console.log('Configuration reset completed');
    return { success: true, message: 'Configuration reset to defaults' };
  } catch (error) {
    console.error('Configuration reset failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Validate configuration
 * @return {Object} Validation result
 */
function validateConfig() {
  console.log('Validating configuration...');
  
  try {
    const config = getConfig();
    const errors = [];
    const warnings = [];
    
    // Check required folder IDs
    if (!config.folders.mainFolderId) {
      errors.push('Main folder ID is required');
    }
    
    // Check notification settings
    if (config.notifications.enableEmailNotifications && 
        config.notifications.adminEmails.length === 0) {
      warnings.push('Email notifications enabled but no admin emails configured');
    }
    
    if (config.notifications.enableSlackNotifications && 
        !config.notifications.slackWebhookUrl) {
      warnings.push('Slack notifications enabled but no webhook URL configured');
    }
    
    // Check limits
    if (config.limits.maxExecutionTimeMinutes >= 6) {
      errors.push('Max execution time must be less than 6 minutes');
    }
    
    if (config.limits.maxDailyExecutionMinutes >= 360) {
      errors.push('Max daily execution time must be less than 6 hours');
    }
    
    const isValid = errors.length === 0;
    
    return {
      success: isValid,
      valid: isValid,
      errors: errors,
      warnings: warnings,
      message: isValid ? 'Configuration is valid' : 'Configuration has errors'
    };
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return { success: false, message: error.toString() };
  }
}
