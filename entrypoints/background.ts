import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            chrome.runtime.openOptionsPage();
        }
    });

    chrome.action.onClicked.addListener(() => {
        chrome.runtime.openOptionsPage();
    });
});
