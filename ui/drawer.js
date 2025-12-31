// 快速响应部队 - UI抽屉创建
// 由Cline移植并重构

import { extensionName } from '../utils/settings.js';
import { initializeBindings, saveAllSettings } from './bindings.js';

const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

/**
 * 创建并注入插件的设置面板到SillyTavern的扩展设置页面。
 */
export async function createDrawer() {
    // 防止重复创建
    if ($('#qrf_extension_frame').length > 0) return;

    const extensionHtml = `
        <div id="qrf_extension_frame">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b><i class="fas fa-magic" style="color: #a977ff;"></i> 剧情优化大师</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="display: none;">
                    <!-- 设置面板将在这里加载 -->
                </div>
            </div>
        </div>
    `;

    // 将面板添加到SillyTavern的扩展设置区域（兼容不同版本）
    const $extensionSettings = $('#extensions_settings2').length > 0 
        ? $('#extensions_settings2') 
        : $('#extensions_settings');
    $extensionSettings.append(extensionHtml);

    try {
        const contentWrapper = $('#qrf_extension_frame .inline-drawer-content');
        
        // 使用 import.meta.url 获取当前模块的基础路径
        let basePath = '';
        try {
            const currentScriptUrl = import.meta.url;
            // 从 drawer.js 的路径推导出 settings.html 的路径
            // drawer.js 在 ui/ 目录下，settings.html 在根目录
            basePath = currentScriptUrl.replace(/\/ui\/drawer\.js.*$/, '');
            console.log(`[${extensionName}] 检测到基础路径: ${basePath}`);
        } catch (e) {
            console.log(`[${extensionName}] 无法使用 import.meta.url，使用默认路径`);
        }
        
        // 尝试多个可能的路径（SillyTavern 不同版本和配置可能使用不同路径）
        const possiblePaths = [
            basePath ? `${basePath}/settings.html` : null,
            // 标准第三方扩展路径
            `/${extensionFolderPath}/settings.html`,
            `/scripts/extensions/third-party/${extensionName}/settings.html`,
            `scripts/extensions/third-party/${extensionName}/settings.html`,
            // SillyTavern 1.12+ 可能使用的路径
            `/extensions/third-party/${extensionName}/settings.html`,
            `extensions/third-party/${extensionName}/settings.html`,
            // 相对于根目录的路径
            `./scripts/extensions/third-party/${extensionName}/settings.html`,
            `../../../settings.html`,
            `../../settings.html`,
            `../settings.html`,
            `./settings.html`,
        ].filter(Boolean);
        
        let settingsPanelHtml = null;
        let successPath = null;
        let lastError = null;
        
        for (const path of possiblePaths) {
            const fetchUrl = `${path}?v=${Date.now()}`;
            console.log(`[${extensionName}] 尝试加载设置面板: ${fetchUrl}`);
            try {
                // 使用原生 fetch API
                const response = await fetch(fetchUrl);
                if (response.ok) {
                    settingsPanelHtml = await response.text();
                    successPath = fetchUrl;
                    break;
                } else {
                    lastError = `HTTP ${response.status}`;
                    console.log(`[${extensionName}] 路径 ${fetchUrl} 返回 ${response.status}`);
                }
            } catch (e) {
                lastError = e.message;
                console.log(`[${extensionName}] 路径 ${fetchUrl} 加载失败: ${e.message}`);
            }
        }
        
        if (!settingsPanelHtml) {
            throw new Error(`无法从任何路径加载 settings.html (最后错误: ${lastError})`);
        }
        
        console.log(`[${extensionName}] 成功从 ${successPath} 加载设置面板`);
        contentWrapper.html(settingsPanelHtml);

        // 初始化UI数据绑定和事件
        initializeBindings();

        // [功能更新] 为抽屉的展开/折叠按钮添加事件监听器
        $('#qrf_extension_frame .inline-drawer-toggle').on('click', function() {
            const content = $(this).next('.inline-drawer-content');
            // 只有在展开抽屉时才触发刷新
            if (!content.is(':visible')) {
                // 动态导入并调用刷新函数
                import('./bindings.js').then(module => {
                    if (module.loadWorldbookEntries) {
                        console.log(`[${extensionName}] 抽屉已展开，正在刷新世界书条目...`);
                        const panel = $('#qrf_settings_panel');
                        if (panel.length > 0) {
                            module.loadWorldbookEntries(panel);
                        }
                    }
                }).catch(err => console.error(`[${extensionName}] 动态导入bindings.js失败:`, err));
            }
        });
        
        console.log(`[${extensionName}] 设置面板已成功创建，并已添加自动刷新功能。`);

    } catch (error) {
        console.error(`[${extensionName}] 加载设置面板HTML时发生错误:`, error);
        $('#qrf_extension_frame .inline-drawer-content').html('<p style="color:red; padding:10px;">错误：无法加载插件设置界面。</p>');
    }
}
