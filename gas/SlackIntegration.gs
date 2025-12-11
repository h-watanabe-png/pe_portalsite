/**
 * PEポータルサイト - Slack連携
 * 
 * Slack通知とスレッド管理の強化
 */

/**
 * Slack通知を送信（拡張版）
 * @param {Object} data - 通知データ
 * @param {string} type - 通知タイプ（new_request, status_update, correspondence等）
 * @param {string} requestType - 依頼タイプ（system_team, accounting）
 * @return {Object} 送信結果
 */
function sendSlackNotificationEnhanced(data, type, requestType = 'system_team') {
  try {
    const config = getConfig();
    
    // Slack設定を取得
    const slackWebhookUrl = config.slack?.webhookUrl || '';
    const slackChannel = config.slack?.channel || '';
    
    if (!slackWebhookUrl) {
      Logger.log('Slack Webhook URLが設定されていません');
      return {
        success: false,
        error: 'Slack Webhook URLが設定されていません'
      };
    }
    
    // 通知メッセージを構築
    const message = buildSlackMessage(data, type, requestType);
    
    // Slackに送信
    const response = UrlFetchApp.fetch(slackWebhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      let threadUrl = '';
      
      // スレッド情報を保存
      if (data.requestId && responseData.ts) {
        threadUrl = `https://${slackChannel}.slack.com/archives/${responseData.channel}/p${responseData.ts.replace('.', '')}`;
        saveSlackThreadInfo(data.requestId, responseData.ts, responseData.channel, threadUrl);
      }
      
      Logger.log(`Slack通知を送信しました: ${type}`);
      
      return {
        success: true,
        message: 'Slack通知を送信しました',
        threadTs: responseData.ts,
        threadUrl: threadUrl
      };
    } else {
      Logger.log(`Slack通知送信エラー: ${response.getResponseCode()}`);
      return {
        success: false,
        error: `Slack通知送信エラー: ${response.getResponseCode()}`
      };
    }
  } catch (e) {
    Logger.log('Slack通知送信エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * Slackメッセージを構築
 * @param {Object} data - 通知データ
 * @param {string} type - 通知タイプ
 * @param {string} requestType - 依頼タイプ
 * @return {Object} Slackメッセージオブジェクト
 */
function buildSlackMessage(data, type, requestType) {
  const baseMessage = {
    channel: '',
    username: 'PEポータルサイト',
    icon_emoji: ':computer:',
    text: '',
    blocks: []
  };
  
  switch (type) {
    case 'new_request':
      return buildNewRequestMessage(data, requestType);
    case 'status_update':
      return buildStatusUpdateMessage(data);
    case 'correspondence':
      return buildCorrespondenceMessage(data);
    default:
      baseMessage.text = JSON.stringify(data);
      return baseMessage;
  }
}

/**
 * 新規依頼通知メッセージを構築
 * @param {Object} data - 依頼データ
 * @param {string} requestType - 依頼タイプ
 * @return {Object} Slackメッセージオブジェクト
 */
function buildNewRequestMessage(data, requestType) {
  const requestTypeLabel = requestType === 'system_team' ? 'システムチーム' : '経理';
  const urgencyColor = {
    '高': '#d32f2f',
    '中': '#f57c00',
    '低': '#1976d2'
  }[data.urgency] || '#666';
  
  return {
    channel: '',
    username: 'PEポータルサイト',
    icon_emoji: ':bell:',
    text: `新しい${requestTypeLabel}への依頼が届きました`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `新しい${requestTypeLabel}への依頼`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*依頼者:*\n${data.requesterName || '不明'}`
          },
          {
            type: 'mrkdwn',
            text: `*ブランド:*\n${data.brand || '不明'}`
          },
          {
            type: 'mrkdwn',
            text: `*緊急度:*\n${data.urgency || '不明'}`
          },
          {
            type: 'mrkdwn',
            text: `*依頼ID:*\n${data.requestId || '不明'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*内容:*\n${data.issue || data.requestContent || '内容なし'}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `依頼ID: ${data.requestId || '不明'} | 送信日時: ${formatDate(new Date())}`
          }
        ]
      }
    ]
  };
}

/**
 * ステータス更新通知メッセージを構築
 * @param {Object} data - 更新データ
 * @return {Object} Slackメッセージオブジェクト
 */
function buildStatusUpdateMessage(data) {
  return {
    channel: '',
    username: 'PEポータルサイト',
    icon_emoji: ':arrows_counterclockwise:',
    text: `依頼のステータスが更新されました`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*依頼ID:* ${data.requestId}\n*新しいステータス:* ${data.status}\n*更新者:* ${data.updatedBy || '不明'}`
        }
      }
    ]
  };
}

/**
 * 対応履歴通知メッセージを構築
 * @param {Object} data - 対応データ
 * @return {Object} Slackメッセージオブジェクト
 */
function buildCorrespondenceMessage(data) {
  return {
    channel: '',
    username: 'PEポータルサイト',
    icon_emoji: ':memo:',
    text: `対応履歴が追加されました`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*対応者:* ${data.responder}\n*対応内容:* ${data.content}\n*対応結果:* ${data.result || '未設定'}`
        }
      }
    ]
  };
}

/**
 * 対応履歴を追加してSlack通知を送信
 * @param {string} requestId - 依頼ID
 * @param {string} responder - 対応者
 * @param {string} content - 対応内容
 * @param {string} result - 対応結果
 * @param {Array<string>} tags - タグ
 * @return {Object} 処理結果
 */
function addCorrespondenceAndNotify(requestId, responder, content, result, tags = []) {
  try {
    // 対応履歴を追加
    const historyResult = addCorrespondenceHistory(requestId, responder, content, result, '', tags);
    
    if (!historyResult.success) {
      return historyResult;
    }
    
    // Slack通知を送信
    const slackResult = sendSlackNotificationEnhanced({
      requestId: requestId,
      responder: responder,
      content: content,
      result: result
    }, 'correspondence');
    
    // Slackスレッド情報を対応履歴にリンク
    if (slackResult.success && slackResult.threadUrl) {
      linkCorrespondenceToSlack(historyResult.correspondenceId, slackResult.threadUrl);
    }
    
    return {
      success: true,
      correspondenceId: historyResult.correspondenceId,
      slackThreadUrl: slackResult.threadUrl || '',
      message: '対応履歴を追加し、Slack通知を送信しました'
    };
  } catch (e) {
    Logger.log('対応履歴追加とSlack通知エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * Slack情報を同期（GAS版）
 * スクリプトプロパティからslack_bot_tokenとs-hometutor_idを取得して
 * Slack APIからユーザー情報とチャンネル情報を取得し、スプレッドシートに書き込む
 * @return {Object} 処理結果
 */
function syncSlackInfo() {
  try {
    // スクリプトプロパティからSlack設定を取得
    const properties = PropertiesService.getScriptProperties();
    const botToken = properties.getProperty('slack_bot_token');
    const workspaceId = properties.getProperty('s-hometutor_id');
    
    if (!botToken) {
      return {
        success: false,
        error: 'slack_bot_tokenがスクリプトプロパティに設定されていません'
      };
    }
    
    if (!workspaceId) {
      return {
        success: false,
        error: 's-hometutor_idがスクリプトプロパティに設定されていません'
      };
    }
    
    Logger.log(`Slack情報同期を開始します（ワークスペースID: ${workspaceId}）`);
    
    // Slackユーザー情報を取得
    const users = getSlackUsers(botToken);
    Logger.log(`${users.length}件のユーザーを取得しました`);
    
    // Slackチャンネル情報を取得
    const channels = getSlackChannels(botToken);
    Logger.log(`${channels.length}件のチャンネルを取得しました`);
    
    // スプレッドシートに書き込み
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // シートを作成または取得
    let usersSheet = spreadsheet.getSheetByName('Slack_ユーザー');
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet('Slack_ユーザー');
    }
    
    let channelsSheet = spreadsheet.getSheetByName('Slack_チャンネル');
    if (!channelsSheet) {
      channelsSheet = spreadsheet.insertSheet('Slack_チャンネル');
    }
    
    // ユーザー情報を書き込み
    writeUsersToSheet(usersSheet, users);
    
    // チャンネル情報を書き込み
    writeChannelsToSheet(channelsSheet, channels);
    
    Logger.log('Slack情報同期が完了しました');
    
    return {
      success: true,
      message: 'Slack情報同期が完了しました',
      usersCount: users.length,
      channelsCount: channels.length
    };
  } catch (e) {
    Logger.log('Slack情報同期エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * Slackユーザー一覧を取得
 * @param {string} botToken - Slack Bot Token
 * @return {Array<Object>} ユーザーリスト
 */
function getSlackUsers(botToken) {
  const url = 'https://slack.com/api/users.list';
  const options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + botToken,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    throw new Error(`Slack API エラー: HTTP ${responseCode}`);
  }
  
  const data = JSON.parse(response.getContentText());
  
  if (!data.ok) {
    throw new Error(`Slack API エラー: ${data.error || 'Unknown error'}`);
  }
  
  return data.members || [];
}

/**
 * Slackチャンネル一覧を取得
 * @param {string} botToken - Slack Bot Token
 * @return {Array<Object>} チャンネルリスト
 */
function getSlackChannels(botToken) {
  const allChannels = [];
  let cursor = null;
  
  do {
    const url = 'https://slack.com/api/conversations.list';
    const params = {
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000
    };
    
    if (cursor) {
      params.cursor = cursor;
    }
    
    const queryString = Object.keys(params).map(key => 
      encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    ).join('&');
    
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + botToken,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url + '?' + queryString, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`Slack API エラー: HTTP ${responseCode}`);
    }
    
    const data = JSON.parse(response.getContentText());
    
    if (!data.ok) {
      throw new Error(`Slack API エラー: ${data.error || 'Unknown error'}`);
    }
    
    const channels = data.channels || [];
    allChannels.push(...channels);
    
    const responseMetadata = data.response_metadata || {};
    cursor = responseMetadata.next_cursor || null;
    
  } while (cursor);
  
  return allChannels;
}

/**
 * ユーザー情報をスプレッドシートに書き込む
 * @param {Sheet} sheet - スプレッドシートのシート
 * @param {Array<Object>} users - ユーザーリスト
 */
function writeUsersToSheet(sheet, users) {
  // ヘッダー行
  const headers = [
    'ユーザーID',
    '表示名',
    '実名',
    'メールアドレス',
    'ステータス',
    '削除済み',
    'ボット',
    'タイムゾーン',
    '最終更新日時'
  ];
  
  // データ行
  const rows = [headers];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const profile = user.profile || {};
    
    const row = [
      user.id || '',
      profile.display_name || profile.real_name || '',
      profile.real_name || '',
      profile.email || '',
      user.presence || '',
      user.deleted ? 'はい' : 'いいえ',
      user.is_bot ? 'はい' : 'いいえ',
      user.tz || '',
      user.updated || 0
    ];
    rows.push(row);
  }
  
  // シートをクリア
  sheet.clear();
  
  // データを書き込み
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    
    // ヘッダー行を太字にする
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
  }
}

/**
 * チャンネル情報をスプレッドシートに書き込む
 * @param {Sheet} sheet - スプレッドシートのシート
 * @param {Array<Object>} channels - チャンネルリスト
 */
function writeChannelsToSheet(sheet, channels) {
  // ヘッダー行
  const headers = [
    'チャンネルID',
    'チャンネル名',
    '説明',
    '作成日時',
    'メンバー数',
    'プライベート',
    'アーカイブ済み',
    '共有チャンネル',
    '最終更新日時'
  ];
  
  // データ行
  const rows = [headers];
  
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const topic = channel.topic || {};
    const purpose = channel.purpose || {};
    
    const row = [
      channel.id || '',
      channel.name || '',
      topic.value || purpose.value || '',
      channel.created || 0,
      channel.num_members || 0,
      channel.is_private ? 'はい' : 'いいえ',
      channel.is_archived ? 'はい' : 'いいえ',
      channel.is_shared ? 'はい' : 'いいえ',
      channel.updated || 0
    ];
    rows.push(row);
  }
  
  // シートをクリア
  sheet.clear();
  
  // データを書き込み
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    
    // ヘッダー行を太字にする
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
  }
}

