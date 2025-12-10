/**
 * PEポータルサイト - 設定管理
 * 
 * システム全体の設定値を管理します。
 */

function getConfig() {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
  const data = sheet.getDataRange().getValues();
  
  const config = {};
  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  
  return config;
}
