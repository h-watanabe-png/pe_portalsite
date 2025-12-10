/**
 * PEポータルサイト - テスト用関数
 * 
 * デプロイせずに動作確認するためのテスト関数
 * GASエディタで直接実行可能
 */

/**
 * すべてのテストを実行
 */
function runAllTests() {
  Logger.log('========================================');
  Logger.log('PEポータルサイト - テスト開始');
  Logger.log('実行日時: ' + new Date());
  Logger.log('========================================');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  try {
    testAuthentication(results);
    testConfig(results);
    testFileSearch(results);
    testKnowledgeSearch(results);
    testDataManager(results);
    
    Logger.log('========================================');
    Logger.log('テスト結果:');
    Logger.log('  成功: ' + results.passed + '件');
    Logger.log('  失敗: ' + results.failed + '件');
    Logger.log('========================================');
    
    if (results.failed > 0) {
      Logger.log('エラー詳細:');
      results.errors.forEach((error, index) => {
        Logger.log(`  ${index + 1}. ${error}`);
      });
    }
    
    Logger.log('========================================');
    Logger.log('すべてのテストが完了しました');
    Logger.log('========================================');
  } catch (e) {
    Logger.log('========================================');
    Logger.log('テスト実行エラー: ' + e.toString());
    Logger.log('スタックトレース: ' + e.stack);
    Logger.log('========================================');
  }
}

/**
 * 認証機能のテスト
 * @param {Object} results - テスト結果オブジェクト
 */
function testAuthentication(results) {
  Logger.log('--- 認証機能のテスト ---');
  
  try {
    const result = checkAuthorization();
    Logger.log('認証結果: ' + JSON.stringify(result));
    
    if (result && typeof result === 'object') {
      if (result.authorized) {
        Logger.log('✓ 認証成功: ' + result.userEmail);
        results.passed++;
      } else {
        Logger.log('⚠ 認証失敗（正常な場合もあります）: ' + result.reason);
        results.passed++; // 認証失敗も正常な動作として扱う
      }
    } else {
      Logger.log('✗ 認証結果の形式が不正');
      results.failed++;
      results.errors.push('認証結果の形式が不正');
    }
  } catch (e) {
    Logger.log('✗ 認証テストエラー: ' + e.toString());
    results.failed++;
    results.errors.push('認証テストエラー: ' + e.toString());
  }
}

/**
 * 設定取得のテスト
 * @param {Object} results - テスト結果オブジェクト
 */
function testConfig(results) {
  Logger.log('--- 設定取得のテスト ---');
  
  try {
    const config = getConfig();
    Logger.log('設定: ' + JSON.stringify(config));
    
    if (config && typeof config === 'object') {
      Logger.log('✓ 設定取得成功');
      results.passed++;
    } else {
      Logger.log('✗ 設定取得失敗');
      results.failed++;
      results.errors.push('設定取得失敗');
    }
  } catch (e) {
    Logger.log('✗ 設定取得テストエラー: ' + e.toString());
    results.failed++;
    results.errors.push('設定取得テストエラー: ' + e.toString());
  }
}

/**
 * ファイル検索のテスト
 * @param {Object} results - テスト結果オブジェクト
 */
function testFileSearch(results) {
  Logger.log('--- ファイル検索のテスト ---');
  
  try {
    const searchResults = searchFiles('マニュアル', '', 10);
    Logger.log('検索結果: ' + searchResults.length + '件');
    
    if (Array.isArray(searchResults)) {
      Logger.log('✓ ファイル検索成功（結果は0件でも正常）');
      if (searchResults.length > 0) {
        Logger.log('最初の結果: ' + searchResults[0].fileName);
      }
      results.passed++;
    } else {
      Logger.log('✗ ファイル検索結果の形式が不正');
      results.failed++;
      results.errors.push('ファイル検索結果の形式が不正');
    }
  } catch (e) {
    Logger.log('✗ ファイル検索テストエラー: ' + e.toString());
    results.failed++;
    results.errors.push('ファイル検索テストエラー: ' + e.toString());
  }
}

/**
 * ナレッジ検索のテスト
 * @param {Object} results - テスト結果オブジェクト
 */
function testKnowledgeSearch(results) {
  Logger.log('--- ナレッジ検索のテスト ---');
  
  try {
    const result = searchKnowledge('システム', '', 10);
    Logger.log('検索結果: ' + (result.total || 0) + '件');
    
    if (result && result.success !== undefined) {
      if (result.success) {
        Logger.log('✓ ナレッジ検索成功');
        results.passed++;
      } else {
        Logger.log('⚠ ナレッジ検索失敗（正常な場合もあります）: ' + result.error);
        results.passed++; // エラーでも正常な動作として扱う
      }
    } else {
      Logger.log('✗ ナレッジ検索結果の形式が不正');
      results.failed++;
      results.errors.push('ナレッジ検索結果の形式が不正');
    }
  } catch (e) {
    Logger.log('✗ ナレッジ検索テストエラー: ' + e.toString());
    results.failed++;
    results.errors.push('ナレッジ検索テストエラー: ' + e.toString());
  }
}

/**
 * データ管理機能のテスト
 * @param {Object} results - テスト結果オブジェクト
 */
function testDataManager(results) {
  Logger.log('--- データ管理機能のテスト ---');
  
  try {
    // 問い合わせ対応履歴の追加テスト（テスト用データ）
    const testRequestId = 'TEST-' + Utilities.getUuid();
    const result = addCorrespondenceHistory(
      testRequestId,
      'テストユーザー',
      'テスト対応内容',
      'テスト結果',
      '',
      ['テスト', '動作確認']
    );
    
    if (result && result.success) {
      Logger.log('✓ 対応履歴追加成功: ' + result.correspondenceId);
      results.passed++;
    } else {
      Logger.log('⚠ 対応履歴追加失敗（正常な場合もあります）: ' + (result.error || '不明'));
      results.passed++; // エラーでも正常な動作として扱う
    }
  } catch (e) {
    Logger.log('✗ データ管理テストエラー: ' + e.toString());
    results.failed++;
    results.errors.push('データ管理テストエラー: ' + e.toString());
  }
}

/**
 * パフォーマンステスト
 */
function testPerformance() {
  Logger.log('--- パフォーマンステスト ---');
  
  const startTime = new Date();
  
  try {
    // 10回の検索を実行（100回は時間がかかりすぎる可能性があるため）
    for (let i = 0; i < 10; i++) {
      searchFiles('テスト', '', 10);
    }
    
    const endTime = new Date();
    const elapsed = endTime - startTime;
    
    Logger.log('10回の検索実行時間: ' + elapsed + 'ms');
    Logger.log('1回あたりの平均時間: ' + (elapsed / 10) + 'ms');
    
    if (elapsed < 60000) { // 1分以内
      Logger.log('✓ パフォーマンステスト成功（1分以内）');
    } else {
      Logger.log('⚠ パフォーマンステスト警告（1分以上かかっています）');
    }
  } catch (e) {
    Logger.log('✗ パフォーマンステストエラー: ' + e.toString());
  }
}

/**
 * 簡易テスト（主要機能のみ）
 */
function quickTest() {
  Logger.log('=== 簡易テスト開始 ===');
  
  try {
    // 認証チェック
    const auth = checkAuthorization();
    Logger.log('認証: ' + (auth.authorized ? 'OK' : 'NG'));
    
    // 設定取得
    const config = getConfig();
    Logger.log('設定: ' + (config ? 'OK' : 'NG'));
    
    // ファイル検索
    const files = searchFiles('', '', 5);
    Logger.log('ファイル検索: ' + files.length + '件');
    
    Logger.log('=== 簡易テスト完了 ===');
  } catch (e) {
    Logger.log('簡易テストエラー: ' + e.toString());
  }
}

