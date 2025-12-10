/**
 * PEポータルサイト - トリガー管理
 * 
 * トリガーの設定・管理を行います。
 */

/**
 * すべてのトリガーを設定
 */
function setupTriggers() {
  Logger.log('PEポータルサイト - トリガーを設定');
  
  // 既存のトリガーを削除
  deleteAllTriggers();
  
  // 1. ナレッジベースの自動インデックス化（毎日 03:00）
  ScriptApp.newTrigger('autoIndexKnowledgeBase')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();
  
  // 2. ダッシュボード集計の更新（毎日 02:00）
  ScriptApp.newTrigger('dailyDataAggregation')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
  
  Logger.log('トリガーを設定しました');
}

/**
 * すべてのトリガーを削除
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  Logger.log(`既存のトリガーを削除しました: ${triggers.length}件`);
}

/**
 * トリガーの状態を確認
 * @return {Array<Object>} トリガー情報の配列
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  return triggers.map(trigger => ({
    handlerFunction: trigger.getHandlerFunction(),
    eventType: trigger.getEventType().toString(),
    source: trigger.getTriggerSource().toString()
  }));
}
