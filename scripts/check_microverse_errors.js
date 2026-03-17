/**
 * Microverse 错误检查脚本
 * 使用 Puppeteer 打开 Microverse 页面并捕获控制台错误
 */

const puppeteer = require('puppeteer');

async function checkMicroverseErrors() {
  console.log('🚀 启动浏览器...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache']
  });

  const page = await browser.newPage();

  // 禁用缓存
  await page.setCacheEnabled(false);

  // 捕获控制台消息
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text, timestamp: new Date().toISOString() });

    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });

  // 捕获页面错误
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // 捕获请求失败
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure().errorText,
      timestamp: new Date().toISOString()
    });
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log('📄 导航到 Microverse 页面...');
    await page.goto('http://localhost:5173/microverse', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ 等待页面加载...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 检查 iframe 是否加载
    const iframeExists = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe !== null;
    });

    console.log(`\n📊 检查结果:`);
    console.log(`- iframe 存在: ${iframeExists}`);
    console.log(`- 控制台消息: ${consoleMessages.length} 条`);
    console.log(`- 页面错误: ${pageErrors.length} 个`);
    console.log(`- 失败请求: ${failedRequests.length} 个`);

    // 输出详细错误
    if (consoleMessages.length > 0) {
      console.log('\n📝 控制台消息:');
      consoleMessages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.type}] ${msg.text}`);
      });
    }

    if (pageErrors.length > 0) {
      console.log('\n❌ 页面错误:');
      pageErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.message}`);
        if (err.stack) {
          console.log(`   Stack: ${err.stack.split('\n')[0]}`);
        }
      });
    }

    if (failedRequests.length > 0) {
      console.log('\n🚫 失败请求:');
      failedRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.url}`);
        console.log(`   原因: ${req.failure}`);
      });
    }

    // 保存结果到文件
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        iframeExists,
        consoleMessages: consoleMessages.length,
        pageErrors: pageErrors.length,
        failedRequests: failedRequests.length
      },
      details: {
        consoleMessages,
        pageErrors,
        failedRequests
      }
    };

    fs.writeFileSync(
      '/Users/kp/项目/Proj/claude_manager/docs/logs/microverse-error-check.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ 报告已保存到: docs/logs/microverse-error-check.json');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 检查完成');
  }
}

checkMicroverseErrors().catch(console.error);
