// ==UserScript==
// @name         根据 IP 更新 Discourse 地区信息
// @namespace    https://www.sakurayuri.top/
// @version      ver3.0
// @description  自动获取用户当前位置并更新到 Discourse 个人资料中。
// @author       鹿目 まどか Advanced
// @match        https://linux.do/*
// @icon         https://www.sakurayuri.top/favicon.ico
// @license      MIT
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let username;
    let iframeLoaded = false;  // 防止 onload 回调被多次执行

    // 优先使用 baseURI 提取法
    const baseURI = document.baseURI;
    const usernameMatch = baseURI.match(/\/u\/([^\/]+)\//);
    if (usernameMatch) {
        username = usernameMatch[1];
        console.log("Username from baseURI:", username);
        checkAndUpdateLocation(username);
    } else {
        // 如果 baseURI 方法失败，则尝试 iframe 方法
        console.log("BaseURI failed, loading iframe...");

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '50%';
        iframe.style.left = '50%';
        iframe.style.transform = 'translate(-50%, -50%)';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.src = 'https://linux.do/my/preferences/profile';

        document.body.appendChild(iframe);

        iframe.onload = function() {
            if (iframeLoaded) return;  // 防止多次执行
            iframeLoaded = true;

            // 先尝试通过跳转后的 URL 提取用户名
            const redirectedUrl = iframe.contentWindow.location.href;
            const usernameMatch = redirectedUrl.match(/https:\/\/linux\.do\/([^\/]+)\/preferences\/profile/);

            if (usernameMatch) {
                username = usernameMatch[1];
                console.log("Username extracted from redirected URL:", username);
                checkAndUpdateLocation(username, iframe);
            } else {
                console.error("Username could not be extracted from redirected URL, trying element methods.");

                // 如果跳转法失败，尝试提取页面元素中的用户名
                const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                const usernameElement = iframeDocument.querySelector('.username.user-profile-names__secondary');

                if (usernameElement) {
                    username = usernameElement.textContent.trim();
                    console.log("Username extracted from username element in iframe:", username);
                    checkAndUpdateLocation(username, iframe);
                } else {
                    console.error("Username could not be extracted from iframe, trying avatar method.");
                    tryAvatarMethod(iframe);
                }
            }
        };
    }

    function tryAvatarMethod(iframe) {
        // 尝试通过头像 URL 提取用户名
        let avatarImg = document.querySelector('img[src^="https://linux.do/user_avatar/linux.do/"]');

        if (avatarImg) {
            const avatarSrc = avatarImg.src;
            const parts = avatarSrc.split('/');
            username = parts[5];  // 提取第五个部分作为用户名
            console.log("Username from avatar URL:", username);
            checkAndUpdateLocation(username, iframe);
        } else {
            console.error("Username could not be extracted from avatar URL.");
            // 延迟销毁 iframe
            if (iframe) setTimeout(() => iframe.remove(), 1000);
        }
    }

    function checkAndUpdateLocation(username, iframe = null) {
        // 检查是否在 iframe 中，如果是则直接退出
        if (iframe) {
            console.log("Script is running inside an iframe, exiting.");
            setTimeout(() => iframe.remove(), 1000);
            return;
        }

        const apiUrl = `/u/${username}.json`;

        // 先获取用户的当前位置数据
        GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            onload: function(response) {
                const userData = JSON.parse(response.responseText);
                const currentLocation = userData.user.location;

                // 获取当前 IP 所在国家 / 地区
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "http://ip-api.com/json",
                    onload: function(response) {
                        const responseData = JSON.parse(response.responseText);
                        const country = responseData.country;
                        const expectedLocation = `IP: ${country}`;
                        console.log("Current IP location:", expectedLocation);

                        // 检查当前位置是否已经匹配
                        if (currentLocation === expectedLocation) {
                            console.log("Location is already up-to-date:", currentLocation);
                            // 如果位置已经被更新的，则不再更新，结束程序
                            if (iframe) setTimeout(() => iframe.remove(), 1000);
                        } else {
                            console.log("Location updates. Before:", currentLocation, "Expected:", expectedLocation);
                            executeUpdate(username, expectedLocation, iframe);
                        }
                    }
                });
            }
        });
    }

    function executeUpdate(username, newLocation, iframe) {
        const apiUrl = `/u/${username}.json`;

        // 从页面中获取 CSRF 令牌确保登录
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

        if (!csrfToken) {
            console.error("CSRF token not found");
            // 延迟销毁 iframe
            if (iframe) setTimeout(() => iframe.remove(), 1000);
            return;
        }

        const data = {
            location: newLocation  // 设置位置信息
        };

        console.log("Sending data:", JSON.stringify(data));

        // 发送 PUT 请求，更新位置信息
        fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            console.log("Response status:", response.status);
            return response.json();
        })
        .then(data => {
            if (data.errors) {
                console.error("Error:", data.errors);
            } else {
                console.log("Location updated successfully:", data);
            }
            // 延迟销毁 iframe
            if (iframe) setTimeout(() => iframe.remove(), 1000);
        })
        .catch((error) => {
            console.error("Request failed:", error);
            // 延迟销毁 iframe
            if (iframe) setTimeout(() => iframe.remove(), 1000);
        });
    }

})();
