// ==UserScript==
// @name         Discourse IP
// @version      ver5.0
// @description  自动获取用户当前位置并更新到 Discourse 个人资料中。
// @author       鹿目 まどか Advanced
// @match        https://linux.do/*
// @icon         https://www.sakurayuri.top/favicon.ico
// @license      MIT
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const website = 'https://linux.do'; // 定义网站根 URL
    const site = 'linux.do'; // 同上

    let username;
    let locationMode = localStorage.getItem('locationMode') || 'auto'; // 默认 "自动选择"

    // 注册菜单命令
    GM_registerMenuCommand("自动选择", () => setLocationMode('auto'));
    GM_registerMenuCommand("使用城市作为子位置", () => setLocationMode('city'));
    GM_registerMenuCommand("使用省份作为子位置", () => setLocationMode('province'));

    function setLocationMode(mode) {
        locationMode = mode;
        localStorage.setItem('locationMode', mode); // 保存用户选择
        console.log("Location mode set to:", mode);
        alert(`位置更新模式已设置为: ${mode === 'auto' ? '自动选择' : mode === 'city' ? '使用城市作为子位置' : '使用省份作为子位置'}`);
        if (username) {
            checkAndUpdateLocation(username); // 立即更新位置
        } else {
            console.log("Username not yet available, location update will be applied after username extraction.");
        }
    }

    // 优先使用 JSON 接口提取用户名
    GM_xmlhttpRequest({
        method: "GET",
        url: `${website}/session/current.json`,
        onload: function(response) {
            const jsonResponse = JSON.parse(response.responseText);
            if (jsonResponse && jsonResponse.current_user && jsonResponse.current_user.username) {
                username = jsonResponse.current_user.username;
                console.log("Username from JSON API:", username);
                checkAndUpdateLocation(username);
            } else {
                console.log("JSON API failed, falling back to other methods.");
                extractUsernameFromBaseURIOrIframe();
            }
        },
        onerror: function() {
            console.log("Failed to fetch username from JSON API, falling back to other methods.");
            extractUsernameFromBaseURIOrIframe();
        }
    });

    function extractUsernameFromBaseURIOrIframe() {
        // 尝试从 baseURI 提取用户名
        const baseURI = document.baseURI;
        const usernameMatch = baseURI.match(/\/u\/([^\/]+)\//);

        if (usernameMatch) {
            username = usernameMatch[1];
            console.log("Username from baseURI:", username);
            checkAndUpdateLocation(username);
        } else {
            console.log("baseURI failed, loading iframe...");

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.top = '50%';
            iframe.style.left = '50%';
            iframe.style.transform = 'translate(-50%, -50%)';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            iframe.src = `${website}/my/preferences/profile`;

            document.body.appendChild(iframe);

            iframe.onload = function() {
                const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

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
    }

    function tryAvatarMethod(iframe) {
        let avatarImg = document.querySelector(`img[src^="${website}/user_avatar/${site}"]`);

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
                    url: "https://ip.useragentinfo.com/json",
                    onload: function(response) {
                        const responseData = JSON.parse(response.responseText);
                        let country = responseData.country;
                        let province = responseData.province;
                        let city = responseData.city;

                        let expectedLocation;

                        switch(locationMode) {
                            case 'city':
                                expectedLocation = `IP: ${country}, ${city}`;
                                break;
                            case 'province':
                                expectedLocation = `IP: ${country}, ${province}`;
                                break;
                            case 'auto':
                            default:
                                expectedLocation = country === province ? `IP: ${country}, ${city}` : `IP: ${country}, ${province}`;
                        }

                        // 简写逻辑：当 country 等于子位置时，简写为 country
                        if ((locationMode === 'city' && country === city) || (locationMode === 'province' && country === province)) {
                            expectedLocation = `IP: ${country}`;
                        }
                        // 防空（确信）
                        if (city === '') {
                            expectedLocation = `IP: ${country}, ${province}`;
                            if (province === ''){
                                expectedLocation = `IP: ${country}`;
                            }
                        }

                        if (province === '') {
                            expectedLocation = `IP: ${country}, ${city}`;
                            if (city === ''){
                                expectedLocation = `IP: ${country}`;
                            }
                        }


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
