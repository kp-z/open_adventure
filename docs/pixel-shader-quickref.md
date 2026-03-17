# 像素 Shader 快速参考

## 三个核心 Shader

### 1️⃣ 像素后处理
```gdscript
var mat = preload("res://shaders/pixel_postprocess.tres")
# 抖动 + 色彩限制 + 扫描线
```

### 2️⃣ CRT 效果
```gdscript
var mat = preload("res://shaders/crt_shader.tres")
# 屏幕曲率 + 色彩溢出 + 扫描线
```

### 3️⃣ 像素完美
```gdscript
var mat = preload("res://shaders/pixel_perfect.tres")
# 像素网格对齐，避免模糊
```

---

## 全屏后处理模板

```gdscript
extends Node

func _ready():
    var canvas = CanvasLayer.new()
    canvas.layer = 100
    add_child(canvas)

    var rect = ColorRect.new()
    rect.set_anchors_preset(Control.PRESET_FULL_RECT)
    rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
    canvas.add_child(rect)

    # 应用 Shader
    rect.material = preload("res://shaders/pixel_postprocess.tres")
```

---

## 常用参数速查

### 像素后处理
```gdscript
# 8-bit 风格
mat.set_shader_parameter("color_depth", 4)
mat.set_shader_parameter("dither_strength", 0.7)

# 16-bit 风格
mat.set_shader_parameter("color_depth", 6)
mat.set_shader_parameter("dither_strength", 0.3)
```

### CRT 效果
```gdscript
# 经典街机
mat.set_shader_parameter("barrel_power", 1.15)
mat.set_shader_parameter("color_bleeding", 1.5)

# 现代 CRT
mat.set_shader_parameter("barrel_power", 1.05)
mat.set_shader_parameter("color_bleeding", 1.0)
```

### 像素完美
```gdscript
# NES (256x240)
mat.set_shader_parameter("target_resolution", Vector2(256, 240))

# Game Boy (160x144)
mat.set_shader_parameter("target_resolution", Vector2(160, 144))
```

---

## 性能优化

```gdscript
# 禁用不需要的效果
mat.set_shader_parameter("enable_dithering", false)
mat.set_shader_parameter("enable_scanlines", false)

# 使用小抖动矩阵
mat.set_shader_parameter("dither_pattern_size", 2)

# 降低扫描线频率
mat.set_shader_parameter("scanline_frequency", 1.0)
```

---

## 测试场景

运行 `res://scene/pixel_shader_test.tscn` 查看效果

---

## 完整文档

📖 [docs/pixel-shader-guide.md](../docs/pixel-shader-guide.md)
