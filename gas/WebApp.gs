/**
 * PE Portal Web App - Main Entry Point
 * This file contains the main web app functionality for the PE Portal
 */

/**
 * Main function to serve the web app
 * @return {HtmlOutput} The HTML output for the web app
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('PE Portal - System Request Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include HTML files for the web app
 * @param {string} filename - The filename to include
 * @return {string} The content of the included file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get portal statistics for dashboard
 * @return {Object} Portal statistics
 */
function getPortalStats() {
  try {
    const config = getConfig();
    const spreadsheetId = config.sheets.requestSheetId;
    
    if (!spreadsheetId) {
      return { error: 'Spreadsheet not configured' };
    }
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // Calculate statistics
    const totalRequests = data.length - 1; // Exclude header
    const pendingRequests = data.filter(row => row[6] === 'Pending').length - 1;
    const completedRequests = data.filter(row => row[6] === 'Completed').length - 1;
    const highPriorityRequests = data.filter(row => row[3] === 'High' || row[3] === 'Critical').length - 1;
    
    return {
      success: true,
      stats: {
        totalRequests: totalRequests,
        pendingRequests: pendingRequests,
        completedRequests: completedRequests,
        highPriorityRequests: highPriorityRequests,
        completionRate: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0
      }
    };
  } catch (error) {
    console.error('Error getting portal stats:', error);
    return { error: error.toString() };
  }
}

/**
 * Get recent requests for dashboard
 * @param {number} limit - Number of recent requests to return
 * @return {Object} Recent requests data
 */
function getRecentRequests(limit = 5) {
  try {
    const config = getConfig();
    const spreadsheetId = config.sheets.requestSheetId;
    
    if (!spreadsheetId) {
      return { error: 'Spreadsheet not configured' };
    }
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // Get recent requests (excluding header)
    const recentRequests = data.slice(1, limit + 1).map(row => ({
      id: row[0],
      title: row[1],
      description: row[2],
      priority: row[3],
      type: row[4],
      status: row[6],
      submittedDate: row[7],
      requester: row[8]
    }));
    
    return {
      success: true,
      requests: recentRequests
    };
  } catch (error) {
    console.error('Error getting recent requests:', error);
    return { error: error.toString() };
  }
}

/**
 * Get form URL for embedding
 * @return {Object} Form URL and information
 */
function getFormInfo() {
  try {
    const config = getConfig();
    const formId = '1F2h6cGp5YF4iWtu8lg7ZVqqP7tBWSBEm-YBhgdCNLr0';
    const form = FormApp.openById(formId);
    
    return {
      success: true,
      formInfo: {
        id: formId,
        title: form.getTitle(),
        url: form.getPublishedUrl(),
        editUrl: form.getEditUrl()
      }
    };
  } catch (error) {
    console.error('Error getting form info:', error);
    return { error: error.toString() };
  }
}

/**
 * Get navigation menu items
 * @return {Object} Navigation menu data
 */
function getNavigationMenu() {
  return {
    success: true,
    menu: [
      {
        id: 'home',
        title: '🏠 ホーム',
        url: '#home',
        active: true
      },
      {
        id: 'requests',
        title: '📝 リクエスト送信',
        url: '#requests',
        active: false
      },
      {
        id: 'dashboard',
        title: '📊 ダッシュボード',
        url: '#dashboard',
        active: false
      },
      {
        id: 'faq',
        title: '❓ FAQ',
        url: '#faq',
        active: false
      },
      {
        id: 'contact',
        title: '📞 お問い合わせ',
        url: '#contact',
        active: false
      }
    ]
  };
}

/**
 * Get FAQ data
 * @return {Object} FAQ data
 */
function getFAQData() {
  return {
    success: true,
    faqs: [
      {
        question: 'システム依頼はどのように送信しますか？',
        answer: '「リクエスト送信」ページのフォームに必要事項を入力して送信してください。'
      },
      {
        question: '依頼の処理状況はどこで確認できますか？',
        answer: '「ダッシュボード」ページで統計情報と最近のリクエストを確認できます。'
      },
      {
        question: '緊急の依頼はどうすればよいですか？',
        answer: '優先度を「Critical」に設定し、詳細な説明を記載してください。'
      },
      {
        question: '依頼の取り消しは可能ですか？',
        answer: '依頼の取り消しが必要な場合は、お問い合わせページからご連絡ください。'
      }
    ]
  };
}

/**
 * Get contact information
 * @return {Object} Contact information
 */
function getContactInfo() {
  return {
    success: true,
    contact: {
      adminEmail: 'h-watanabe@example.com',
      supportHours: '平日 9:00-17:00',
      responseTime: '24時間以内',
      emergencyContact: '緊急時は直接メールでご連絡ください'
    }
  };
}

/**
 * Test function for web app functionality
 * @return {Object} Test results
 */
function testWebApp() {
  console.log('Testing PE Portal Web App...');
  
  try {
    // Test 1: Get portal stats
    const stats = getPortalStats();
    console.log('Portal stats test:', stats);
    
    // Test 2: Get recent requests
    const recentRequests = getRecentRequests(3);
    console.log('Recent requests test:', recentRequests);
    
    // Test 3: Get form info
    const formInfo = getFormInfo();
    console.log('Form info test:', formInfo);
    
    console.log('Web app test completed successfully');
    return {
      success: true,
      message: 'Web app functionality test completed',
      stats: stats,
      recentRequests: recentRequests,
      formInfo: formInfo
    };
  } catch (error) {
    console.error('Web app test failed:', error);
    return { success: false, message: error.toString() };
  }
}
