// ==UserScript==
// @name         Discourse 按三次 Enter 添加小尾巴
// @namespace    http://tampermonkey.net/
// @version      ver1.0
// @description  在 Discourse 回复或创建帖子时按三次 Enter 后自动添加小尾巴
// @author       鹿目 まどか Advanced
// @match        https://linux.do/*
// @icon         https://haojiezhe12345.top:82/madohomu/res/favicon-320.png
// @license      MIT
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    let enterCount = 0;

    // Browser
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser, version;

        if (ua.indexOf("Chrome") > -1) {
            browser = "Google Chrome";
            version = ua.match(/Chrome\/([0-9]+)/)[1];
        } else if (ua.indexOf("Firefox") > -1) {
            browser = "Firefox";
            version = ua.match(/Firefox\/([0-9]+)/)[1];
        } else if (ua.indexOf("Safari") > -1) {
            browser = "Safari";
            version = ua.match(/Version\/([0-9]+)/)[1];
        } else {
            browser = "Web Browser";
            version = "";
        }

        return `${browser} ${version}`;
    }

    // System
    function getOSInfo() {
        const ua = navigator.userAgent;
        let os;

        if (ua.indexOf('Windows NT 10.0') > -1) {
            os = "Windows 10";
        } else if (ua.indexOf('Windows NT 6.3') > -1) {
            os = "Windows 8.1";
        } else if (ua.indexOf('Windows NT 6.2') > -1) {
            os = "Windows 8";
        } else if (ua.indexOf('Windows NT 6.1') > -1) {
            os = "Windows 7";
        } else if (ua.indexOf('Mac OS X') > -1) {
            os = ua.match(/Mac OS X ([\d_]+)/)[0].replace(/_/g, '.');
        } else if (ua.indexOf('Linux') > -1) {
            os = "Linux";
        } else {
            os = "Unknown OS";
        }

        return os;
    }

    // IP
    function getLocation(callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://ip-api.com/json",
            onload: function(response) {
                const location = JSON.parse(response.responseText).country;
                callback(location);
            }
        });
    }

    // Date & Time
    function getCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }

    // Length detection
    function isContentValid() {
        const textarea = document.querySelector('textarea.d-editor-input');
        if (textarea) {
            const content = textarea.value.trim().replace(/\s+/g, ''); // 去掉空格
            return content.length >= 8;
        }
        return false;
    }

    // Insert
    function insertSignature(location) {
        const browserInfo = getBrowserInfo();
        const osInfo = getOSInfo();
        const dateTime = getCurrentDateTime();

        const signature = `\n***\n<div style="text-align:center" dir="auto"><span style="font-size:80%">\n${browserInfo} | ${osInfo} | ${location} | ${dateTime}</span></div>`;

        const textarea = document.querySelector('textarea.d-editor-input');
        if (textarea) {
            textarea.value += signature;
        }
    }

    // 3 Enters
    $(document).on('keydown', 'textarea.d-editor-input', function(event) {
        if (event.key === 'Enter') {
            enterCount++;
            if (enterCount === 3 && isContentValid()) {
                getLocation(insertSignature);
                enterCount = 0;
            }
        } else {
            enterCount = 0; // Reset Counts
        }
    });

})();
