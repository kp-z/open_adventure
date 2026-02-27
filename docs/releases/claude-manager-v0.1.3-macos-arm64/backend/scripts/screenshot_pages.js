/**
 * 页面截图脚本
 * 用于检查前端页面的显示效果
 */

const puppeteer = require('puppeteer');
const path = require('path');

// 需要截图的页面配置
const pages = [
  { name: 'agents', url: 'http://localhost:5173/agents', expectedCount: 5, description: 'Agent列表' },
  { name: 'teams', url: 'http://localhost:5173/teams', expectedCount: 3, description: 'AgentTeam列表' },
  { name: 'workflows', url: 'http://localhost:5173/workflows', expectedCount: 4, description: 'Workflow列表' },
  { name: 'tasks', url: 'http://localhost:5173/tasks', expectedCount: 5, description: 'Task列表' }
];

async function takeScreenshot(browser, page, config) {
  console.log(`\n正在访问: ${config.description} (${config.url})`);
  
  try {
    // 步骤1: 导航到页面
    await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 步骤2: 等待页面加载完成（等待主要内容区域）
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤3: 获取页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    // 步骤4: 尝试获取页面上的卡片或列表项数量
    const itemCount = await page.evaluate(() => {
      // 尝试多种可能的选择器
      const selectors = [
        '[class*="card"]',
        '[class*="item"]',
        '[class*="list"] > div',
        '[role="listitem"]',
        'article'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          return elements.length;
        }
      }
      return 0;
    });
    
    console.log(`找到的项目数量: ${itemCount}`);
    console.log(`期望的项目数量: ${config.expectedCount}`);
    
    // 步骤5: 截图保存
    const screenshotPath = path.join(__dirname, '..', '..', `${config.name}-page.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`截图已保存: ${screenshotPath}`);
    
    // 步骤6: 检查是否有错误信息
    const errorText = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      if (errorElements.length > 0) {
        return Array.from(errorElements).map(el => el.textContent).join(', ');
      }
      return null;
    });
    
    if (errorText) {
      console.log(`⚠️ 发现错误信息: ${errorText}`);
    }
    
    // 步骤7: 验证数据是否正确
    const isCorrect = itemCount === config.expectedCount;
    console.log(`数据验证: ${isCorrect ? '✅ 通过' : '❌ 失败'}`);
    
    return {
      name: config.name,
      description: config.description,
      url: config.url,
      title,
      itemCount,
      expectedCount: config.expectedCount,
      isCorrect,
      errorText,
      screenshotPath
    };
    
  } catch (error) {
    console.error(`❌ 访问页面失败: ${error.message}`);
    return {
      name: config.name,
      description: config.description,
      url: config.url,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('开始检查页面显示效果');
  console.log('='.repeat(60));
  
  // 步骤1: 启动浏览器
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 步骤2: 设置视口大小
  await page.setViewport({ width: 1920, height: 1080 });
  
  // 步骤3: 逐个访问页面并截图
  const results = [];
  for (const pageConfig of pages) {
    const result = await takeScreenshot(browser, page, pageConfig);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 每个页面之间等待1秒
  }
  
  // 步骤4: 关闭浏览器
  await browser.close();
  
  // 步骤5: 输出总结报告
  console.log('\n' + '='.repeat(60));
  console.log('检查完成 - 总结报告');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    console.log(`\n【${result.description}】`);
    console.log(`  URL: ${result.url}`);
    if (result.error) {
      console.log(`  状态: ❌ 错误`);
      console.log(`  错误信息: ${result.error}`);
    } else {
      console.log(`  页面标题: ${result.title}`);
      console.log(`  实际数量: ${result.itemCount}`);
      console.log(`  期望数量: ${result.expectedCount}`);
      console.log(`  验证结果: ${result.isCorrect ? '✅ 通过' : '❌ 失败'}`);
      if (result.errorText) {
        console.log(`  页面错误: ${result.errorText}`);
      }
      console.log(`  截图路径: ${result.screenshotPath}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
