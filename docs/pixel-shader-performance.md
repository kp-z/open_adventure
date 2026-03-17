# 像素 Shader 性能优化指南

## 概述

本文档提供像素 Shader 的性能优化建议，帮助开发者在不同平台上实现最佳性能。

---

## 性能分级

### 🟢 极低性能影响（< 1ms）
- 像素完美缩放 Shader（默认配置）

### 🟡 低性能影响（1-3ms）
- 像素后处理 Shader（最小配置）
- CRT Shader（仅扫描线）

### 🟠 中等性能影响（3-5ms）
- 像素后处理 Shader（完整配置）
- CRT Shader（无曲率）

### 🔴 高性能影响（5-10ms）
- CRT Shader（完整配置 + RGB 分离）
- 多层 Shader 叠加

---

## 平台优化建议

### 移动设备（iOS/Android）

**推荐配置 1: 像素完美缩放**
```gdscript
var material = preload("res://shaders/pixel_perfect.tres")
# 性能影响: 极低
# 视觉效果: 清晰的像素艺术
```

**推荐配置 2: 最小像素后处理**
```gdscript
var material = ShaderMaterial.new()
material.shader = preload("res://shaders/pixel_postprocess.gdshader")
material.set_shader_parameter("enable_color_limit", true)
material.set_shader_parameter("color_depth", 5)
material.set_shader_parameter("enable_dithering", false)  # 禁用
material.set_shader_parameter("enable_scanlines", false)  # 禁用
material.set_shader_parameter("enable_pixelation", false)
# 性能影响: 低
# 视觉效果: 色彩限制
```

**不推荐**:
- ❌ CRT Shader（曲率效果）
- ❌ 4x4 抖动矩阵
- ❌ RGB 分离效果

---

### PC/主机（Windows/macOS/Linux/Console）

**推荐配置 1: 完整像素后处理**
```gdscript
var material = preload("res://shaders/pixel_postprocess.tres")
# 性能影响: 中等
# 视觉效果: 完整的复古像素风格
```

**推荐配置 2: 完整 CRT 效果**
```gdscript
var material = preload("res://shaders/crt_shader.tres")
# 性能影响: 高
# 视觉效果: 经典 CRT 显示器
```

**高端配置: 多层叠加**
```gdscript
# Layer 1: 像素完美缩放
# Layer 2: 像素后处理
# Layer 3: CRT 效果
# 性能影响: 很高（仅推荐高端 PC）
```

---

### Web（HTML5）

**推荐配置: 轻量级像素后处理**
```gdscript
var material = ShaderMaterial.new()
material.shader = preload("res://shaders/pixel_postprocess.gdshader")
material.set_shader_parameter("enable_color_limit", true)
material.set_shader_parameter("color_depth", 5)
material.set_shader_parameter("enable_dithering", true)
material.set_shader_parameter("dither_pattern_size", 2)  # 使用 2x2 矩阵
material.set_shader_parameter("enable_scanlines", true)
material.set_shader_parameter("scanline_frequency", 1.0)  # 降低频率
# 性能影响: 低-中等
# 视觉效果: 平衡的复古风格
```

**注意事项**:
- Web 平台性能差异大，建议提供质量选项
- 避免使用 CRT 曲率效果（计算密集）
- 优先使用 2x2 抖动矩阵

---

## 优化技巧

### 1. 条件编译

使用条件语句减少不必要的计算：

```glsl
void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);

    // 只在启用时计算
    if (enable_dithering) {
        // 抖动计算
    }

    if (enable_scanlines) {
        // 扫描线计算
    }

    COLOR = color;
}
```

### 2. 降低抖动矩阵大小

```gdscript
# 快速（推荐移动设备）
material.set_shader_parameter("dither_pattern_size", 2)

# 慢速（推荐 PC）
material.set_shader_parameter("dither_pattern_size", 4)
```

### 3. 减少扫描线频率

```gdscript
# 高频率（更多扫描线，更慢）
material.set_shader_parameter("scanline_frequency", 4.0)

# 低频率（更少扫描线，更快）
material.set_shader_parameter("scanline_frequency", 1.0)
```

### 4. 禁用不需要的效果

```gdscript
# 只使用色彩限制
material.set_shader_parameter("enable_dithering", false)
material.set_shader_parameter("enable_scanlines", false)
material.set_shader_parameter("enable_pixelation", false)
```

### 5. 使用预设材质

预设材质比运行时创建更高效：

```gdscript
# 快速
var material = preload("res://shaders/pixel_postprocess.tres")

# 慢速
var material = ShaderMaterial.new()
material.shader = preload("res://shaders/pixel_postprocess.gdshader")
# ... 设置参数
```

### 6. 避免频繁更新参数

```gdscript
# 不好：每帧更新
func _process(delta):
    material.set_shader_parameter("dither_strength", sin(Time.get_ticks_msec()))

# 好：只在需要时更新
func update_shader_intensity(value: float):
    material.set_shader_parameter("dither_strength", value)
```

### 7. 使用 LOD（细节层次）

根据距离或性能动态调整效果：

```gdscript
func adjust_shader_quality(quality: int):
    match quality:
        0:  # 低质量
            material.set_shader_parameter("enable_dithering", false)
            material.set_shader_parameter("enable_scanlines", false)
            material.set_shader_parameter("color_depth", 6)
        1:  # 中等质量
            material.set_shader_parameter("enable_dithering", true)
            material.set_shader_parameter("dither_pattern_size", 2)
            material.set_shader_parameter("enable_scanlines", true)
            material.set_shader_parameter("scanline_frequency", 1.0)
            material.set_shader_parameter("color_depth", 5)
        2:  # 高质量
            material.set_shader_parameter("enable_dithering", true)
            material.set_shader_parameter("dither_pattern_size", 4)
            material.set_shader_parameter("enable_scanlines", true)
            material.set_shader_parameter("scanline_frequency", 2.0)
            material.set_shader_parameter("color_depth", 4)
```

---

## 性能测试

### 运行性能测试

```gdscript
# 加载性能测试脚本
var test = preload("res://scene/shader_performance_test.gd").new()
add_child(test)
```

### 监控 FPS

```gdscript
func _process(delta):
    var fps = Engine.get_frames_per_second()
    if fps < 30:
        print("警告: FPS 过低，考虑降低 Shader 质量")
        adjust_shader_quality(0)  # 切换到低质量
```

---

## 常见性能问题

### 问题 1: FPS 突然下降

**原因**: Shader 计算量过大

**解决方案**:
1. 禁用 CRT 曲率效果
2. 使用 2x2 抖动矩阵
3. 降低扫描线频率
4. 禁用 RGB 分离

### 问题 2: 移动设备发热

**原因**: GPU 负载过高

**解决方案**:
1. 使用像素完美缩放 Shader
2. 禁用所有后处理效果
3. 降低目标分辨率

### 问题 3: Web 平台卡顿

**原因**: WebGL 性能限制

**解决方案**:
1. 使用最小配置
2. 提供质量选项让用户选择
3. 检测性能并自动降级

---

## 性能对比表

| Shader 配置 | 移动设备 | Web | PC/主机 | 推荐场景 |
|-------------|----------|-----|---------|----------|
| 像素完美缩放 | ✅ 优秀 | ✅ 优秀 | ✅ 优秀 | 所有平台 |
| 像素后处理（最小） | ✅ 良好 | ✅ 良好 | ✅ 优秀 | 移动/Web |
| 像素后处理（完整） | ⚠️ 一般 | ⚠️ 一般 | ✅ 优秀 | PC/主机 |
| CRT（无曲率） | ⚠️ 一般 | ⚠️ 一般 | ✅ 良好 | PC/主机 |
| CRT（完整） | ❌ 差 | ❌ 差 | ✅ 良好 | 高端 PC |
| 多层叠加 | ❌ 很差 | ❌ 很差 | ⚠️ 一般 | 高端 PC |

---

## 自动质量调整示例

```gdscript
extends Node

var current_quality = 2  # 0=低, 1=中, 2=高
var fps_samples = []
var sample_count = 60

func _ready():
    # 根据平台设置初始质量
    if OS.has_feature("mobile"):
        current_quality = 0
    elif OS.has_feature("web"):
        current_quality = 1
    else:
        current_quality = 2

    apply_quality_settings()

func _process(delta):
    # 收集 FPS 样本
    fps_samples.append(Engine.get_frames_per_second())
    if fps_samples.size() > sample_count:
        fps_samples.pop_front()

    # 每秒检查一次性能
    if Engine.get_frames_drawn() % 60 == 0:
        check_performance()

func check_performance():
    var avg_fps = 0.0
    for fps in fps_samples:
        avg_fps += fps
    avg_fps /= fps_samples.size()

    # 自动调整质量
    if avg_fps < 30 and current_quality > 0:
        current_quality -= 1
        apply_quality_settings()
        print("性能不足，降低质量到: ", current_quality)
    elif avg_fps > 55 and current_quality < 2:
        current_quality += 1
        apply_quality_settings()
        print("性能充足，提升质量到: ", current_quality)

func apply_quality_settings():
    var rect = get_node_or_null("PostProcessLayer/PostProcessRect")
    if not rect or not rect.material:
        return

    match current_quality:
        0:  # 低质量
            rect.material.set_shader_parameter("enable_dithering", false)
            rect.material.set_shader_parameter("enable_scanlines", false)
            rect.material.set_shader_parameter("color_depth", 6)
        1:  # 中等质量
            rect.material.set_shader_parameter("enable_dithering", true)
            rect.material.set_shader_parameter("dither_pattern_size", 2)
            rect.material.set_shader_parameter("enable_scanlines", true)
            rect.material.set_shader_parameter("scanline_frequency", 1.0)
            rect.material.set_shader_parameter("color_depth", 5)
        2:  # 高质量
            rect.material.set_shader_parameter("enable_dithering", true)
            rect.material.set_shader_parameter("dither_pattern_size", 4)
            rect.material.set_shader_parameter("enable_scanlines", true)
            rect.material.set_shader_parameter("scanline_frequency", 2.0)
            rect.material.set_shader_parameter("color_depth", 4)
```

---

## 总结

1. **移动设备**: 使用像素完美缩放或最小像素后处理
2. **Web 平台**: 使用轻量级配置，提供质量选项
3. **PC/主机**: 可以使用完整配置，包括 CRT 效果
4. **优化优先级**: 禁用效果 > 降低矩阵大小 > 减少频率
5. **自动调整**: 监控 FPS 并动态调整质量

---

**文档维护**: pixel-shader-developer
**最后更新**: 2026-03-17
