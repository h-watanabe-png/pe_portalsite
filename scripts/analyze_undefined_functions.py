#!/usr/bin/env python3
"""
GASプロジェクトの未定義関数を解析するスクリプト
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def extract_function_definitions(content):
    """関数定義を抽出"""
    definitions = set()
    # function functionName(...) パターン
    pattern = r'^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
    for match in re.finditer(pattern, content, re.MULTILINE):
        definitions.add(match.group(1))
    return definitions

def extract_function_calls(content):
    """関数呼び出しを抽出"""
    calls = set()
    # 関数呼び出しパターン（簡易版）
    # 注意: これは完全ではないが、主要な呼び出しを検出
    pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
    for match in re.finditer(pattern, content):
        func_name = match.group(1)
        # 組み込み関数や予約語を除外
        if func_name not in ['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'typeof', 'instanceof', 'console', 'Logger', 'Session', 'SpreadsheetApp', 'HtmlService', 'ContentService', 'CacheService', 'PropertiesService', 'LockService', 'ScriptApp', 'DriveApp', 'UrlFetchApp', 'Utilities', 'Date', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', 'fetch', 'document', 'window', 'google', 'getElementById', 'getElementsByClassName', 'querySelector', 'querySelectorAll', 'addEventListener', 'removeEventListener', 'appendChild', 'removeChild', 'insertBefore', 'replaceChild', 'createElement', 'createTextNode', 'getAttribute', 'setAttribute', 'removeAttribute', 'classList', 'textContent', 'innerHTML', 'value', 'get', 'set', 'put', 'remove', 'openById', 'getSheetByName', 'getDataRange', 'getValues', 'setValues', 'appendRow', 'insertSheet', 'deleteRow', 'getRange', 'setValue', 'getLastRow', 'getLastColumn', 'clear', 'setFrozenRows', 'setColumnWidth', 'getEmail', 'getActiveUser', 'log', 'createHtmlOutput', 'createHtmlOutputFromFile', 'createTemplateFromFile', 'createTextOutput', 'evaluate', 'setTitle', 'setXFrameOptionsMode', 'setMimeType', 'getContent', 'getContentText', 'getResponseCode', 'fetch', 'getFileById', 'getFolderById', 'getFiles', 'getFolders', 'hasNext', 'next', 'getName', 'getUrl', 'getMimeType', 'getSize', 'getLastUpdated', 'getParents', 'addFile', 'removeFile', 'insertSheet', 'getSheetId', 'getUuid', 'formatDate', 'sleep', 'getScriptProperties', 'getProperty', 'setProperty', 'deleteProperty', 'getKeys', 'getScriptCache', 'getDocumentLock', 'getScriptLock', 'tryLock', 'releaseLock', 'newTrigger', 'timeBased', 'after', 'everyDays', 'atHour', 'onMonthDay', 'create', 'deleteTrigger', 'getProjectTriggers', 'getHandlerFunction', 'getEventType', 'getTriggerSource']:
            calls.add(func_name)
    return calls

def analyze_gas_project(gas_dir):
    """GASプロジェクトを解析"""
    gas_path = Path(gas_dir)
    all_definitions = set()
    all_calls = defaultdict(set)
    file_definitions = {}
    
    # すべての.gsファイルを読み込む
    for gs_file in gas_path.glob('*.gs'):
        with open(gs_file, 'r', encoding='utf-8') as f:
            content = f.read()
            definitions = extract_function_definitions(content)
            calls = extract_function_calls(content)
            
            all_definitions.update(definitions)
            all_calls[gs_file.name].update(calls)
            file_definitions[gs_file.name] = definitions
    
    # 未定義関数を特定
    undefined_functions = defaultdict(list)
    for filename, calls in all_calls.items():
        for call in calls:
            if call not in all_definitions:
                undefined_functions[call].append(filename)
    
    return {
        'definitions': all_definitions,
        'calls': all_calls,
        'undefined': undefined_functions,
        'file_definitions': file_definitions
    }

if __name__ == '__main__':
    gas_dir = 'gas'
    result = analyze_gas_project(gas_dir)
    
    print("=== 未定義関数一覧 ===")
    for func_name, files in sorted(result['undefined'].items()):
        print(f"{func_name}: {', '.join(files)}")
    
    print(f"\n総定義数: {len(result['definitions'])}")
    print(f"未定義関数数: {len(result['undefined'])}")

