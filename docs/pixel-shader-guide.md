# 像素 Shader 使用指南

**创建日期**: 2026-03-17
**作者**: pixel-shader-developer
**状态**: 已发布

## 目录
- [概述](#概述)
- [Shader 列表](#shader-列表)
- [使用方法](#使用方法)
- [参数说明](#参数说明)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

## 概述

本项目提供了三个像素风格 Shader，用于实现复古游戏的视觉效果：

1. **像素后处理 Shader** (`pixel_postprocess.gdshader`) - 抖动、色彩限制、扫描线
2. **CRT Shader** (`CRTShader_optimized.gdshader`) - 经典 CRT 显示器效果
3. **像素完美缩放 Shader** (`pixel_perfect.gdshader`) - 保持像素艺术清晰度

所有 Shader 都已针对 Godot 4.x 优化，支持实时调整参数。

---

## Shader 列表

### 1. 像素后处理 Shader

**文件路径**: `res://shaders/pixel_postprocess.gdshader`
**材质资源**: `res://shaders/pixel_postprocess.tres`

**功能特性**:
- ✅ Bayer 抖动（2x2 和 4x4 矩阵）
- ✅ 色彩深度限制（2-8 级）
- ✅ 扫描线效果
- ✅ 可选像素化

**适用场景**:
- 复古像素游戏
- 8-bit/16-bit 风格
- 后处理全屏效果

---

### 2. CRT Shader（优化版）

**文件路径**: `res://shaders/CRTShader_optimized.gdshader`
**材质资源**: `res://shaders/crt_shader.tres`

**功能特性**:
- ✅ 屏幕曲率（Barrel Distortion）
- ✅ 色彩溢出（Color Bleeding）
- ✅ 动态扫描线
- ✅ 暗角效果（Vignette）
- ✅ RGB 分离效果（可选）

**适用场景**:
- 复古街机游戏
- CRT 显示器模拟
- 怀旧视觉风格

---

### 3. 像素完美缩放 Shader

**文件路径**: `res://shaders/pixel_perfect.gdshader`
**材质资源**: `res://shaders/pixel_perfect.tres`

**功能特性**:
- ✅ 像素网格对齐
- ✅ 避免模糊
- ✅ 可调整目标分辨率

**适用场景**:
- 像素艺术游戏
- 低分辨率渲染
- 精确像素控制

---

## 使用方法

### 方法 1: 使用预设材质资源

最简单的方式是直接使用预设的 `.tres` 材质文件：

```gdscript
extends ColorRect

func _ready():
    # 加载预设材质
    var pixel_material = preload("res://shaders/pixel_postprocess.tres")
    self.material = pixel_material
```

### 方法 2: 代码创建材质

动态创建 ShaderMaterial 并设置参数：

```gdscript
extends ColorRect

func _ready():
    # 创建材质
    var material = ShaderMaterial.new()
    material.shader = preload("res://shaders/pixel_postprocess.gdshader")

    # 设置参数
    material.set_shader_parameter("enable_color_limit", true)
    material.set_shader_parameter("color_depth", 5)
    material.set_shader_parameter("enable_dithering", true)
    material.set_shader_parameter("dither_strength", 0.5)

    self.material = material
```

### 方法 3: 全屏后处理

使用 CanvasLayer 实现全屏后处理效果：

```gdscript
extends Node

func _ready():
    # 创建 CanvasLayer
    var canvas_layer = CanvasLayer.new()
    canvas_layer.layer = 100  # 最上层
    add_child(canvas_layer)

    # 创建全屏 ColorRect
    var rect = ColorRect.new()
    rect.set_anchors_preset(Control.PRESET_FULL_RECT)
    rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
    canvas_layer.add_child(rect)

    # 应用 Shader
    var material = ShaderMaterial.new()
    material.shader = preload("res://shaders/pixel_postprocess.gdshader")
    rect.material = material
```

---

## 参数说明

### 像素后处理 Shader 参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enable_color_limit` | bool | true | 启用色彩限制 |
| `color_depth` | int | 5 | 每通道颜色级数 (2-8) |
| `enable_dithering` | bool | true | 启用抖动效果 |
| `dither_strength` | float | 0.5 | 抖动强度 (0.0-1.0) |
| `dither_pattern_size` | int | 4 | 抖动图案大小 (2, 4, 8) |
| `enable_scanlines` | bool | true | 启用扫描线 |
| `scanline_intensity` | float | 0.3 | 扫描线强度 (0.0-1.0) |
| `scanline_frequency` | float | 2.0 | 扫描线频率 |
| `enable_pixelation` | bool | false | 启用像素化 |
| `pixel_size` | vec2 | (4, 4) | 像素块大小 |

**推荐配置**:

```gdscript
# 8-bit 风格
material.set_shader_parameter("color_depth", 4)
material.set_shader_parameter("dither_strength", 0.7)
material.set_shader_parameter("scanline_intensity", 0.4)

# 16-bit 风格
material.set_shader_parameter("color_depth", 6)
material.set_shader_parameter("dither_strength", 0.3)
material.set_shader_parameter("scanline_intensity", 0.2)

# 极简像素风格
material.set_shader_parameter("color_depth", 3)
material.set_shader_parameter("enable_pixelation", true)
material.set_shader_parameter("pixel_size", Vector2(8, 8))
```

---

### CRT Shader 参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `screen_resolution` | vec2 | (1024, 600) | 屏幕分辨率 |
| `enable_curvature` | bool | true | 启用屏幕曲率 |
| `barrel_power` | float | 1.1 | 曲率强度 (1.0-1.5) |
| `vignette_strength` | float | 0.3 | 暗角强度 (0.0-1.0) |
| `enable_color_bleeding` | bool | true | 启用色彩溢出 |
| `color_bleeding` | float | 1.2 | 色彩溢出强度 (0.0-2.0) |
| `bleeding_range` | vec2 | (3, 3) | 溢出范围（像素） |
| `enable_scanlines` | bool | true | 启用扫描线 |
| `lines_distance` | float | 4.0 | 扫描线间距 |
| `scan_size` | float | 2.0 | 扫描线大小 |
| `scanline_alpha` | float | 0.9 | 扫描线透明度 (0.0-1.0) |
| `lines_velocity` | float | 30.0 | 扫描线移动速度 |
| `enable_rgb_split` | bool | false | 启用 RGB 分离 |
| `rgb_split_amount` | float | 2.0 | RGB 分离量（像素） |

**推荐配置**:

```gdscript
# 经典街机风格
material.set_shader_parameter("barrel_power", 1.15)
material.set_shader_parameter("color_bleeding", 1.5)
material.set_shader_parameter("scanline_alpha", 0.85)

# 现代 CRT 风格
material.set_shader_parameter("barrel_power", 1.05)
material.set_shader_parameter("color_bleeding", 1.0)
material.set_shader_parameter("vignette_strength", 0.2)

# 损坏的 CRT 效果
material.set_shader_parameter("enable_rgb_split", true)
material.set_shader_parameter("rgb_split_amount", 3.0)
material.set_shader_parameter("lines_velocity", 50.0)
```

---

### 像素完美缩放 Shader 参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `target_resolution` | vec2 | (320, 180) | 目标像素分辨率 |
| `snap_to_pixel` | bool | true | 对齐到像素网格 |
| `pixel_size` | float | 1.0 | 像素大小倍数 |

**推荐配置**:

```gdscript
# NES 风格 (256x240)
material.set_shader_parameter("target_resolution", Vector2(256, 240))

# Game Boy 风格 (160x144)
material.set_shader_parameter("target_resolution", Vector2(160, 144))

# SNES 风格 (256x224)
material.set_shader_parameter("target_resolution", Vector2(256, 224))
```

---

## 性能优化

### 1. 禁用不需要的效果

每个 Shader 都提供了开关参数，禁用不需要的效果可以提升性能：

```gdscript
# 只使用色彩限制，禁用其他效果
material.set_shader_parameter("enable_dithering", false)
material.set_shader_parameter("enable_scanlines", false)
material.set_shader_parameter("enable_pixelation", false)
```

### 2. 降低抖动图案大小

使用 2x2 抖动矩阵比 4x4 更快：

```gdscript
material.set_shader_parameter("dither_pattern_size", 2)
```

### 3. 减少扫描线频率

降低扫描线频率可以减少计算量：

```gdscript
material.set_shader_parameter("scanline_frequency", 1.0)
```

### 4. 使用预设材质

预设的 `.tres` 材质文件比运行时创建更高效。

### 5. 性能对比

| Shader | 性能影响 | 推荐用途 |
|--------|----------|----------|
| 像素完美缩放 | 极低 | 所有场景 |
| 像素后处理（最小配置） | 低 | 移动设备 |
| 像素后处理（完整配置） | 中 | PC/主机 |
| CRT Shader（无曲率） | 中 | 移动设备 |
| CRT Shader（完整配置） | 高 | PC/主机 |

---

## 常见问题

### Q1: Shader 不生效怎么办？

**A**: 检查以下几点：
1. 确认 Shader 文件路径正确
2. 确认节点类型支持材质（如 ColorRect、Sprite2D）
3. 检查 CanvasLayer 的 layer 值是否正确
4. 确认 `mouse_filter` 设置为 `MOUSE_FILTER_IGNORE`（全屏后处理）

### Q2: CRT Shader 边缘出现黑边？

**A**: 这是屏幕曲率效果的正常现象。可以通过以下方式调整：
```gdscript
# 减小曲率强度
material.set_shader_parameter("barrel_power", 1.05)

# 或者完全禁用曲率
material.set_shader_parameter("enable_curvature", false)
```

### Q3: 像素后处理效果太强怎么办？

**A**: 调整强度参数：
```gdscript
# 减弱抖动
material.set_shader_parameter("dither_strength", 0.2)

# 减弱扫描线
material.set_shader_parameter("scanline_intensity", 0.1)

# 增加色彩深度
material.set_shader_parameter("color_depth", 7)
```

### Q4: 如何实现动态切换效果？

**A**: 使用信号和动画：
```gdscript
func toggle_crt_effect(enabled: bool):
    var tween = create_tween()
    if enabled:
        tween.tween_method(
            func(value): material.set_shader_parameter("barrel_power", value),
            1.0, 1.1, 0.5
        )
    else:
        tween.tween_method(
            func(value): material.set_shader_parameter("barrel_power", value),
            1.1, 1.0, 0.5
        )
```

### Q5: 如何组合多个 Shader？

**A**: 使用多个 CanvasLayer 叠加：
```gdscript
# Layer 1: 像素完美缩放
var layer1 = CanvasLayer.new()
layer1.layer = 98
# ... 添加 pixel_perfect shader

# Layer 2: 像素后处理
var layer2 = CanvasLayer.new()
layer2.layer = 99
# ... 添加 pixel_postprocess shader

# Layer 3: CRT 效果
var layer3 = CanvasLayer.new()
layer3.layer = 100
# ... 添加 CRT shader
```

### Q6: 移动设备性能不足怎么办？

**A**: 使用轻量级配置：
```gdscript
# 最小配置
material.set_shader_parameter("enable_curvature", false)
material.set_shader_parameter("enable_color_bleeding", false)
material.set_shader_parameter("enable_dithering", false)
material.set_shader_parameter("dither_pattern_size", 2)
material.set_shader_parameter("scanline_frequency", 1.0)
```

---

## 测试场景

项目包含一个测试场景，可以快速预览所有效果：

**场景路径**: `res://scene/pixel_shader_test.tscn`

**使用方法**:
1. 在 Godot 编辑器中打开场景
2. 运行场景（F5）
3. 点击按钮切换不同效果：
   - "像素后处理" - 应用像素风格后处理
   - "CRT 效果" - 应用 CRT 显示器效果
   - "无效果" - 移除所有效果

---

## 技术细节

### Bayer 抖动算法

使用 Bayer 矩阵实现有序抖动，避免随机噪点：

```glsl
// 4x4 Bayer 矩阵
const mat4 bayer_matrix_4x4 = mat4(
    vec4(0.0, 8.0, 2.0, 10.0),
    vec4(12.0, 4.0, 14.0, 6.0),
    vec4(3.0, 11.0, 1.0, 9.0),
    vec4(15.0, 7.0, 13.0, 5.0)
) / 16.0;
```

### 色彩量化

使用 floor 函数实现色彩深度限制：

```glsl
vec3 quantize_color(vec3 color, int depth) {
    float levels = float(depth);
    return floor(color * levels + 0.5) / levels;
}
```

### 屏幕曲率

使用极坐标变换实现 Barrel Distortion：

```glsl
vec2 distort(vec2 p) {
    float theta = atan(p.y, p.x);
    float radius = pow(length(p), barrel_power);
    p.x = radius * cos(theta);
    p.y = radius * sin(theta);
    return 0.5 * (p + vec2(1.0));
}
```

---

## 更新日志

### v1.0.0 (2026-03-17)
- ✅ 初始版本发布
- ✅ 实现像素后处理 Shader
- ✅ 优化 CRT Shader 适配 Godot 4.x
- ✅ 实现像素完美缩放 Shader
- ✅ 创建测试场景
- ✅ 编写完整文档

---

## 参考资料

- [Godot Shading Language](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/shading_language.html)
- [Bayer Matrix Dithering](https://en.wikipedia.org/wiki/Ordered_dithering)
- [CRT Shader Tutorial](https://www.shadertoy.com/view/XsjSzR)
- [Pixel Art Scaling](https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms)

---

## 许可证

本 Shader 库遵循项目主许可证。

---

**文档维护**: pixel-shader-developer
**最后更新**: 2026-03-17
