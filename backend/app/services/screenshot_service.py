"""
ScreenshotService - 使用 Playwright 截取运行中的前端页面缩略图

提供项目预览功能，截图保存为 webp 格式以优化文件大小。
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 缩略图存储目录
from app.core.path_resolver import get_thumbnails_dir
THUMBNAILS_DIR = get_thumbnails_dir()


class ScreenshotService:
    """截图服务：使用 Playwright 截取页面并保存为缩略图"""

    def __init__(self):
        self._browser = None
        self._playwright = None
        self._lock = asyncio.Lock()

    async def _ensure_browser(self):
        """确保浏览器实例已启动"""
        if self._browser is not None:
            return

        async with self._lock:
            if self._browser is not None:
                return

            try:
                from playwright.async_api import async_playwright
                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox"]
                )
                logger.info("Playwright browser started")
            except Exception as e:
                logger.error(f"Failed to start Playwright browser: {e}")
                raise RuntimeError(
                    "无法启动浏览器，请确保已安装 Playwright: "
                    "pip install playwright && playwright install chromium"
                )

    async def capture(
        self,
        project_id: int,
        url: str,
        width: int = 1280,
        height: int = 720,
        timeout: int = 30000,
        retry: int = 3
    ) -> str:
        """
        截取页面并保存为缩略图

        Args:
            project_id: 项目 ID
            url: 要截取的页面 URL
            width: 视口宽度
            height: 视口高度
            timeout: 页面加载超时时间（毫秒）
            retry: 重试次数

        Returns:
            缩略图文件路径
        """
        # 确保目录存在
        THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

        # 生成文件名
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"project_{project_id}_{timestamp}.webp"
        filepath = THUMBNAILS_DIR / filename

        last_error = None
        for attempt in range(retry):
            try:
                await self._ensure_browser()

                page = await self._browser.new_page()
                try:
                    await page.set_viewport_size({"width": width, "height": height})

                    # 尝试加载页面
                    logger.info(f"Screenshot attempt {attempt + 1}: loading {url}")
                    await page.goto(url, timeout=timeout, wait_until="networkidle")

                    # 等待一小段时间让动画完成
                    await page.wait_for_timeout(500)

                    # 截图并保存为 webp
                    await page.screenshot(
                        path=str(filepath),
                        type="png",  # 先保存为 png，稍后可以转换
                        full_page=False
                    )

                    # 转换为 webp（如果支持）
                    try:
                        from PIL import Image
                        img = Image.open(str(filepath))
                        webp_path = filepath.with_suffix(".webp")
                        img.save(str(webp_path), "WEBP", quality=85)
                        filepath.unlink()  # 删除原 png
                        filepath = webp_path
                    except ImportError:
                        # 没有 PIL，保持 png 格式
                        pass

                    logger.info(f"Screenshot saved: {filepath}")
                    return str(filepath)

                finally:
                    await page.close()

            except Exception as e:
                last_error = e
                logger.warning(f"Screenshot attempt {attempt + 1} failed: {e}")
                if attempt < retry - 1:
                    await asyncio.sleep(1)  # 等待后重试

        raise RuntimeError(f"截图失败（重试 {retry} 次）: {last_error}")

    def get_thumbnail_path(self, project_id: int) -> Optional[str]:
        """
        获取项目最新的缩略图路径

        Args:
            project_id: 项目 ID

        Returns:
            缩略图文件路径，如果不存在则返回 None
        """
        if not THUMBNAILS_DIR.exists():
            return None

        # 查找该项目的所有缩略图，按时间排序取最新的
        pattern = f"project_{project_id}_*"
        thumbnails = sorted(
            THUMBNAILS_DIR.glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )

        if thumbnails:
            return str(thumbnails[0])
        return None

    def get_thumbnail_url(self, project_id: int) -> Optional[str]:
        """
        获取项目缩略图的 URL 路径

        Args:
            project_id: 项目 ID

        Returns:
            缩略图 URL 路径，如果不存在则返回 None
        """
        path = self.get_thumbnail_path(project_id)
        if path:
            filename = Path(path).name
            return f"/static/thumbnails/{filename}"
        return None

    async def cleanup_old_thumbnails(self, project_id: int, keep: int = 3) -> int:
        """
        清理旧的缩略图，保留最近的几个

        Args:
            project_id: 项目 ID
            keep: 保留的数量

        Returns:
            删除的文件数量
        """
        if not THUMBNAILS_DIR.exists():
            return 0

        pattern = f"project_{project_id}_*"
        thumbnails = sorted(
            THUMBNAILS_DIR.glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )

        deleted = 0
        for thumb in thumbnails[keep:]:
            try:
                thumb.unlink()
                deleted += 1
            except Exception as e:
                logger.warning(f"Failed to delete old thumbnail {thumb}: {e}")

        return deleted

    async def close(self):
        """关闭浏览器实例"""
        if self._browser:
            try:
                await self._browser.close()
            except Exception as e:
                logger.warning(f"Failed to close browser: {e}")
            self._browser = None

        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception as e:
                logger.warning(f"Failed to stop playwright: {e}")
            self._playwright = None


# 全局单例
_screenshot_service: Optional[ScreenshotService] = None


def get_screenshot_service() -> ScreenshotService:
    """获取 ScreenshotService 单例"""
    global _screenshot_service
    if _screenshot_service is None:
        _screenshot_service = ScreenshotService()
    return _screenshot_service
