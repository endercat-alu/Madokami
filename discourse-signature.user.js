// ==UserScript==
// @name         Madoka! 文字小尾巴
// @version      ver2.0
// @description  在 Discourse 回复或创建帖子时按下 Alt + Enter 后自动添加小尾巴，并使用 IP 选择逻辑。
// @author       鹿目 まどか Advanced
// @match        https://linux.do/*
// @icon         https://www.sakurayuri.top/favicon.ico
// @license      MIT
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    let enterCount = 0;
    let lastEnterTime = 0;
    let locationMode = localStorage.getItem('locationMode') || 'auto'; // 默认 "自动选择"

    // 注册菜单命令
    GM_registerMenuCommand("自动选择", () => setLocationMode('auto'));
    GM_registerMenuCommand("使用城市作为子位置", () => setLocationMode('city'));
    GM_registerMenuCommand("使用省份作为子位置", () => setLocationMode('region'));

    function setLocationMode(mode) {
        locationMode = mode;
        localStorage.setItem('locationMode', mode); // 保存用户选择
        console.log("Location mode set to:", mode);
        alert(`位置更新模式已设置为: ${mode === 'auto' ? '自动选择' : mode === 'city' ? '使用城市作为子位置' : '使用省份作为子位置'}`);
    }

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
                const responseData = JSON.parse(response.responseText);
                let country = responseData.country;
                let regionName = responseData.regionName;
                let city = responseData.city;

                let location;
                switch(locationMode) {
                    case 'city':
                        location = `${country}, ${city}`;
                        break;
                    case 'region':
                        location = `${country}, ${regionName}`;
                        break;
                    case 'auto':
                    default:
                        location = country === regionName ? `${country}, ${city}` : `${country}, ${regionName}`;
                }

                // 只有当 country === 子位置时才简写
                if ((locationMode === 'city' && country === city) || (locationMode === 'region' && country === regionName)) {
                    location = country;
                }

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
            return content.length >= 6;
        }
        return false;
    }

    // Insert
    function insertSignature(location) {
        const browserInfo = getBrowserInfo();
        const osInfo = getOSInfo();
        const dateTime = getCurrentDateTime();

        const signature = `\n***\n<div style="text-align:center" dir="auto"><span style="font-size:80%">\n${browserInfo} | ${osInfo} | ${location} | ${dateTime}<span style="font-size:0%"><code>madoka_sign</code>\n<code>ver2.0</code></span></span></div>`;

        const textarea = document.querySelector('textarea.d-editor-input');
        if (textarea) {
            textarea.value += signature;
        }
    }
