// ==UserScript==
// @name         MadoHomu! 橘味小尾巴
// @version      yuri1.7
// @description  在 Discourse 回复或创建帖子时按下 Alt + Enter 后自动添加橘味小尾巴
// @author       鹿目 まどか Advanced
// @match        https://linux.do/*
// @icon         https://www.sakurayuri.top/favicon.ico
// @license      MIT
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    let enterCount = 0;
    let lastEnterTime = 0;

    // 获取随机句子
    function getRandomSentence(callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://v1.yurikoto.com/sentence/",
            onload: function(response) {
                const data = JSON.parse(response.responseText);
                const content = data.content;
                const source = data.source;
                const signature = `\n***\n<div style="text-align:center" dir="auto"><span style="font-size:80%">\n「${content}」——《${source}》</span></div>`;
                callback(signature);
            }
        });
    }

    // 检查内容长度
    function isContentValid() {
        const textarea = document.querySelector('textarea.d-editor-input');
        if (textarea) {
            const content = textarea.value.trim().replace(/\s+/g, ''); // 去掉空格
            return content.length >= 6;
        }
        return false;
    }

    // 插入签名
    function insertSignature(signature) {
        const textarea = document.querySelector('textarea.d-editor-input');
        if (textarea) {
            textarea.value += signature;
        }
    }

    // 注册油猴菜单按钮
    GM_registerMenuCommand("添加橘味小尾巴", function() {
        if (isContentValid()) {
            insertSignature();
        } else {
            alert('需要至少 6 个字符。');
        }
    });
    
    // Alt + Enter
    $(document).on('keydown', 'textarea.d-editor-input', function(event) {
        if (event.key === 'Enter' && event.altKey) {
            if (isContentValid()) {
                insertSignature(signature);
            }
        }
    });
})();
