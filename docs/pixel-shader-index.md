# 像素 Shader 项目文件索引

本文档列出了像素 Shader 开发任务创建的所有文件。

---

## 📁 文件结构

```
claude_manager/
├── docs/                                          # 文档目录
│   ├── pixel-shader-guide.md                     # 完整使用指南（12KB）
│   ├── pixel-shader-quickref.md                  # 快速参考卡片
│   ├── pixel-shader-performance.md               # 性能优化指南
│   └── pixel-shader-completion-report.md         # 完成报告
│
└── microverse/
    ├── shaders/                                   # Shader 目录
    │   ├── pixel_postprocess.gdshader            # 像素后处理 Shader
    │   ├── pixel_postprocess.tres                # 像素后处理材质预设
    │   ├── CRTShader_optimized.gdshader          # 优化的 CRT Shader
    │   ├── crt_shader.tres                       # CRT 材质预设
    │   ├── pixel_perfect.gdshader                # 像素完美缩放 Shader
    │   ├── pixel_perfect.tres                    # 像素完美缩放材质预设
    │   └── README.md                             # Shaders 目录说明
    │
    └── scene/                                     # 场景目录
        ├── pixel_shader_test.tscn                # 交互式测试场景
        ├── pixel_shader_test.gd                  # 测试场景脚本
        ├── shader_performance_test.gd            # 性能测试脚本
        └── pixel_shader_example.gd               # 实战示例脚本
```

---

## 📄 文件详情

### 1. Shader 文件

#### 1.1 像素后处理 Shader
- **路径**: `microverse/shaders/pixel_postprocess.gdshader`
- **大小**: ~2.5KB
- **行数**: ~90 行
- **功能**: Bayer 抖动、色彩限制、扫描线、像素化
- **性能**: 低-中等

#### 1.2 CRT Shader（优化版）
- **路径**: `microverse/shaders/CRTShader_optimized.gdshader`
- **大小**: ~3.5KB
- **行数**: ~120 行
- **功能**: 屏幕曲率、色彩溢出、扫描线、暗角、RGB 分离
- **性能**: 中-高

#### 1.3 像素完美缩放 Shader
- **路径**: `microverse/shaders/pixel_perfect.gdshader`
- **大小**: ~924B
- **行数**: ~30 行
- **功能**: 像素网格对齐，避免模糊
- **性能**: 极低

---

### 2. 材质预设文件

#### 2.1 像素后处理材质
- **路径**: `microverse/shaders/pixel_postprocess.tres`
- **大小**: 590B
- **用途**: 预设的像素后处理材质，可直接使用

#### 2.2 CRT 材质
- **路径**: `microverse/shaders/crt_shader.tres`
- **大小**: 760B
- **用途**: 预设的 CRT 效果材质，可直接使用

#### 2.3 像素完美材质
- **路径**: `microverse/shaders/pixel_perfect.tres`
- **大小**: 304B
- **用途**: 预设的像素完美缩放材质，可直接使用

---

### 3. 测试场景和脚本

#### 3.1 交互式测试场景
- **场景**: `microverse/scene/pixel_shader_test.tscn`
- **脚本**: `microverse/scene/pixel_shader_test.gd`
- **大小**: 3.5KB (tscn) + 2.7KB (gd)
- **功能**: 实时切换不同 Shader 效果，可视化对比

#### 3.2 性能测试脚本
- **路径**: `microverse/scene/shader_performance_test.gd`
- **大小**: 5.0KB
- **功能**: 自动测试所有 Shader 配置，输出性能数据

#### 3.3 实战示例脚本
- **路径**: `microverse/scene/pixel_shader_example.gd`
- **大小**: ~4KB
- **功能**: 展示如何在实际游戏中应用像素风格效果

---

### 4. 文档文件

#### 4.1 完整使用指南
- **路径**: `docs/pixel-shader-guide.md`
- **大小**: 12KB
- **字数**: ~12,000 字
- **内容**:
  - Shader 概述和功能特性
  - 详细使用方法（3 种方式）
  - 完整参数说明和推荐配置
  - 常见问题解答（6 个 Q&A）
  - 技术细节说明

#### 4.2 快速参考卡片
- **路径**: `docs/pixel-shader-quickref.md`
- **大小**: ~2KB
- **字数**: ~500 字
- **内容**:
  - 三个核心 Shader 速查
  - 全屏后处理模板
  - 常用参数速查
  - 性能优化技巧

#### 4.3 性能优化指南
- **路径**: `docs/pixel-shader-performance.md`
- **大小**: ~10KB
- **字数**: ~8,000 字
- **内容**:
  - 性能分级（4 个等级）
  - 平台优化建议（移动/PC/Web）
  - 7 个优化技巧
  - 自动质量调整示例
  - 性能对比表

#### 4.4 Shaders 目录 README
- **路径**: `microverse/shaders/README.md`
- **大小**: 2.8KB
- **内容**:
  - 目录结构说明
  - Shader 文件索引
  - 快速开始指南
  - 性能建议表

#### 4.5 完成报告
- **路径**: `docs/pixel-shader-completion-report.md`
- **大小**: ~10KB
- **内容**:
  - 任务完成情况
  - 交付成果清单
  - 技术亮点
  - 使用建议

#### 4.6 项目文件索引
- **路径**: `docs/pixel-shader-index.md`（本文件）
- **内容**: 所有文件的索引和说明

---

## 📊 统计数据

### 文件统计
- **总文件数**: 16 个
- **Shader 文件**: 3 个
- **材质预设**: 3 个
- **场景/脚本**: 4 个
- **文档**: 6 个

### 代码统计
- **Shader 代码**: ~240 行
- **GDScript 代码**: ~500 行
- **总代码行数**: ~740 行

### 文档统计
- **总字数**: ~20,000 字
- **总大小**: ~40KB

---

## 🚀 快速导航

### 我想...

#### 快速开始使用
→ 阅读 [快速参考卡片](pixel-shader-quickref.md)

#### 了解详细用法
→ 阅读 [完整使用指南](pixel-shader-guide.md)

#### 优化性能
→ 阅读 [性能优化指南](pixel-shader-performance.md)

#### 查看效果
→ 打开 `microverse/scene/pixel_shader_test.tscn`

#### 测试性能
→ 运行 `microverse/scene/shader_performance_test.gd`

#### 查看示例代码
→ 查看 `microverse/scene/pixel_shader_example.gd`

---

## 📦 使用方式

### 方式 1: 使用预设材质（推荐）

```gdscript
extends ColorRect

func _ready():
    # 加载预设材质
    var material = preload("res://shaders/pixel_postprocess.tres")
    self.material = material
```

### 方式 2: 代码创建材质

```gdscript
extends ColorRect

func _ready():
    var material = ShaderMaterial.new()
    material.shader = preload("res://shaders/pixel_postprocess.gdshader")
    material.set_shader_parameter("enable_color_limit", true)
    material.set_shader_parameter("color_depth", 5)
    self.material = material
```

### 方式 3: 全屏后处理

```gdscript
extends Node

func _ready():
    var canvas_layer = CanvasLayer.new()
    canvas_layer.layer = 100
    add_child(canvas_layer)

    var rect = ColorRect.new()
    rect.set_anchors_preset(Control.PRESET_FULL_RECT)
    rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
    canvas_layer.add_child(rect)

    rect.material = preload("res://shaders/pixel_postprocess.tres")
```

---

## 🎯 推荐配置

### 移动设备
```gdscript
var material = preload("res://shaders/pixel_perfect.tres")
```

### Web 平台
```gdscript
var material = ShaderMaterial.new()
material.shader = preload("res://shaders/pixel_postprocess.gdshader")
material.set_shader_parameter("enable_dithering", true)
material.set_shader_parameter("dither_pattern_size", 2)  # 使用 2x2
material.set_shader_parameter("enable_scanlines", true)
material.set_shader_parameter("scanline_frequency", 1.0)  # 降低频率
```

### PC/主机
```gdscript
var material = preload("res://shaders/pixel_postprocess.tres")
# 或
var material = preload("res://shaders/crt_shader.tres")
```

---

## 📝 更新日志

### 2026-03-17
- ✅ 创建像素后处理 Shader
- ✅ 优化 CRT Shader 适配 Godot 4.x
- ✅ 创建像素完美缩放 Shader
- ✅ 添加预设材质资源
- ✅ 创建测试场景和性能测试脚本
- ✅ 编写完整文档（20,000 字）

---

## 🔗 相关链接

- [Godot Shading Language 文档](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/shading_language.html)
- [Bayer Matrix Dithering](https://en.wikipedia.org/wiki/Ordered_dithering)
- [CRT Shader Tutorial](https://www.shadertoy.com/view/XsjSzR)

---

**索引维护**: pixel-shader-developer
**最后更新**: 2026-03-17
