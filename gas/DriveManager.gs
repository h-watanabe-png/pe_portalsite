/**
 * PE Portal - Drive Manager
 * Handles Google Drive folder structure and file management
 * 
 * @author h-watanabe
 * @version 1.0
 * @created 2025-10-27
 */

/**
 * Setup the required folder structure for PE Portal
 * @return {Object} Result object with folder information
 */
function setupFolders() {
  console.log('Setting up PE Portal folder structure...');
  
  try {
    const config = getConfig();
    const mainFolderId = config.folders.mainFolderId;
    
    if (!mainFolderId) {
      throw new Error('Main folder ID not configured');
    }
    
    const mainFolder = DriveApp.getFolderById(mainFolderId);
    const folders = {};
    
    // Create subfolders
    const subfolderNames = [
      '01_Forms',
      '02_Sheets', 
      '03_Sites',
      '04_DataStudio',
      '05_Documents',
      '06_Backups'
    ];
    
    subfolderNames.forEach(folderName => {
      const existingFolders = mainFolder.getFoldersByName(folderName);
      
      if (existingFolders.hasNext()) {
        // Folder already exists
        const folder = existingFolders.next();
        folders[folderName] = {
          id: folder.getId(),
          name: folder.getName(),
          url: folder.getUrl(),
          exists: true
        };
        console.log(`Folder already exists: ${folderName} (${folder.getId()})`);
      } else {
        // Create new folder
        const folder = mainFolder.createFolder(folderName);
        folders[folderName] = {
          id: folder.getId(),
          name: folder.getName(),
          url: folder.getUrl(),
          exists: false
        };
        console.log(`Folder created: ${folderName} (${folder.getId()})`);
      }
    });
    
    // Update config with folder IDs
    updateConfigWithFolderIds(folders);
    
    console.log('Folder structure setup completed');
    return { success: true, folders: folders };
  } catch (error) {
    console.error('Folder setup failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update configuration with folder IDs
 * @param {Object} folders - Folder information
 */
function updateConfigWithFolderIds(folders) {
  // This would typically update a configuration file or PropertiesService
  // For now, we'll just log the folder information
  console.log('Folder IDs for configuration:');
  Object.keys(folders).forEach(key => {
    console.log(`${key}: ${folders[key].id}`);
  });
}

/**
 * Create a new spreadsheet for request management
 * @param {string} folderId - Target folder ID
 * @return {Object} Result object with spreadsheet information
 */
function createRequestSpreadsheet(folderId) {
  console.log('Creating request spreadsheet...');
  
  try {
    const config = getConfig();
    const folder = DriveApp.getFolderById(folderId);
    
    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create('PE Portal - Request Management');
    const sheet = spreadsheet.getActiveSheet();
    
    // Set up headers
    const headers = [
      'Request ID',
      'Timestamp',
      'Request Title',
      'Request Description', 
      'Priority Level',
      'Request Type',
      'Desired Completion Date',
      'Additional Information',
      'Status',
      'Assigned To',
      'Completion Date',
      'Notes'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    
    // Set column widths
    sheet.setColumnWidth(1, 150); // Request ID
    sheet.setColumnWidth(2, 150); // Timestamp
    sheet.setColumnWidth(3, 200); // Request Title
    sheet.setColumnWidth(4, 300); // Request Description
    sheet.setColumnWidth(5, 120); // Priority Level
    sheet.setColumnWidth(6, 150); // Request Type
    sheet.setColumnWidth(7, 150); // Desired Completion Date
    sheet.setColumnWidth(8, 250); // Additional Information
    sheet.setColumnWidth(9, 100); // Status
    sheet.setColumnWidth(10, 120); // Assigned To
    sheet.setColumnWidth(11, 150); // Completion Date
    sheet.setColumnWidth(12, 200); // Notes
    
    // Move spreadsheet to designated folder
    const file = DriveApp.getFileById(spreadsheet.getId());
    folder.addFile(file);
    
    // Remove from root
    const parents = file.getParents();
    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getId() !== folderId) {
        parent.removeFile(file);
      }
    }
    
    console.log('Request spreadsheet created:', spreadsheet.getId());
    return {
      success: true,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      sheetId: sheet.getSheetId()
    };
  } catch (error) {
    console.error('Spreadsheet creation failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get folder information by name
 * @param {string} folderName - Name of the folder
 * @return {Object} Folder information
 */
function getFolderByName(folderName) {
  try {
    const config = getConfig();
    const mainFolderId = config.folders.mainFolderId;
    const mainFolder = DriveApp.getFolderById(mainFolderId);
    
    const folders = mainFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      const folder = folders.next();
      return {
        success: true,
        id: folder.getId(),
        name: folder.getName(),
        url: folder.getUrl()
      };
    } else {
      return { success: false, message: `Folder '${folderName}' not found` };
    }
  } catch (error) {
    console.error('Failed to get folder:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * List all files in a folder
 * @param {string} folderId - Folder ID
 * @return {Object} List of files
 */
function listFilesInFolder(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const fileList = [];
    
    while (files.hasNext()) {
      const file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        type: file.getMimeType(),
        size: file.getSize(),
        lastModified: file.getLastUpdated()
      });
    }
    
    return { success: true, files: fileList };
  } catch (error) {
    console.error('Failed to list files:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Create backup of important files
 * @return {Object} Backup result
 */
function createBackup() {
  console.log('Creating backup...');
  
  try {
    const config = getConfig();
    const backupFolderId = config.folders.backupFolderId;
    
    if (!backupFolderId) {
      throw new Error('Backup folder ID not configured');
    }
    
    const backupFolder = DriveApp.getFolderById(backupFolderId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubfolder = backupFolder.createFolder(`Backup_${timestamp}`);
    
    // Backup forms
    const formsFolder = DriveApp.getFolderById(config.folders.formsFolderId);
    const formsFiles = formsFolder.getFiles();
    while (formsFiles.hasNext()) {
      const file = formsFiles.next();
      file.makeCopy(file.getName(), backupSubfolder);
    }
    
    // Backup sheets
    const sheetsFolder = DriveApp.getFolderById(config.folders.sheetsFolderId);
    const sheetsFiles = sheetsFolder.getFiles();
    while (sheetsFiles.hasNext()) {
      const file = sheetsFiles.next();
      file.makeCopy(file.getName(), backupSubfolder);
    }
    
    console.log('Backup completed:', backupSubfolder.getId());
    return { success: true, backupFolderId: backupSubfolder.getId() };
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Clean up old backup files (keep only last 10 backups)
 * @return {Object} Cleanup result
 */
function cleanupOldBackups() {
  try {
    const config = getConfig();
    const backupFolderId = config.folders.backupFolderId;
    const backupFolder = DriveApp.getFolderById(backupFolderId);
    
    const folders = backupFolder.getFolders();
    const folderList = [];
    
    while (folders.hasNext()) {
      const folder = folders.next();
      folderList.push({
        id: folder.getId(),
        name: folder.getName(),
        created: folder.getDateCreated()
      });
    }
    
    // Sort by creation date (newest first)
    folderList.sort((a, b) => b.created - a.created);
    
    // Keep only the 10 most recent backups
    if (folderList.length > 10) {
      const foldersToDelete = folderList.slice(10);
      
      foldersToDelete.forEach(folderInfo => {
        const folder = DriveApp.getFolderById(folderInfo.id);
        folder.setTrashed(true);
        console.log('Deleted old backup:', folderInfo.name);
      });
      
      return { 
        success: true, 
        deleted: foldersToDelete.length,
        remaining: folderList.length - foldersToDelete.length
      };
    }
    
    return { success: true, deleted: 0, remaining: folderList.length };
  } catch (error) {
    console.error('Backup cleanup failed:', error);
    return { success: false, message: error.toString() };
  }
}
