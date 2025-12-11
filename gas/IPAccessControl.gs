/**
 * PEポータルサイト - IPアドレスアクセス制御
 * 
 * IPアドレスベースのアクセス制御を管理
 * 注意: GASでは直接IPアドレスを取得できないため、フロントエンドから取得したIPアドレスをチェック
 */

/**
 * IPアドレスが許可されているかチェック
 * @param {string} ipAddress - チェックするIPアドレス
 * @return {Object} チェック結果
 */
function checkIPAccess(ipAddress) {
  try {
    // IPアドレスが提供されていない場合は、チェックをスキップ（後方互換性）
    if (!ipAddress || ipAddress === '') {
      Logger.log('IPアドレスが提供されていません。チェックをスキップします。');
      return {
        allowed: true,
        reason: 'IPアドレスが提供されていません'
      };
    }
    
    // 許可されたIPアドレスのリストを取得
    const allowedIPs = getAllowedIPs();
    
    // IPアドレスが許可されているかチェック
    const isAllowed = isIPAllowed(ipAddress, allowedIPs);
    
    if (isAllowed) {
      return {
        allowed: true,
        reason: 'IPアドレスが許可されています'
      };
    } else {
      Logger.log('IPアドレスが許可されていません: ' + ipAddress);
      return {
        allowed: false,
        reason: 'IPアドレスが許可されていません: ' + ipAddress
      };
    }
  } catch (e) {
    Logger.log('IPアドレスチェックエラー: ' + e.toString());
    // エラー時は許可（後方互換性のため）
    return {
      allowed: true,
      reason: 'IPアドレスチェックでエラーが発生しました: ' + e.toString()
    };
  }
}

/**
 * 許可されたIPアドレスのリストを取得
 * @return {Array<string>} 許可されたIPアドレスのリスト
 */
function getAllowedIPs() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
    
    if (!sheet) {
      Logger.log('システム設定シートが見つかりません');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const ipList = [];
    
    // 「IPアドレス許可リスト」の行を探す
    let ipListRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'IPアドレス許可リスト') {
        ipListRowIndex = i;
        break;
      }
    }
    
    if (ipListRowIndex === -1) {
      Logger.log('IPアドレス許可リストが見つかりません');
      return [];
    }
    
    // IPアドレスリストを取得（2列目以降）
    for (let col = 1; col < data[ipListRowIndex].length; col++) {
      const ip = data[ipListRowIndex][col];
      if (ip && ip.toString().trim() !== '') {
        ipList.push(ip.toString().trim());
      }
    }
    
    Logger.log('許可されたIPアドレス: ' + JSON.stringify(ipList));
    return ipList;
  } catch (e) {
    Logger.log('IPアドレスリスト取得エラー: ' + e.toString());
    return [];
  }
}

/**
 * IPアドレスが許可されているかチェック
 * @param {string} ipAddress - チェックするIPアドレス
 * @param {Array<string>} allowedIPs - 許可されたIPアドレスのリスト
 * @return {boolean} 許可されているかどうか
 */
function isIPAllowed(ipAddress, allowedIPs) {
  if (!ipAddress || allowedIPs.length === 0) {
    return true; // IP制御が無効な場合は許可
  }
  
  // 完全一致チェック
  if (allowedIPs.includes(ipAddress)) {
    return true;
  }
  
  // CIDR表記のチェック（簡易版）
  for (let i = 0; i < allowedIPs.length; i++) {
    const allowedIP = allowedIPs[i];
    
    // CIDR表記（例: 192.168.1.0/24）のチェック
    if (allowedIP.includes('/')) {
      if (isIPInCIDR(ipAddress, allowedIP)) {
        return true;
      }
    }
    
    // ワイルドカード表記（例: 192.168.1.*）のチェック
    if (allowedIP.includes('*')) {
      if (isIPInWildcard(ipAddress, allowedIP)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * IPアドレスがCIDR範囲内かチェック（簡易版）
 * @param {string} ipAddress - チェックするIPアドレス
 * @param {string} cidr - CIDR表記（例: 192.168.1.0/24）
 * @return {boolean} 範囲内かどうか
 */
function isIPInCIDR(ipAddress, cidr) {
  try {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }
    
    const ipParts = ipAddress.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    
    if (ipParts.length !== 4 || networkParts.length !== 4) {
      return false;
    }
    
    // 簡易版: プレフィックス長に応じて比較
    const mask = Math.pow(2, 32 - prefix) - 1;
    const ipValue = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const networkValue = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
    
    return (ipValue & ~mask) === (networkValue & ~mask);
  } catch (e) {
    Logger.log('CIDRチェックエラー: ' + e.toString());
    return false;
  }
}

/**
 * IPアドレスがワイルドカード範囲内かチェック
 * @param {string} ipAddress - チェックするIPアドレス
 * @param {string} wildcard - ワイルドカード表記（例: 192.168.1.*）
 * @return {boolean} 範囲内かどうか
 */
function isIPInWildcard(ipAddress, wildcard) {
  try {
    const ipParts = ipAddress.split('.');
    const wildcardParts = wildcard.split('.');
    
    if (ipParts.length !== 4 || wildcardParts.length !== 4) {
      return false;
    }
    
    for (let i = 0; i < 4; i++) {
      if (wildcardParts[i] !== '*' && wildcardParts[i] !== ipParts[i]) {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    Logger.log('ワイルドカードチェックエラー: ' + e.toString());
    return false;
  }
}

/**
 * IPアドレス制御が有効かどうかを取得
 * @return {boolean} IPアドレス制御が有効かどうか
 */
function isIPAccessControlEnabled() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
    
    if (!sheet) {
      return false;
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 「IPアドレス制御有効」の行を探す
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'IPアドレス制御有効') {
        const value = data[i][1];
        return value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1';
      }
    }
    
    return false; // デフォルトは無効
  } catch (e) {
    Logger.log('IPアドレス制御有効チェックエラー: ' + e.toString());
    return false;
  }
}

