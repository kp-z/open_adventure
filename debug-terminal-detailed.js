const playwright = require('playwright');

(async () => {
  console.log('🚀 Starting detailed terminal diagnosis...');

  const browser = await playwright.chromium.launch({
    headless: false,
    devtools: true  // 自动打开开发者工具
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // 监听所有控制台消息
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝';
    console.log(`${prefix} [${type}]`, text);
  });

  // 监听错误
  page.on('pageerror', error => {
    console.error('❌ Page error:', error.message);
    console.error('Stack:', error.stack);
  });

  // 监听请求失败
  page.on('requestfailed', request => {
    console.error('❌ Request failed:', request.url(), request.failure()?.errorText);
  });

  console.log('🌐 Navigating to Terminal page...');
  await page.goto('http://localhost:5173/terminal');

  // 等待页面加载
  console.log('⏳ Waiting for page to load...');
  await page.waitForTimeout(5000);

  console.log('\n=== 🔍 DETAILED INSPECTION ===\n');

  // 检查 xterm CSS 是否加载
  const xtermCssLoaded = await page.evaluate(() => {
    const stylesheets = Array.from(document.styleSheets);
    return stylesheets.some(sheet => {
      try {
        return sheet.href && sheet.href.includes('xterm');
      } catch {
        return false;
      }
    });
  });
  console.log('📄 XTerm CSS loaded:', xtermCssLoaded);

  // 检查 xterm 元素
  const xtermInfo = await page.evaluate(() => {
    const xtermElements = document.querySelectorAll('.xterm');
    return Array.from(xtermElements).map((el, i) => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        index: i,
        className: el.className,
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        childCount: el.children.length,
        hasTextContent: el.textContent.length > 0,
        textPreview: el.textContent.substring(0, 100),
      };
    });
  });

  console.log('\n📊 XTerm Elements:', xtermInfo.length);
  xtermInfo.forEach(info => {
    console.log(`\n  Element ${info.index}:`);
    console.log(`    Class: ${info.className}`);
    console.log(`    Display: ${info.display}`);
    console.log(`    Visibility: ${info.visibility}`);
    console.log(`    Opacity: ${info.opacity}`);
    console.log(`    Size: ${info.width}x${info.height}`);
    console.log(`    Position: (${info.left}, ${info.top})`);
    console.log(`    Background: ${info.backgroundColor}`);
    console.log(`    Color: ${info.color}`);
    console.log(`    Font: ${info.fontSize} ${info.fontFamily}`);
    console.log(`    Children: ${info.childCount}`);
    console.log(`    Has text: ${info.hasTextContent}`);
    if (info.hasTextContent) {
      console.log(`    Text preview: "${info.textPreview}"`);
    }
  });

  // 检查 canvas 元素
  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('.xterm canvas');
    return Array.from(canvases).map((canvas, i) => {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      return {
        index: i,
        width: canvas.width,
        height: canvas.height,
        displayWidth: rect.width,
        displayHeight: rect.height,
        hasContext: !!ctx,
      };
    });
  });

  console.log('\n🎨 Canvas Elements:', canvasInfo.length);
  canvasInfo.forEach(info => {
    console.log(`  Canvas ${info.index}:`, info);
  });

  // 截图
  console.log('\n📸 Taking screenshots...');
  await page.screenshot({
    path: 'docs/images/screenshots/terminal-debug/detailed-full.png',
    fullPage: true
  });

  const xtermElement = await page.locator('.xterm').first();
  if (await xtermElement.count() > 0) {
    await xtermElement.screenshot({
      path: 'docs/images/screenshots/terminal-debug/detailed-xterm.png'
    });
  }

  console.log('\n✅ Screenshots saved');

  // 尝试手动写入内容
  console.log('\n🔧 Attempting to write to terminal via console...');
  await page.evaluate(() => {
    // 尝试找到 terminal 实例
    const xtermEl = document.querySelector('.xterm');
    if (xtermEl) {
      console.log('Found xterm element, trying to access terminal instance...');
      // 注意：这可能不工作，因为 terminal 实例可能不在全局作用域
    }
  });

  console.log('\n⏸️  Browser will stay open for inspection...');
  console.log('Press Ctrl+C to close');

  // 保持浏览器打开
  await new Promise(() => {});
})();
