# Claude Code Token 用量查询指南

## 方法 1：在会话中查看（推荐）

Claude Code 会在每次响应后显示 token 使用情况。查看方式：

### 在交互式会话中
当你使用 Claude Code 时，每次响应后会看到类似这样的信息：
```
<system-reminder>Token usage: 120572/200000; 79428 remaining</system-reminder>
```

这表示：
- 已使用：120,572 tokens
- 总配额：200,000 tokens
- 剩余：79,428 tokens

### 查看历史记录
```bash
# 查看最近的会话历史
tail -100 ~/.claude/history.jsonl | grep -o "Token usage: [^;]*"
```

## 方法 2：通过 API 查询（如果使用 API Key）

如果你使用的是 Anthropic API Key 而不是 Claude 订阅：

```bash
# 查看 API 使用情况（需要 API Key）
curl https://api.anthropic.com/v1/usage \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

## 方法 3：查看 Claude 账户设置

### 通过 Web 界面
1. 访问 https://claude.ai
2. 登录你的账户
3. 进入 Settings（设置）
4. 查看 Usage（使用情况）或 Billing（账单）

### 通过 Claude Code 设置
```bash
# 查看当前配置
claude settings get

# 查看认证状态
claude auth status
```

## 方法 4：在代码中查询

如果你在开发中需要查询 token 使用情况，可以：

### Python 示例
```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

# 发送请求时会返回 usage 信息
message = client.messages.create(
    model="claude-opus-4",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
)

# 查看 token 使用情况
print(f"Input tokens: {message.usage.input_tokens}")
print(f"Output tokens: {message.usage.output_tokens}")
```

### TypeScript 示例
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: 'claude-opus-4',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});

console.log(`Input tokens: ${message.usage.input_tokens}`);
console.log(`Output tokens: ${message.usage.output_tokens}`);
```

## 方法 5：查看调试日志

启用调试模式查看详细的 token 使用信息：

```bash
# 启动 Claude Code 并启用调试
claude --debug

# 或者将调试日志写入文件
claude --debug-file ~/claude-debug.log
```

然后查看日志：
```bash
tail -f ~/claude-debug.log | grep -i "token\|usage"
```

## Token 配额说明

### Claude Pro 订阅
- **Opus 4**: 通常有较高的 token 配额
- **Sonnet 4**: 中等配额
- **Haiku 4**: 较低配额但速度快

### API Key 用户
- 按使用量付费
- 可以在 Anthropic Console 查看详细使用情况
- 网址：https://console.anthropic.com

## 常见问题

### Q: 如何知道我的配额何时重置？
A: Claude Pro 订阅通常按月重置。具体时间可以在 claude.ai 的账户设置中查看。

### Q: Token 用完了怎么办？
A:
1. 等待配额重置（通常是每月）
2. 升级到更高级别的订阅
3. 使用更小的模型（如 Haiku）
4. 优化 prompt 减少 token 使用

### Q: 如何减少 token 使用？
A:
1. 使用更简洁的 prompt
2. 避免重复发送大量上下文
3. 使用 `--print` 模式而不是交互模式
4. 清理不必要的文件和上下文

## 实用命令

```bash
# 查看当前会话的 token 使用（在 Claude Code 中）
# 每次响应后会自动显示

# 查看历史会话的 token 使用
grep -o "Token usage: [^;]*" ~/.claude/history.jsonl | tail -20

# 统计总使用量
grep -o "Token usage: [0-9]*" ~/.claude/history.jsonl | \
  awk -F': ' '{sum+=$2} END {print "Total tokens used:", sum}'

# 查看最近的使用趋势
grep -o "Token usage: [0-9]*/[0-9]*" ~/.claude/history.jsonl | \
  tail -10
```

## 监控建议

1. **定期检查**：每周查看一次使用情况
2. **设置提醒**：当使用量达到 80% 时提醒自己
3. **优化使用**：分析哪些操作消耗最多 token
4. **合理规划**：根据配额安排工作优先级

## 相关资源

- Anthropic 文档：https://docs.anthropic.com
- Claude 定价：https://www.anthropic.com/pricing
- API 控制台：https://console.anthropic.com
- Claude Code 文档：https://docs.anthropic.com/claude/docs/claude-code
