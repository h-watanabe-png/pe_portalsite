/**
 * PEポータルサイト - 認証・認可
 * 
 * ユーザー認証とアクセス制御を管理
 */

/**
 * ユーザー情報を取得
 * @return {Object} ユーザー情報
 */
function getUserInfo() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    const authResult = checkAuthorization();
    
    return {
      success: true,
      email: email,
      authorized: authResult.authorized,
      reason: authResult.reason || ''
    };
  } catch (e) {
    Logger.log('getUserInfo エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}
