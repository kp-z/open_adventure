const playwright = require('playwright');

(async () => {
  console.log('🚀 Starting terminal debug...');

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // 监听控制台日志
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[TerminalPane]') || text.includes('[TerminalContext]')) {
      console.log('📝', text);
    }
  });

  // 监听错误
  page.on('pageerror', error => {
    console.error('❌ Page error:', error.message);
  });

  console.log('🌐 Navigating to Terminal page...');
  await page.goto('http://localhost:5173/terminal');

  // 等待页面加载
  await page.waitForTimeout(3000);

  console.log('📸 Taking screenshots...');

  // 截图1: 整个页面
  await page.screenshot({
    path: 'docs/images/screenshots/terminal-debug/01-full-page.png',
    fullPage: true
  });
  console.log('✅ Screenshot 1: Full page');

  // 截图2: 终端区域
  const terminalArea = await page.locator('.flex-1.flex.overflow-hidden').first();
  if (await terminalArea.count() > 0) {
    await terminalArea.screenshot({
      path: 'docs/images/screenshots/terminal-debug/02-terminal-area.png'
    });
    console.log('✅ Screenshot 2: Terminal area');
  }

  // 检查 xterm 元素
  console.log('\n🔍 Checking xterm elements...');
  const xtermElements = await page.locator('.xterm').all();
  console.log(`Found ${xtermElements.length} .xterm elements`);

  for (let i = 0; i < xtermElements.length; i++) {
    const el = xtermElements[i];
    const box = await el.boundingBox();
    const isVisible = await el.isVisible();
    console.log(`  Element ${i + 1}:`, {
      visible: isVisible,
      box: box ? `${box.width}x${box.height} at (${box.x}, ${box.y})` : 'null'
    });

    if (box && box.width > 0 && box.height > 0) {
      await el.screenshot({
        path: `docs/images/screenshots/terminal-debug/03-xterm-${i + 1}.png`
      });
      console.log(`  ✅ Screenshot: xterm-${i + 1}`);
    }
  }

  // 检查终端容器
  console.log('\n🔍 Checking terminal containers...');
  const containers = await page.locator('[class*="flex-1"][class*="overflow"]').all();
  console.log(`Found ${containers.length} potential terminal containers`);

  // 获取计算样式
  const styles = await page.evaluate(() => {
    const containers = document.querySelectorAll('[class*="flex-1"]');
    return Array.from(containers).map((el, i) => {
      const computed = window.getComputedStyle(el);
      return {
        index: i,
        display: computed.display,
        width: computed.width,
        height: computed.height,
        visibility: computed.visibility,
        opacity: computed.opacity,
        overflow: computed.overflow,
        children: el.children.length,
        innerHTML: el.innerHTML.substring(0, 200)
      };
    });
  });

  console.log('\n📊 Container styles:');
  styles.forEach(style => {
    console.log(`  Container ${style.index}:`, {
      display: style.display,
      size: `${style.width} x ${style.height}`,
      visibility: style.visibility,
      opacity: style.opacity,
      overflow: style.overflow,
      children: style.children,
      hasContent: style.innerHTML.length > 0
    });
  });

  // 等待用户检查
  console.log('\n⏸️  Browser will stay open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('✅ Debug complete!');
})();
