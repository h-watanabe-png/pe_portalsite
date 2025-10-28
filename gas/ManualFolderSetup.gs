/**
 * PE Portal - Manual Folder Setup
 * Utility for manually setting up folder structure when automated setup fails
 * 
 * @author h-watanabe
 * @version 1.0
 * @created 2025-10-27
 */

/**
 * Manual folder setup with specific folder IDs
 * Use this function when you need to manually configure folder IDs
 */
function manualFolderSetup() {
  console.log('Starting manual folder setup...');
  
  try {
    // These are the folder IDs from Phase 0 setup
    // Update these with actual folder IDs from your Google Drive
    const folderIds = {
      'FORMS_FOLDER_ID': '', // Update with actual Forms folder ID
      'SHEETS_FOLDER_ID': '', // Update with actual Sheets folder ID  
      'SITES_FOLDER_ID': '', // Update with actual Sites folder ID
      'DATASTUDIO_FOLDER_ID': '', // Update with actual DataStudio folder ID
      'DOCUMENTS_FOLDER_ID': '', // Update with actual Documents folder ID
      'BACKUP_FOLDER_ID': '' // Update with actual Backups folder ID
    };
    
    // Update configuration with folder IDs
    const result = updateFolderIds(folderIds);
    
    if (result.success) {
      console.log('Manual folder setup completed successfully');
      
      // Validate the setup
      const validation = validateConfig();
      console.log('Configuration validation:', validation);
      
      return { 
        success: true, 
        message: 'Manual folder setup completed',
        folderIds: folderIds,
        validation: validation
      };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Manual folder setup failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get folder IDs from Google Drive
 * Helper function to find folder IDs by name
 * @param {string} folderName - Name of the folder to find
 * @return {Object} Folder information
 */
function getFolderIdByName(folderName) {
  try {
    const config = getConfig();
    const mainFolderId = config.folders.mainFolderId;
    
    if (!mainFolderId) {
      throw new Error('Main folder ID not configured');
    }
    
    const mainFolder = DriveApp.getFolderById(mainFolderId);
    const folders = mainFolder.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      const folder = folders.next();
      return {
        success: true,
        folderName: folderName,
        folderId: folder.getId(),
        folderUrl: folder.getUrl()
      };
    } else {
      return { 
        success: false, 
        message: `Folder '${folderName}' not found in main folder` 
      };
    }
  } catch (error) {
    console.error('Failed to get folder ID:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * List all folders in the main PE Portal folder
 * Helper function to see what folders exist
 * @return {Object} List of folders
 */
function listAllFolders() {
  try {
    const config = getConfig();
    const mainFolderId = config.folders.mainFolderId;
    
    if (!mainFolderId) {
      throw new Error('Main folder ID not configured');
    }
    
    const mainFolder = DriveApp.getFolderById(mainFolderId);
    const folders = mainFolder.getFolders();
    const folderList = [];
    
    while (folders.hasNext()) {
      const folder = folders.next();
      folderList.push({
        name: folder.getName(),
        id: folder.getId(),
        url: folder.getUrl(),
        created: folder.getDateCreated()
      });
    }
    
    console.log('Found folders:', folderList);
    return { success: true, folders: folderList };
  } catch (error) {
    console.error('Failed to list folders:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Setup folder IDs automatically by finding existing folders
 * @return {Object} Setup result
 */
function autoSetupFolderIds() {
  console.log('Auto-setting up folder IDs...');
  
  try {
    const folderList = listAllFolders();
    
    if (!folderList.success) {
      throw new Error(folderList.message);
    }
    
    const folderIds = {};
    
    // Map folder names to configuration keys
    const folderMapping = {
      '01_Forms': 'FORMS_FOLDER_ID',
      '02_Sheets': 'SHEETS_FOLDER_ID',
      '03_Sites': 'SITES_FOLDER_ID',
      '04_DataStudio': 'DATASTUDIO_FOLDER_ID',
      '05_Documents': 'DOCUMENTS_FOLDER_ID',
      '06_Backups': 'BACKUP_FOLDER_ID'
    };
    
    // Find folder IDs
    folderList.folders.forEach(folder => {
      if (folderMapping[folder.name]) {
        folderIds[folderMapping[folder.name]] = folder.id;
        console.log(`Found ${folder.name}: ${folder.id}`);
      }
    });
    
    // Update configuration
    const result = updateFolderIds(folderIds);
    
    if (result.success) {
      console.log('Auto folder setup completed');
      return { 
        success: true, 
        message: 'Auto folder setup completed',
        folderIds: folderIds
      };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Auto folder setup failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Create missing folders if they don't exist
 * @return {Object} Creation result
 */
function createMissingFolders() {
  console.log('Creating missing folders...');
  
  try {
    const config = getConfig();
    const mainFolderId = config.folders.mainFolderId;
    
    if (!mainFolderId) {
      throw new Error('Main folder ID not configured');
    }
    
    const mainFolder = DriveApp.getFolderById(mainFolderId);
    const createdFolders = [];
    
    // Define required folders
    const requiredFolders = [
      { name: '01_Forms', configKey: 'FORMS_FOLDER_ID' },
      { name: '02_Sheets', configKey: 'SHEETS_FOLDER_ID' },
      { name: '03_Sites', configKey: 'SITES_FOLDER_ID' },
      { name: '04_DataStudio', configKey: 'DATASTUDIO_FOLDER_ID' },
      { name: '05_Documents', configKey: 'DOCUMENTS_FOLDER_ID' },
      { name: '06_Backups', configKey: 'BACKUP_FOLDER_ID' }
    ];
    
    requiredFolders.forEach(folderInfo => {
      const existingFolders = mainFolder.getFoldersByName(folderInfo.name);
      
      if (!existingFolders.hasNext()) {
        // Create missing folder
        const folder = mainFolder.createFolder(folderInfo.name);
        createdFolders.push({
          name: folderInfo.name,
          id: folder.getId(),
          url: folder.getUrl()
        });
        console.log(`Created folder: ${folderInfo.name} (${folder.getId()})`);
      } else {
        console.log(`Folder already exists: ${folderInfo.name}`);
      }
    });
    
    // Update configuration with all folder IDs
    const folderIds = {};
    requiredFolders.forEach(folderInfo => {
      const folders = mainFolder.getFoldersByName(folderInfo.name);
      if (folders.hasNext()) {
        folderIds[folderInfo.configKey] = folders.next().getId();
      }
    });
    
    updateFolderIds(folderIds);
    
    return { 
      success: true, 
      message: 'Missing folders created',
      createdFolders: createdFolders,
      folderIds: folderIds
    };
  } catch (error) {
    console.error('Failed to create missing folders:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Complete folder setup process
 * This function combines all setup steps
 * @return {Object} Complete setup result
 */
function completeFolderSetup() {
  console.log('Starting complete folder setup...');
  
  try {
    // Step 1: Create missing folders
    const createResult = createMissingFolders();
    if (!createResult.success) {
      throw new Error(createResult.message);
    }
    
    // Step 2: Auto-setup folder IDs
    const autoResult = autoSetupFolderIds();
    if (!autoResult.success) {
      throw new Error(autoResult.message);
    }
    
    // Step 3: Validate configuration
    const validation = validateConfig();
    
    console.log('Complete folder setup finished');
    return {
      success: true,
      message: 'Complete folder setup finished',
      createdFolders: createResult.createdFolders,
      folderIds: autoResult.folderIds,
      validation: validation
    };
  } catch (error) {
    console.error('Complete folder setup failed:', error);
    return { success: false, message: error.toString() };
  }
}
