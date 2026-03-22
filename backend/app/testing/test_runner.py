"""
测试执行引擎
"""

import asyncio
import json
import re
from typing import Dict, Any, AsyncIterator
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.testing.models import TestNode, TestExecution, TestStatus


class TestRunner:
    """测试执行引擎"""

    def __init__(self):
        from app.core.path_resolver import get_project_root
        self.project_root = get_project_root()

    async def run_test_node(
        self,
        node_id: str,
        db: AsyncSession
    ) -> TestExecution:
        """执行单个测试节点"""
        # 获取测试节点
        result = await db.execute(
            select(TestNode).where(TestNode.id == node_id)
        )
        node = result.scalar_one()

        if node.type == "category":
            return await self._run_category(node, db)
        elif node.type == "test_suite":
            return await self._run_test_suite(node, db)
        elif node.type == "test_case":
            return await self._run_test_case(node, db)

    async def _run_category(
        self,
        node: TestNode,
        db: AsyncSession
    ) -> TestExecution:
        """执行分类节点（递归执行所有子节点）"""
        # 获取所有启用的子节点
        result = await db.execute(
            select(TestNode)
            .where(TestNode.parent_id == node.id, TestNode.enabled == True)
            .order_by(TestNode.order)
        )
        children = list(result.scalars().all())

        # 创建分类执行记录
        execution = TestExecution(
            test_node_id=node.id,
            status=TestStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        db.add(execution)
        await db.commit()

        # 执行所有子节点
        total_passed = 0
        total_failed = 0
        total_tests = 0
        total_skipped = 0

        for child in children:
            try:
                child_execution = await self.run_test_node(child.id, db)

                total_passed += child_execution.passed_tests
                total_failed += child_execution.failed_tests
                total_tests += child_execution.total_tests
                total_skipped += child_execution.skipped_tests
            except Exception as e:
                print(f"Error running child node {child.id}: {e}")
                total_failed += 1
                total_tests += 1

        # 更新执行记录
        execution.status = TestStatus.PASSED if total_failed == 0 else TestStatus.FAILED
        execution.total_tests = total_tests
        execution.passed_tests = total_passed
        execution.failed_tests = total_failed
        execution.skipped_tests = total_skipped
        execution.completed_at = datetime.utcnow()
        execution.duration = int(
            (execution.completed_at - execution.started_at).total_seconds() * 1000
        )

        await db.commit()
        return execution

    async def _run_test_suite(
        self,
        node: TestNode,
        db: AsyncSession
    ) -> TestExecution:
        """执行测试套件"""
        execution = TestExecution(
            test_node_id=node.id,
            status=TestStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        db.add(execution)
        await db.commit()

        try:
            # 根据 test_command 选择执行方式
            if node.test_command == "playwright test":
                result = await self._run_playwright(node.test_file)
            elif node.test_command == "vitest":
                result = await self._run_vitest(node.test_file)
            else:
                result = await self._run_pytest(node.test_file)

            execution.status = TestStatus.PASSED if result["failed"] == 0 else TestStatus.FAILED
            execution.total_tests = result["total"]
            execution.passed_tests = result["passed"]
            execution.failed_tests = result["failed"]
            execution.skipped_tests = result.get("skipped", 0)
            execution.output = result["output"]

        except Exception as e:
            execution.status = TestStatus.ERROR
            execution.error_message = str(e)
            execution.output = str(e)

        finally:
            execution.completed_at = datetime.utcnow()
            execution.duration = int(
                (execution.completed_at - execution.started_at).total_seconds() * 1000
            )
            await db.commit()

        return execution

    async def _run_test_case(
        self,
        node: TestNode,
        db: AsyncSession
    ) -> TestExecution:
        """执行单个测试用例"""
        return await self._run_test_suite(node, db)

    async def _run_pytest(self, test_file: str) -> Dict[str, Any]:
        """执行 pytest 测试"""
        test_path = self.project_root / test_file

        cmd = [
            "pytest",
            str(test_path),
            "-v",
            "--tb=short",
            "--json-report",
            f"--json-report-file=/tmp/pytest_report_{id(self)}.json"
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.project_root)
        )

        # 实时读取输出
        output_lines = []
        async for line in self._read_stream(process.stdout):
            output_lines.append(line)

        await process.wait()

        # 读取 JSON 报告
        report_path = Path(f"/tmp/pytest_report_{id(self)}.json")
        if report_path.exists():
            try:
                with open(report_path, 'r') as f:
                    report = json.load(f)

                return {
                    "total": report["summary"]["total"],
                    "passed": report["summary"].get("passed", 0),
                    "failed": report["summary"].get("failed", 0),
                    "skipped": report["summary"].get("skipped", 0),
                    "output": "\n".join(output_lines)
                }
            finally:
                report_path.unlink()

        # 如果没有 JSON 报告，解析文本输出
        return self._parse_pytest_text_output("\n".join(output_lines))

    async def _run_playwright(self, test_file: str) -> Dict[str, Any]:
        """执行 Playwright 测试"""
        frontend_dir = self.project_root / "frontend"
        test_path = self.project_root / test_file

        cmd = [
            "npx",
            "playwright",
            "test",
            str(test_path),
            "--reporter=json"
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(frontend_dir)
        )

        # 实时读取输出
        output_lines = []
        async for line in self._read_stream(process.stdout):
            output_lines.append(line)

        await process.wait()

        # 解析 Playwright JSON 输出
        output_text = "\n".join(output_lines)
        return self._parse_playwright_output(output_text)

    async def _run_vitest(self, test_file: str) -> Dict[str, Any]:
        """执行 Vitest 测试"""
        frontend_dir = self.project_root / "frontend"
        test_path = self.project_root / test_file

        cmd = [
            "npx",
            "vitest",
            "run",
            str(test_path),
            "--reporter=json"
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(frontend_dir)
        )

        # 实时读取输出
        output_lines = []
        async for line in self._read_stream(process.stdout):
            output_lines.append(line)

        await process.wait()

        # 解析 Vitest 输出
        output_text = "\n".join(output_lines)
        return self._parse_vitest_output(output_text)

    async def _read_stream(self, stream) -> AsyncIterator[str]:
        """异步读取流"""
        while True:
            line = await stream.readline()
            if not line:
                break
            yield line.decode('utf-8', errors='ignore').strip()

    def _parse_pytest_text_output(self, output: str) -> Dict[str, Any]:
        """解析 pytest 文本输出"""
        passed_match = re.search(r'(\d+) passed', output)
        failed_match = re.search(r'(\d+) failed', output)
        skipped_match = re.search(r'(\d+) skipped', output)

        passed = int(passed_match.group(1)) if passed_match else 0
        failed = int(failed_match.group(1)) if failed_match else 0
        skipped = int(skipped_match.group(1)) if skipped_match else 0

        return {
            "total": passed + failed + skipped,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "output": output
        }

    def _parse_playwright_output(self, output: str) -> Dict[str, Any]:
        """解析 Playwright JSON 输出"""
        try:
            lines = output.strip().split('\n')
            for line in reversed(lines):
                if line.strip().startswith('{'):
                    report = json.loads(line)
                    break
            else:
                raise ValueError("No JSON found in output")

            passed = sum(1 for test in report.get('tests', []) if test.get('status') == 'passed')
            failed = sum(1 for test in report.get('tests', []) if test.get('status') == 'failed')
            skipped = sum(1 for test in report.get('tests', []) if test.get('status') == 'skipped')

            return {
                "total": len(report.get('tests', [])),
                "passed": passed,
                "failed": failed,
                "skipped": skipped,
                "output": output
            }
        except (json.JSONDecodeError, KeyError, ValueError):
            return {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "output": output
            }

    def _parse_vitest_output(self, output: str) -> Dict[str, Any]:
        """解析 Vitest 输出"""
        try:
            lines = output.strip().split('\n')
            for line in reversed(lines):
                if line.strip().startswith('{'):
                    report = json.loads(line)
                    break
            else:
                raise ValueError("No JSON found in output")

            passed = report.get('numPassedTests', 0)
            failed = report.get('numFailedTests', 0)
            skipped = report.get('numPendingTests', 0)

            return {
                "total": report.get('numTotalTests', 0),
                "passed": passed,
                "failed": failed,
                "skipped": skipped,
                "output": output
            }
        except (json.JSONDecodeError, KeyError, ValueError):
            passed_match = re.search(r'(\d+) passed', output)
            failed_match = re.search(r'(\d+) failed', output)

            passed = int(passed_match.group(1)) if passed_match else 0
            failed = int(failed_match.group(1)) if failed_match else 0

            return {
                "total": passed + failed,
                "passed": passed,
                "failed": failed,
                "skipped": 0,
                "output": output
            }
