// ==UserScript==
// @name         根据 IP 更新 Discourse 地区信息
// @namespace    https://www.sakurayuri.top/
// @version      ver1.9
// @description  自动获取用户当前位置并更新到 Discourse 个人资料中。
// @author       鹿目 まどか Advanced
// @match        https://linux.do/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let username;

    // 尝试通过头像 URL 提取用户名
    const avatarImg = document.querySelector('img[src^="https://linux.do/user_avatar/linux.do/"]');

    if (avatarImg) {
        const avatarSrc = avatarImg.src;
        const parts = avatarSrc.split('/');
        username = parts[5];  // 提取第五个部分作为用户名
        console.log("Username from avatar URL:", username);
    }

    // 如果头像 URL 提取失败，则使用 baseURI 提取法
    if (!username) {
        const baseURI = document.baseURI;
        const usernameMatch = baseURI.match(/\/u\/([^\/]+)\//);
        if (usernameMatch) {
            username = usernameMatch[1];
            console.log("Username from baseURI:", username);
        }
    }

    // 如果仍然获取失败，尝试通过 iframe 获取
    if (!username) {
        console.log("Loading iframe...");

        // 创建一个隐藏的 iframe 加载用户的个人资料页面
        const iframe = document.createElement('iframe');
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.src = 'https://linux.do/my/preferences/profile'; // 加载当前用户的个人资料页面

        document.body.appendChild(iframe);

        iframe.onload = function() {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            const avatarImgInIframe = iframeDocument.querySelector('img[src^="https://linux.do/user_avatar/linux.do/"]');

            if (avatarImgInIframe) {
                const avatarSrc = avatarImgInIframe.src;
                const parts = avatarSrc.split('/');
                username = parts[5];  // 提取第五部分作为用户名
                console.log("Username extracted from avatar URL in iframe:", username);

                executeUpdate(iframeDocument, username, iframe);
            } else {
                console.error("Username could not be extracted from iframe");
                // 延迟销毁 iframe
                setTimeout(() => iframe.remove(), 1000);
            }
        };
    } else {
        executeUpdate(document, username, null);
    }

    function executeUpdate(doc, username, iframe) {
        const apiUrl = `/u/${username}.json`;

        // 从页面中获取 CSRF 令牌确保登录
        const csrfToken = doc.querySelector('meta[name="csrf-token"]').content;

        if (!csrfToken) {
            console.error("CSRF token not found");
            // 延迟销毁 iframe
            if (iframe) setTimeout(() => iframe.remove(), 1000);
            return;
        }

        // 获取用户 IP 位置
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://ip-api.com/json",
            onload: function(response) {
                const responseData = JSON.parse(response.responseText);
                const location = `IP: ${responseData.country}`;
                console.log("Formatted Location:", location);

                const data = {
                    location: location  // 设置格式化的位置信息
                };

                console.log("Sending data:", JSON.stringify(data));

                // 发送 PUT 请求，更新地区信息
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
                        alert("地区信息已成功更新！");
                    }
                    // 延迟销毁 iframe
                    if (iframe) setTimeout(() => iframe.remove(), 1000);
                })
                .catch((error) => {
                    console.error("Request failed:", error);
                    alert("更新地区信息失败，请检查控制台日志。");
                    // 延迟销毁 iframe
                    if (iframe) setTimeout(() => iframe.remove(), 1000);
                });
            }
        });
    }

})();
