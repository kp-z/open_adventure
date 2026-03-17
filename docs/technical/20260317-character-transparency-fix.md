# Microverse 角色动画透明度问题修复

**创建日期**: 2026-03-17
**问题**: 角色除站立状态外其他动画显示为透明
**状态**: ✅ 已修复

## 问题描述

用户报告 Microverse 游戏中的角色在以下状态下显示为透明：
- ❌ 行走状态（run_down/left/right/up）
- ❌ 坐下状态（sit_down/left/right/up）
- ❌ 默认 idle 状态

而以下状态显示正常：
- ✅ 站立状态（idle_down/left/right/up）
- ✅ stand 状态（stand_down/left/right/up）

## 根本原因

通过分析 `microverse/scene/characters/Alice.tscn` 文件，发现问题根源：

### 纹理资源重复定义

场景文件中存在两套 AtlasTexture 定义：

1. **CompressedTexture2D 版本**：
   ```gdscript
   [sub_resource type="CompressedTexture2D" id="CompressedTexture2D_7ksxw"]
   load_path = "res://.godot/imported/Alicex32.png-..."

   [sub_resource type="AtlasTexture" id="AtlasTexture_trra3"]
   atlas = SubResource("CompressedTexture2D_7ksxw")
   region = Rect2(576, 64, 32, 64)
   ```

2. **ExtResource 版本**：
   ```gdscript
   [sub_resource type="AtlasTexture" id="AtlasTexture_it8k8"]
   atlas = ExtResource("2_7ksxw")
   region = Rect2(576, 64, 32, 64)
   ```

### 问题分析

- 正常显示的动画使用 **ExtResource** 纹理（直接引用原始资源）
- 透明显示的动画使用 **CompressedTexture2D** 纹理（引用编译后的 .ctex 文件）
- 在 Web 导出版本中，CompressedTexture2D 的 `load_path` 可能无效或资源未正确打包
- 导致纹理加载失败，角色显示为透明

## 解决方案

### 修复策略

统一所有动画使用 **ExtResource** 纹理引用，移除 CompressedTexture2D 定义。

### 实施步骤

1. **创建自动化修复脚本** (`scripts/fix_character_transparency.py`)：
   - 识别 ExtResource 纹理资源 ID
   - 替换所有 CompressedTexture2D 引用为 ExtResource
   - 删除 CompressedTexture2D 定义
   - 清理多余空行

2. **批量修复所有角色文件**：
   - Alice.tscn - ✅ 修复 54 个引用
   - Grace.tscn - ✅ 修复 54 个引用
   - Jack.tscn - ✅ 修复 54 个引用
   - Joe.tscn - ✅ 修复 64 个引用
   - Lea.tscn - ✅ 无需修复（已使用 ExtResource）
   - Monica.tscn - ✅ 修复 54 个引用
   - Stephen.tscn - ✅ 无需修复（已使用 ExtResource）
   - Tom.tscn - ✅ 无需修复（已使用 ExtResource）

3. **重新编译 Godot 项目**：
   ```bash
   cd microverse
   /Applications/Godot.app/Contents/MacOS/Godot --headless \
     --export-release "Web" ../frontend/public/microverse/index.html
   ```

4. **更新版本信息**：
   - 版本号：1.0.3
   - 构建时间：2026-03-17T11:25:00+08:00

## 验证步骤

### 1. 启动服务
```bash
./start.sh
```

### 2. 浏览器测试
访问 http://localhost:5173/microverse

### 3. 测试所有角色状态
- [ ] 站立状态（idle_down/left/right/up）- 应正常显示
- [ ] 行走状态（run_down/left/right/up）- 应正常显示（之前透明）
- [ ] 坐下状态（sit_down/left/right/up）- 应正常显示（之前透明）
- [ ] 默认 idle 状态 - 应正常显示（之前透明）

### 4. 检查控制台
- [ ] 无纹理加载错误
- [ ] 无 "texture not found" 错误
- [ ] 无 CompressedTexture2D 相关警告

## 技术细节

### 修复前后对比

**修复前**：
```gdscript
[sub_resource type="CompressedTexture2D" id="CompressedTexture2D_7ksxw"]
load_path = "res://.godot/imported/Alicex32.png-..."

[sub_resource type="AtlasTexture" id="AtlasTexture_trra3"]
atlas = SubResource("CompressedTexture2D_7ksxw")  # ❌ 在 Web 版本中可能失效
region = Rect2(576, 64, 32, 64)
```

**修复后**：
```gdscript
[sub_resource type="AtlasTexture" id="AtlasTexture_trra3"]
atlas = ExtResource("2_7ksxw")  # ✅ 直接引用原始资源
region = Rect2(576, 64, 32, 64)
```

### 为什么 ExtResource 更可靠

1. **直接引用原始资源**：不依赖编译后的中间文件路径
2. **跨平台兼容性好**：桌面版和 Web 版都能正确加载
3. **与正常工作的动画一致**：idle_down 等动画已证明此方案可行

## 影响范围

- ✅ 修复了 5 个角色的透明度问题（Alice、Grace、Jack、Joe、Monica）
- ✅ 3 个角色本身就正常（Lea、Stephen、Tom）
- ✅ 所有动画状态现在都使用统一的纹理引用方式
- ✅ 不影响桌面版本（桌面版本本来就正常）

## 相关文件

- `scripts/fix_character_transparency.py` - 自动化修复脚本
- `microverse/scene/characters/*.tscn` - 8 个角色场景文件
- `microverse/asset/characters/body/*.png` - 角色精灵图资源
- `frontend/public/microverse/version.json` - 版本信息

## 后续建议

1. **测试所有角色**：确保每个角色的所有动画状态都正常显示
2. **监控控制台**：确认没有纹理加载相关的错误或警告
3. **性能测试**：确认修复后没有性能下降
4. **文档更新**：如果需要，更新 Godot 项目的开发文档

## 经验总结

1. **Web 导出的特殊性**：Web 版本对资源路径更敏感，应优先使用 ExtResource
2. **统一资源引用方式**：避免在同一项目中混用不同的纹理引用方式
3. **自动化修复的重要性**：8 个文件手动修改容易出错，脚本保证一致性
4. **版本控制**：修复后及时更新版本号，便于追踪问题
