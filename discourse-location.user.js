// ==UserScript==
// @name         根据 IP 更新 Discourse 地区信息
// @namespace    https://www.sakurayuri.top/
// @version      ver3.7
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

    // 优先使用外部的 baseURI 提取法
    const baseURI = document.baseURI;
    const usernameMatch = baseURI.match(/\/u\/([^\/]+)\//);

    if (usernameMatch) {
        username = usernameMatch[1];
        console.log("Username from baseURI:", username);
        checkAndUpdateLocation(username);
    } else {
        // 如果 baseURI 方法失败，则加载 iframe 进行提取
        console.log("baseURI failed, loading iframe...");

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
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

            // 直接尝试通过 iframe 内的跳转后的 URL 提取用户名
            const redirectedUrl = iframe.contentWindow.location.href;
            const usernameMatch = redirectedUrl.match(/https:\/\/linux\.do\/u\/([^\/]+)\/preferences\/profile/);

            if (usernameMatch) {
                username = usernameMatch[1];
                console.log("Username extracted from redirected URL:", username);
                checkAndUpdateLocation(username, iframe);
            } else {
                console.error("Username could not be extracted from redirected URL, trying element methods.");

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
        let avatarImg = document.querySelector('img[src^="https://linux.do/user_avatar/linux.do/"]');

        if (avatarImg) {
            const avatarSrc = avatarImg.src;
            const parts = avatarSrc.split('/');
            username = parts[5];
            console.log("Username from avatar URL:", username);
            checkAndUpdateLocation(username, iframe);
        } else {
            console.error("Username could not be extracted from avatar URL.");
            if (iframe) setTimeout(() => iframe.remove(), 1000);
        }
    }

    function checkAndUpdateLocation(username, iframe = null) {

        const apiUrl = `/u/${username}.json`;

        GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            onload: function(response) {
                const userData = JSON.parse(response.responseText);
                const currentLocation = userData.user.location;

                GM_xmlhttpRequest({
                    method: "GET",
                    url: "http://ip-api.com/json",
                    onload: function(response) {
                        const responseData = JSON.parse(response.responseText);
                        const country = responseData.country;
                        const regionName = responseData.regionName
                        const expectedLocation = `IP: ${country}, ${regionName}`;
                        console.log("Current IP location:", expectedLocation);

                        if (currentLocation === expectedLocation) {
                            console.log("Location is already up-to-date:", currentLocation);
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

        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

        if (!csrfToken) {
            console.error("CSRF token not found");
            if (iframe) setTimeout(() => iframe.remove(), 1000);
            return;
        }

        const data = {
            location: newLocation
        };

        console.log("Sending data:", JSON.stringify(data));

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
            if (iframe) setTimeout(() => iframe.remove(), 1000);
        })
        .catch((error) => {
            console.error("Request failed:", error);
            if (iframe) setTimeout(() => iframe.remove(), 1000);
        });
    }

})();
